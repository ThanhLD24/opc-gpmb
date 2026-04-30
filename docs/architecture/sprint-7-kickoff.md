# Sprint 7 Kickoff

**Date:** 2026-04-30  
**Tech Lead:** TL Agent  
**Input:** `docs/features/sprint-7-brief.md` + user scope expansion (UC-09 + PDF export)  
**Sprint:** 7 — UX + Security + Phân quyền + PDF  
**Status:** ✅ LOCKED — engineers proceed

---

## Sprint Scope (5 Features → 6 Stories)

| Story | Description | Engineer |
|-------|-------------|----------|
| S7-BE-01 | Đổi mật khẩu [SECURITY] + Notifications DB + CRUD | BE |
| S7-BE-02 | GDDH Phê duyệt Inbox endpoint + chi_tra notification triggers | BE |
| S7-BE-03 | UC-09 phân quyền CBCQ + PDF export Kế hoạch tháng | BE |
| S7-FE-01 | Đổi mật khẩu modal + Bell icon notification dropdown | FE |
| S7-FE-02 | /phe-duyet GDDH Inbox page + sidebar badge | FE |
| S7-FE-03 | UC-09 FE adjustments + PDF download button | FE |

**Critical path:** S7-BE-01 → S7-FE-01; S7-BE-02 → S7-FE-02; S7-BE-03 → S7-FE-03

---

## ADR (Architecture Decision Records) — LOCKED

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-S7-01 | PDF library: `reportlab==4.2.5` | Pure Python, no system deps (vs weasyprint's cairo requirement), sufficient for tabular PDF |
| ADR-S7-02 | Notifications: polling 60s (refetchInterval) | No WebSocket complexity; 60s latency acceptable for chi trả approval workflow |
| ADR-S7-03 | UC-09 scope: BE visibility restriction only | No new junction table; CBCQ auto-filtered via `ho_so_gpmb.cbcq_id = current_user.id` in 3 endpoints |
| ADR-S7-04 | GDDH Inbox: new `GET /api/v1/phe-duyet` endpoint | Clean separation from chi_tra nested routes; mirrors global_ho.py pattern |
| ADR-S7-05 | Notifications schema: psql `CREATE TABLE IF NOT EXISTS` | Consistent with ke_hoach (Sprint 5) — no alembic migration risk |
| ADR-S7-06 | Change password: keep session active | PATCH /auth/change-password; do NOT invalidate JWT. User stays logged in. |

---

## S7-BE-01 — Đổi mật khẩu [SECURITY] + Notifications DB + CRUD

**Engineer:** Backend  
**Files:**
- `backend/app/api/v1/auth.py` — add PATCH endpoint
- `backend/app/api/v1/notifications.py` — NEW file
- `backend/app/api/v1/router.py` — register notifications router
- `backend/app/db/models.py` — add Notification model
- `backend/requirements.txt` — no new dep for this story
- DB: psql `CREATE TABLE IF NOT EXISTS notifications`

### Change Password

**Endpoint:** `PATCH /api/v1/auth/change-password`  
**Auth:** Any logged-in user (get_current_user)  
**Body:** `{ "current_password": str, "new_password": str }`

```python
# Logic:
# 1. Verify current_password against user.hashed_password (passlib verify)
# 2. If wrong → HTTPException(400, "Mật khẩu hiện tại không đúng")
# 3. Validate new_password length >= 8 → else 422
# 4. Hash new_password with get_password_hash()
# 5. UPDATE users SET hashed_password = new_hash WHERE id = current_user.id
# 6. Return 200 {"message": "Đổi mật khẩu thành công"}
# [SECURITY] Never log passwords. Use passlib verify — never compare plaintext.
```

### Notification Model

```python
# DB Migration (psql direct):
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    link_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications(user_id, is_read) WHERE is_read = false;

# SQLAlchemy model in models.py:
class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    link_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=datetime.utcnow)
```

### Notification Endpoints (notifications.py)

```python
# GET /api/v1/notifications
# Returns: { unread_count: int, items: [...10 most recent...] }
# Each item: { id, title, body, is_read, link_url, created_at }
# Auth: current_user — only own notifications

# PATCH /api/v1/notifications/{notif_id}/read
# Mark single notification as read (must belong to current_user → 404 if not)
# Returns: 200 {"ok": true}

# PATCH /api/v1/notifications/read-all
# Mark ALL unread notifications as read for current_user
# Returns: 200 {"updated": N}
```

**Acceptance Criteria:**
- AC-1: `PATCH /auth/change-password` with wrong current password → 400
- AC-2: `PATCH /auth/change-password` with correct credentials → 200, password updated in DB
- AC-3: Login with old password after change → 401 (password actually changed)
- AC-4: `GET /notifications` returns `{unread_count, items}` for authenticated user
- AC-5: `PATCH /notifications/{id}/read` marks is_read=true; another user cannot mark it (404)
- AC-6: `PATCH /notifications/read-all` sets all is_read=true for current user

**DoD:** endpoints implemented, tested manually, 0 security issues flagged.

---

## S7-BE-02 — GDDH Inbox + Notification Triggers

**Engineer:** Backend  
**Files:**
- `backend/app/api/v1/phe_duyet.py` — NEW file
- `backend/app/api/v1/router.py` — register phe_duyet router prefix="/phe-duyet"
- `backend/app/api/v1/chi_tra.py` — add notification creation on approve/reject

### GDDH Inbox Endpoint

```python
# GET /api/v1/phe-duyet?tab=cho_phe_duyet|lich_su&page=1&page_size=20
# Auth: require_roles([RoleEnum.gddh, RoleEnum.admin])
# 
# Tab cho_phe_duyet: WHERE chi_tra.trang_thai = 'cho_phe_duyet'
# Tab lich_su: WHERE chi_tra.trang_thai IN ('da_phe_duyet', 'bi_tu_choi', 'da_ban_giao')
#
# JOIN: HoSoChiTra → HoSoGPMB → Ho (for ten_chu_ho) → User (for approver if any)
# Order by: created_at DESC
# 
# Response item:
# {
#   id, ho_so_id, ho_so_code, ho_so_name,
#   ten_chu_ho,          # from Ho JOIN
#   tong_tien,           # sum of 3 amounts
#   trang_thai, trang_thai_label,
#   created_at, updated_at
# }
#
# Full chi_tra detail for modal: GET /api/v1/ho-so/{id}/chi-tra/{ct_id} (existing)
# Approve/Reject from modal: PATCH /api/v1/ho-so/{id}/chi-tra/{ct_id}/approve|reject (existing)
```

**Response shape (paginated):**
```json
{ "total": N, "page": 1, "page_size": 20, "tab": "cho_phe_duyet", "items": [...] }
```

### Notification Triggers in chi_tra.py

Add notification creation after status transitions:
```python
# When chi_tra.trang_thai → cho_phe_duyet (submitted for approval):
#   → notify all users with role=gddh:
#     title: "Chi trả mới chờ phê duyệt"
#     body: f"Hồ sơ {ho_so.code}: {ho.ten_chu_ho} - {tong_tien:,.0f} đ"
#     link_url: f"/phe-duyet"
#
# When chi_tra.trang_thai → da_phe_duyet (approved):
#   → notify the ke_toan who created this chi_tra:
#     title: "Chi trả đã được phê duyệt"
#     body: f"Hồ sơ {ho_so.code}: {ho.ten_chu_ho} - {tong_tien:,.0f} đ"
#     link_url: f"/ho-so-gpmb/{ho_so_id}"
#
# When chi_tra.trang_thai → bi_tu_choi (rejected):
#   → notify the ke_toan:
#     title: "Chi trả bị từ chối"
#     body: f"Hồ sơ {ho_so.code}: {ho.ten_chu_ho} - {tong_tien:,.0f} đ"
#     link_url: f"/ho-so-gpmb/{ho_so_id}"
#
# Helper function: async def create_notification(db, user_id, title, body, link_url)
# Import Notification model from models.py
```

**Acceptance Criteria:**
- AC-1: `GET /phe-duyet?tab=cho_phe_duyet` (GDDH) → list chi trả với status=cho_phe_duyet, cross-hồ-sơ
- AC-2: `GET /phe-duyet?tab=lich_su` → list chi trả đã xử lý (da_phe_duyet + bi_tu_choi + da_ban_giao)
- AC-3: Non-GDDH/admin → 403 Forbidden
- AC-4: Approve chi trả → GDDH users get notification (GET /notifications unread_count tăng)
- AC-5: Submit chi trả → GDDH gets notification; approve/reject → ke_toan gets notification

**DoD:** endpoints implemented, notifications fire correctly on chi_tra status transitions.

---

## S7-BE-03 — UC-09 Phân quyền CBCQ + PDF Export Kế hoạch

**Engineer:** Backend  
**Files:**
- `backend/app/api/v1/global_ho.py` — add CBCQ visibility filter
- `backend/app/api/v1/global_tasks.py` — add CBCQ auto-filter
- `backend/app/api/v1/ho_so.py` — add CBCQ visibility filter on list
- `backend/app/api/v1/ke_hoach.py` — add PDF export endpoint
- `backend/requirements.txt` — add `reportlab==4.2.5`

### UC-09: CBCQ Visibility Restriction

```python
# In global_ho.py — GET /ho:
if current_user.role == RoleEnum.cbcq:
    conditions.append(HoSoGPMB.cbcq_id == current_user.id)
# CBCQ sees only hộ from hồ sơ where they are the assigned CBCQ
# Admin/others: no change (see all)

# In global_tasks.py — GET /tasks:
# Change the 400 guard logic:
is_admin = current_user.role == RoleEnum.admin
is_cbcq = current_user.role == RoleEnum.cbcq
if not is_admin and not is_cbcq and not my_tasks and ho_so_id is None:
    raise HTTPException(400, ...)
# For CBCQ: automatically apply cbcq restriction (similar to my_tasks but scoped to their hồ sơ)
if is_cbcq:
    conditions.append(HoSoGPMB.cbcq_id == current_user.id)
# Note: CBCQ no longer needs ho_so_id filter (auto-scoped); my_tasks still narrows further

# In ho_so.py — GET /ho-so:
if current_user.role == RoleEnum.cbcq:
    q = q.where(HoSoGPMB.cbcq_id == current_user.id)
# CBCQ only sees their assigned hồ sơ in the dropdown / list page
```

### PDF Export Kế hoạch tháng

```python
# New endpoint in ke_hoach.py:
# GET /api/v1/ho-so/{ho_so_id}/ke-hoach/{kh_id}/export/pdf
# Auth: same as Excel export (CBCQ + admin)
# Returns: application/pdf with Content-Disposition: attachment filename=ke-hoach-{thang:02d}-{nam}.pdf

# reportlab approach (simple tabular PDF):
# from reportlab.lib import colors
# from reportlab.lib.pagesizes import A4, landscape
# from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
# from reportlab.lib.styles import getSampleStyleSheet
# from io import BytesIO
#
# Layout:
# - Title: "Kế hoạch chi trả tháng {thang}/{nam}"
# - Subtitle: Hồ sơ {code} — {name}
# - Table: STT | Tên công việc | Tên hộ | Số tiền | Trạng thái | Ghi chú
# - Footer: Da xuất báo cáo: ngày {today}
#
# Return as StreamingResponse(BytesIO(pdf_bytes), media_type="application/pdf")
```

**Acceptance Criteria (UC-09):**
- AC-1: `GET /ho` as CBCQ → only hộ from hồ sơ where cbcq_id = current_user.id (not all 534)
- AC-2: `GET /ho` as admin → all hộ unchanged (no regression)
- AC-3: `GET /ho-so` as CBCQ → only their assigned hồ sơ appear
- AC-4: `GET /tasks` as CBCQ with no ho_so_id → no longer returns 400; auto-scoped to their hồ sơ
- AC-5: `GET /tasks?my_tasks=true` as CBCQ → subset of their auto-scoped tasks

**Acceptance Criteria (PDF):**
- AC-6: `GET .../ke-hoach/{kh_id}/export/pdf` → 200, Content-Type: application/pdf, valid PDF
- AC-7: PDF contains ke_hoach table data matching the Excel export
- AC-8: PDF filename: `ke-hoach-{thang:02d}-{nam}.pdf`

**DoD:** UC-09 filters verified via curl as cbcq user; PDF opens in browser/viewer correctly.

---

## S7-FE-01 — Đổi mật khẩu Modal + Bell Icon Notifications

**Engineer:** Frontend  
**Files:**
- `frontend/src/app/(dashboard)/layout.tsx` — add change-password menu + notification bell query
- `frontend/src/components/ChangePasswordModal.tsx` — NEW component
- `frontend/src/components/NotificationDropdown.tsx` — NEW component

### ChangePasswordModal

```typescript
// Trigger: Avatar click in header → Dropdown with "Đổi mật khẩu" item → opens Modal
// Modal title: "Đổi mật khẩu"
// Form fields (Ant Design Form):
//   - Mật khẩu hiện tại (password input, required)
//   - Mật khẩu mới (password input, required, minLength: 8)
//   - Xác nhận mật khẩu mới (password input, required, validator: === new_password)
// Submit → PATCH /api/v1/auth/change-password { current_password, new_password }
// Success → message.success("Đổi mật khẩu thành công"), close modal, reset form
// Error 400 → show error message from API detail field
```

### NotificationDropdown

```typescript
// Bell icon in header: useQuery({
//   queryKey: ['notifications'],
//   queryFn: () => api.get('/notifications').then(r => r.data),
//   refetchInterval: 60_000,   // poll every 60s
//   refetchIntervalInBackground: false,
// })
//
// Badge count: data?.unread_count ?? 0 (show only if > 0)
// Ant Design Dropdown + Popover with notification list:
//   - Max 10 items, each: title + timeago + read/unread indicator
//   - Click item → navigate to link_url + PATCH /notifications/{id}/read (invalidate query)
//   - "Đánh dấu tất cả đã đọc" button → PATCH /notifications/read-all → invalidate query
//   - Empty state: "Không có thông báo nào"
```

**Acceptance Criteria:**
- AC-1: Avatar click → dropdown menu includes "Đổi mật khẩu" item
- AC-2: Wrong current password → error message "Mật khẩu hiện tại không đúng" shown in form
- AC-3: New password ≠ confirm → FE validation error (no API call made)
- AC-4: Success → toast notification, modal closes, form reset
- AC-5: Bell icon badge shows unread_count (0 when no notifs, badge hidden)
- AC-6: Bell dropdown shows last 10 notifs; click → navigate to link + mark read; badge updates

**DoD:** 0 TypeScript errors, modal and bell functional.

---

## S7-FE-02 — GDDH Phê duyệt Inbox Page

**Engineer:** Frontend  
**Files:**
- `frontend/src/app/(dashboard)/phe-duyet/page.tsx` — NEW page
- `frontend/src/app/(dashboard)/layout.tsx` — add sidebar item "Phê duyệt" + badge (gddh + admin only)

### /phe-duyet Page

```typescript
// Route: /phe-duyet
// Role guard: only render for gddh + admin; others → redirect /dashboard
//
// Title: "Phê duyệt Chi trả"
// Sidebar item: CheckCircleOutlined icon, "Phê duyệt", badge = count of cho_phe_duyet items
//   (load badge count on initial page render via GET /phe-duyet?tab=cho_phe_duyet&page_size=1 → total)
//
// Tabs:
//   Tab 1 "Chờ duyệt" (default): GET /phe-duyet?tab=cho_phe_duyet
//     Table columns: STT | Hồ sơ (code + name) | Tên hộ | Tổng tiền | Ngày tạo
//     Click row → open ChiTraDetailModal (existing chi_tra detail endpoint)
//     Modal has: Phê duyệt button (green) + Từ chối button (red, requires lý do input)
//     After approve/reject: invalidate both tabs' queries + invalidate notifications query
//
//   Tab 2 "Lịch sử": GET /phe-duyet?tab=lich_su
//     Table columns: STT | Hồ sơ | Tên hộ | Tổng tiền | Trạng thái (Tag) | Ngày cập nhật
//     No action buttons
//
// Pagination: 20/page, showTotal
// Currency format: Intl.NumberFormat('vi-VN') or formatCurrency util
```

**Acceptance Criteria:**
- AC-1: `/phe-duyet` only visible/accessible to GDDH and Admin; cbcq/ke_toan → redirect
- AC-2: Sidebar "Phê duyệt" item visible only for gddh + admin
- AC-3: Tab 1 shows chi trả with status "chờ phê duyệt", paginated
- AC-4: Click row → modal with chi trả details + Phê duyệt / Từ chối buttons
- AC-5: Phê duyệt → list refreshes (approved item disappears from Tab 1, appears in Tab 2)
- AC-6: Từ chối → same refresh behavior; Tab 2 shows bi_tu_choi with correct tag color
- AC-7: Tab 1 empty → Empty "Không có chi trả nào chờ phê duyệt"

**DoD:** 0 TypeScript errors, GDDH workflow end-to-end functional.

---

## S7-FE-03 — UC-09 FE Adjustments + PDF Download

**Engineer:** Frontend  
**Files:**
- `frontend/src/app/(dashboard)/ho-dan/page.tsx` — hide CBCQ filter for cbcq role
- `frontend/src/app/(dashboard)/cong-viec/page.tsx` — remove 400 guard for cbcq role
- `frontend/src/app/(dashboard)/ho-so-gpmb/[id]/page.tsx` — add PDF download button on ke-hoach tab

### UC-09 FE Adjustments

```typescript
// ho-dan/page.tsx:
// Get current user role: const user = getCurrentUser()
// Conditionally render CBCQ filter:
//   {user?.role !== 'cbcq' && <Select placeholder="Tất cả CBCQ" ... />}
// For CBCQ role: CBCQ filter is hidden (BE auto-filters their data)
//
// cong-viec/page.tsx — TatCaCongViecTab:
// Change: enabled: !!hoSoId
// To: enabled: !!hoSoId || user?.role === 'cbcq'
// CBCQ can see their tasks without selecting a hồ sơ (BE auto-scopes)
// Show filter select but make it optional for cbcq
```

### PDF Download Button

```typescript
// In hồ sơ detail page, Kế hoạch tab, next to "Xuất Excel" button:
// <Button onClick={handleExportPDF} icon={<FilePdfOutlined />}>Xuất PDF</Button>
//
// handleExportPDF = async () => {
//   const url = `/ho-so/${hoSoId}/ke-hoach/${khId}/export/pdf`
//   const response = await api.get(url, { responseType: 'blob' })
//   const blob = new Blob([response.data], { type: 'application/pdf' })
//   const link = document.createElement('a')
//   link.href = URL.createObjectURL(blob)
//   link.download = `ke-hoach-${thang}-${nam}.pdf`
//   link.click()
//   URL.revokeObjectURL(link.href)
// }
// Loading state during download; error toast on failure
```

**Acceptance Criteria:**
- AC-1: `/ho-dan` as CBCQ → CBCQ filter dropdown not rendered; page shows only their hộ (auto-filtered)
- AC-2: `/ho-dan` as admin → CBCQ filter still present (unchanged)
- AC-3: `/cong-viec` Tab 1 as CBCQ → table loads automatically without selecting hồ sơ
- AC-4: "Xuất PDF" button appears on Kế hoạch tab (all roles with access)
- AC-5: Click "Xuất PDF" → browser downloads `ke-hoach-MM-YYYY.pdf` file, file is valid PDF
- AC-6: PDF contains tabular data matching the Kế hoạch (same data as Excel export)

**DoD:** 0 TypeScript errors, CBCQ role behaves correctly, PDF downloads successfully.

---

## DB Migrations Required

| Migration | Type | Story |
|-----------|------|-------|
| `notifications` table | `CREATE TABLE IF NOT EXISTS` (psql direct) | S7-BE-01 |
| No other schema changes | — | — |

**`notifications` DDL:**
```sql
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    link_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS ix_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
```

Run via: `docker exec -i <postgres_container> psql -U <user> -d opc_gpmb`

---

## New Dependencies

| Package | Version | Story | Install |
|---------|---------|-------|---------|
| `reportlab` | 4.2.5 | S7-BE-03 | `pip install reportlab==4.2.5` + add to `requirements.txt` |

**Security audit:** reportlab is BSD-licensed, well-maintained (since 1998), no known critical CVEs. ✅

---

## Role-Permission Matrix (Sprint 7 impact)

| Feature | Admin | GDDH | CBCQ | Ke_toan |
|---------|-------|------|------|---------|
| Đổi mật khẩu | ✅ | ✅ | ✅ | ✅ |
| Phê duyệt Inbox `/phe-duyet` | ✅ | ✅ | ❌ | ❌ |
| Receive notifications | ✅ all | ✅ (chi trả submitted) | ✅ (own events) | ✅ (approve/reject) |
| UC-09 auto-filter | ❌ (sees all) | ❌ (sees all) | ✅ (own hồ sơ only) | ❌ (sees all) |
| PDF export Kế hoạch | ✅ | ✅ | ✅ | ✅ |

---

## Quality Gates

- [ ] TypeScript 0 errors (`npx tsc --noEmit`)
- [ ] `PATCH /auth/change-password` — password actually changes in DB
- [ ] `[SECURITY]` No password logged, bcrypt used, new password not returned in response
- [ ] `GET /notifications` returns only current user's notifications (no cross-user leakage)
- [ ] `GET /phe-duyet` returns 403 for cbcq/ke_toan roles
- [ ] UC-09: CBCQ `GET /ho` count < admin count (auto-filtered)
- [ ] PDF opens in viewer, not corrupted, contains correct data
- [ ] Notifications fire on chi_tra status transitions (verified in testing)
- [ ] Bell icon polling doesn't fire API in background when tab is not focused

---

## Rollback Plan

| Story | Risk | Rollback |
|-------|------|---------|
| S7-BE-01 change-password | Low — new endpoint only | Delete endpoint, no DB impact |
| S7-BE-01 notifications | Low — additive table | DROP TABLE notifications (data-loss acceptable) |
| S7-BE-02 phe-duyet endpoint | Low — new file, no existing code modified except chi_tra triggers | Remove notification trigger code from chi_tra.py |
| S7-BE-03 UC-09 CBCQ filter | Medium — modifies existing endpoints | Revert the 3 if-cbcq blocks in global_ho, global_tasks, ho_so |
| S7-BE-03 PDF | Low — new endpoint only | Remove PDF endpoint from ke_hoach.py |
| S7-FE-* | Low — new pages/components | Revert layout.tsx, remove new pages |
