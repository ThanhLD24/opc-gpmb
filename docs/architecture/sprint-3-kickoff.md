# Sprint 3 Kickoff — OPC GPMB

**Date:** 2026-04-29  
**Tech Lead:** BMAD TL Agent  
**Sprint goal:** Báo cáo chi trả + Dashboard tổng quan + Tái gửi chi trả bị từ chối + Audit log  
**Deadline:** 2026-05-02 (~3 ngày)  
**Based on:** Sprint 2 TQE sign-off (Entry 003 handoff log) + PRD §6 backlog

---

## Sprint 3 — Scope

### Lý do chọn stories này

Sprint 1 hoàn thành MVP core (22 UC). Sprint 2 hoàn thiện CRUD + Import/Export. Sprint 3 tập trung vào **giá trị báo cáo** cho demo khách hàng (deadline 2026-05-02):

1. **Báo cáo chi trả** (UC-07-01): Điểm demo quan trọng — GĐĐH/BLĐ cần xem tổng hợp chi trả
2. **Dashboard tổng quan** (UC-08-01 subset): Màn hình landing sau login — ấn tượng đầu tiên
3. **Sửa chi trả bị từ chối** (UC-06-07): Hoàn thiện state machine chi trả (Sprint 1 bỏ qua)
4. **Audit log chi trả** (S3-04): Truy vết hành động — tăng tin cậy cho demo

UC-05 (Kế hoạch tháng) bị hoãn: quá nhiều open questions (KH-01, KH-02, KH-04 chưa rõ).

### Stories

| ID | Title | UC | BE | FE | Độ phức tạp |
|----|-------|----|----|-----|------------|
| S3-01 | Báo cáo chi trả BTHTTĐC | UC-07-01 | S3-BE-01 | S3-FE-01 | M |
| S3-02 | Sửa & tái gửi chi trả bị từ chối | UC-06-07 | S3-BE-02 | S3-FE-02 | S |
| S3-03 | Dashboard tổng quan | UC-08-01 | S3-BE-03 | S3-FE-03 | M |
| S3-04 | Audit log chi trả | N/A | S3-BE-04 | S3-FE-04 | S |

**Total:** 4 stories, ~8 tasks (4 BE + 4 FE)

---

## ADRs (locked for Sprint 3)

| # | Decision | Rationale |
|---|----------|-----------|
| ADR-S3-01 | Báo cáo chi trả là read-only API query trực tiếp `ho_so_chi_tra` — không tạo bảng mới | Report đơn giản, dữ liệu đã có; bảng mới là overkill cho MVP |
| ADR-S3-02 | Chỉ allow PATCH chi trả khi `status = bi_tu_choi` — block các trạng thái khác với 409 | Tránh edit chi trả đã duyệt (MVP: 1 chiều); kế toán chỉ sửa khi bị từ chối |
| ADR-S3-03 | Dashboard stats: DB aggregation trực tiếp, không dùng materialized view / cache | MVP scope, số lượng hồ sơ nhỏ; cache thêm complexity không cần thiết |
| ADR-S3-04 | Audit log: append-only table `audit_log`, không có DELETE/UPDATE | Truy vết phải immutable; đơn giản, không cần event sourcing |

---

## Backend Stories

### S3-BE-01 — Báo cáo chi trả BTHTTĐC (UC-07-01)

**Endpoints:**  
- `GET /api/v1/reports/chi-tra` — list + tổng hợp  
- `GET /api/v1/reports/chi-tra/export-excel` — download xlsx  

**Auth:** Tất cả roles (all authenticated users)

**Query params:** `ho_so_id?`, `ho_id?`, `tu_ngay?` (YYYY-MM-DD), `den_ngay?`, `status?`, `page`, `page_size`

**Response shape (list):**
```json
{
  "items": [
    {
      "ma_hsct": "HSCT-001",
      "ho_so": { "id": "...", "code": "HS-202504-001", "name": "CCN Hữu Bằng" },
      "ho": { "id": "...", "ma_ho": "HB001", "ten_chu_ho": "..." },
      "so_tien_bt": 100000000,
      "so_tien_ht": 20000000,
      "so_tien_tdc": 30000000,
      "tong_de_nghi": 150000000,
      "status": "da_phe_duyet",
      "approved_at": "2026-04-29T10:00:00",
      "ngay_ban_giao_mat_bang": null
    }
  ],
  "total": 1,
  "tong_da_chi_tra": 150000000,
  "tong_dang_cho_duyet": 0
}
```

**Export xlsx columns:** `Mã HSCT | Mã hồ sơ | Tên công trình | Mã hộ | Tên chủ hộ | BT (đồng) | HT (đồng) | TĐC (đồng) | Tổng đề nghị | Trạng thái | Ngày phê duyệt | Ngày bàn giao`

**Acceptance Criteria:**
- [ ] `GET /reports/chi-tra` trả đúng items + tổng hợp (`tong_da_chi_tra`, `tong_dang_cho_duyet`)
- [ ] Các filter hoạt động độc lập (có thể kết hợp)
- [ ] `GET /reports/chi-tra/export-excel` trả file `.xlsx` với đúng columns, bold header
- [ ] Tất cả roles đều xem được (chỉ cần authenticated)
- [ ] Pagination: `page` / `page_size` chuẩn

**DoD:** Unit test với 3 filter combo, export test kiểm tra bytes hợp lệ, no secrets.

---

### S3-BE-02 — Sửa & tái gửi chi trả bị từ chối (UC-06-07)

**Endpoints:**
- `PATCH /api/v1/ho-so/{ho_so_id}/chi-tra/{ct_id}` — chỉnh sửa chi trả  
- `POST /api/v1/ho-so/{ho_so_id}/chi-tra/{ct_id}/tai-gui` — gửi lại duyệt

**Auth:** Kế toán hoặc Admin  
**Điều kiện:** Chỉ cho phép khi `status = bi_tu_choi`

**PATCH body:** `{ so_tien_bt?, so_tien_ht?, so_tien_tdc?, noi_dung?, ghi_chu? }` (tất cả optional)  
**Logic:** Tự động recalculate `tong_de_nghi = so_tien_bt + so_tien_ht + so_tien_tdc`

**tai-gui logic:** set `status = cho_phe_duyet`, clear `ly_do_tu_choi`, ghi audit log

**Acceptance Criteria:**
- [ ] PATCH trả 200 + updated object; recalculate `tong_de_nghi` đúng
- [ ] PATCH trả 409 nếu `status != bi_tu_choi`
- [ ] `tai-gui` trả 200 + object với `status = cho_phe_duyet`
- [ ] `tai-gui` trả 409 nếu `status != bi_tu_choi`
- [ ] Trả 403 nếu role là `gddh` (chỉ kế toán/admin mới sửa được)
- [ ] Ghi audit log action="tai_gui" khi tái gửi (xem S3-BE-04)

**DoD:** Unit test happy path + 409 cases, no secrets.

---

### S3-BE-03 — Dashboard tổng quan (UC-08-01 subset)

**Endpoint:** `GET /api/v1/dashboard/stats`  
**Auth:** Tất cả roles

**Response:**
```json
{
  "ho_so": {
    "total": 5,
    "by_status": {
      "chuan_bi": 1,
      "thuc_hien": 3,
      "hoan_thanh": 1
    }
  },
  "ho": {
    "total": 453,
    "by_status": {
      "moi": 10,
      "dang_xu_ly": 200,
      "da_thong_nhat": 100,
      "da_chi_tra": 100,
      "da_ban_giao": 43
    }
  },
  "chi_tra": {
    "total_records": 300,
    "tong_da_phe_duyet": 15000000000,
    "tong_cho_duyet": 2000000000,
    "by_status": {
      "da_tao": 20,
      "cho_phe_duyet": 30,
      "da_phe_duyet": 200,
      "bi_tu_choi": 10,
      "da_ban_giao": 40
    }
  },
  "recent_ho_so": [
    { "id": "...", "code": "...", "name": "...", "status": "...", "created_at": "..." }
  ]
}
```

**Acceptance Criteria:**
- [ ] Endpoint trả đúng các con số aggregate
- [ ] `ho_so.by_status` đếm đúng, không đếm deleted (deleted_at IS NULL)
- [ ] `chi_tra.tong_da_phe_duyet` chỉ tính records `status = da_phe_duyet` hoặc `da_ban_giao`
- [ ] `recent_ho_so`: 5 hồ sơ gần nhất (order by created_at DESC), không include deleted
- [ ] Response time < 500ms với dataset demo (453 hộ)

**DoD:** Integration test với seed data, no secrets.

---

### S3-BE-04 — Audit log chi trả cơ bản

**DB migration:**
```sql
-- Migration: 003_sprint3_audit_log.sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,   -- 'chi_tra'
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,        -- 'tao', 'gui_duyet', 'phe_duyet', 'tu_choi', 'tai_gui', 'ban_giao'
  actor_id UUID REFERENCES "user"(id),
  actor_name VARCHAR(200),
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
```

**Endpoint:** `GET /api/v1/ho-so/{ho_so_id}/chi-tra/{ct_id}/audit`  
**Auth:** Tất cả roles

**Response:** `[{ id, action, actor_name, note, created_at }]` (sorted DESC)

**Actions to log (append to existing flows in chi_tra.py):**
- `tao` — khi tạo hồ sơ chi trả
- `gui_duyet` — khi gửi duyệt
- `phe_duyet` — khi phê duyệt (ghi thêm note: ly_do nếu có)
- `tu_choi` — khi từ chối (ghi note: ly_do_tu_choi)
- `tai_gui` — khi tái gửi sau từ chối
- `ban_giao` — khi cập nhật ngày bàn giao mặt bằng

**Acceptance Criteria:**
- [ ] Table `audit_log` tạo thành công
- [ ] Mỗi action trên chi trả tự động ghi log (hook vào existing chi_tra.py endpoints)
- [ ] `GET /audit` trả log đúng thứ tự DESC
- [ ] Không có endpoint DELETE hay UPDATE trên audit_log (append-only)
- [ ] actor_name lấy từ current_user.full_name tại thời điểm action

**DoD:** Migration chạy thành công, integration test tạo chi trả → kiểm tra log, no secrets.

---

## Frontend Stories

### S3-FE-01 — Trang Báo cáo chi trả

**Route mới:** `/bao-cao` (thêm vào sidebar cho tất cả roles)  
**Page:** `src/app/(dashboard)/bao-cao/page.tsx`

**Acceptance Criteria:**
- [ ] Sidebar menu có "Báo cáo" icon, visible cho tất cả roles
- [ ] Filter bar: Select hồ sơ GPMB, Select trạng thái, DatePicker khoảng thời gian
- [ ] Bảng: Mã HSCT | Hồ sơ | Hộ/Tên chủ hộ | BT | HT | TĐC | Tổng đề nghị | Trạng thái | Ngày phê duyệt
- [ ] Footer summary row: Tổng đã phê duyệt (highlight xanh), Tổng đang chờ
- [ ] Nút "Xuất Excel" → `GET /reports/chi-tra/export-excel` → blob download
- [ ] Loading state, pagination chuẩn
- [ ] Format tiền: `toLocaleString('vi-VN')` với hậu tố "đ"

**DoD:** Page renders, filter + API gọi đúng, export hoạt động, 0 TypeScript errors.

---

### S3-FE-02 — Sửa & tái gửi chi trả bị từ chối

**Vị trí:** Tab "Chi trả" trong `/ho-so-gpmb/[id]`, phần chi tiết hồ sơ chi trả

**Acceptance Criteria:**
- [ ] Khi `status = bi_tu_choi`: hiện nút "Sửa" (edit icon) + "Tái gửi duyệt" (send icon)
- [ ] "Sửa" → inline form hoặc modal với các trường: so_tien_bt, so_tien_ht, so_tien_tdc, noi_dung, ghi_chu
- [ ] `tong_de_nghi` auto-calculate khi input thay đổi
- [ ] Save → `PATCH /ho-so/{id}/chi-tra/{ct_id}` → refresh data
- [ ] "Tái gửi" → Popconfirm → `POST .../tai-gui` → refresh status chip → nút ẩn đi
- [ ] Hiển thị `ly_do_tu_choi` rõ ràng trong UI (Tag đỏ + text)
- [ ] Roles: Chỉ kế toán / admin thấy nút Sửa + Tái gửi

**DoD:** 0 TypeScript errors, flow hoạt động end-to-end.

---

### S3-FE-03 — Dashboard tổng quan

**Route mới:** `/` (home redirect) hoặc `/dashboard`  
**Page:** `src/app/(dashboard)/dashboard/page.tsx`  
**Sidebar:** Thêm menu item "Tổng quan" (dashboard icon, đặt đầu tiên, visible tất cả roles)

**Layout:**
```
Row 1: [Total Hồ sơ] [Hộ đã bàn giao] [Tổng chi trả đã duyệt] [Hộ chờ xử lý]
Row 2: [Hộ theo trạng thái — Ant Design Progress hoặc Table]
Row 3: [5 Hồ sơ gần nhất — mini table với link]
```

**Acceptance Criteria:**
- [ ] 4 Statistic cards (Ant Design `<Statistic>`) với icon
- [ ] Hộ theo trạng thái: thanh progress bar màu sắc theo từng trạng thái
- [ ] Tổng chi trả định dạng `X tỷ` hoặc `X triệu đ`
- [ ] Bảng "Hồ sơ gần nhất": code | name | status (Tag) | ngày tạo | link chi tiết
- [ ] Refresh tự động khi navigate về trang (staleTime: 0)

**DoD:** Page renders với data thật, 0 TypeScript errors.

---

### S3-FE-04 — Audit log chi trả (Timeline)

**Vị trí:** Tab "Chi trả" trong `/ho-so-gpmb/[id]`, bên dưới thông tin chi trả  
**Component:** Timeline (Ant Design `<Timeline>`) trong chi tiết hồ sơ chi trả

**Acceptance Criteria:**
- [ ] Sau khi chọn/expand một hồ sơ chi trả, phần dưới có "Lịch sử thao tác"
- [ ] `GET /ho-so/{id}/chi-tra/{ct_id}/audit` → render Timeline items
- [ ] Mỗi item: `[action_label] bởi [actor_name] — [thời gian]` + note nếu có
- [ ] Action labels tiếng Việt: tao→"Tạo hồ sơ", gui_duyet→"Gửi duyệt", phe_duyet→"Phê duyệt", tu_choi→"Từ chối", tai_gui→"Tái gửi", ban_giao→"Bàn giao mặt bằng"
- [ ] Hiển thị note từ chối (ly_do) dạng blockquote màu đỏ nhạt
- [ ] Loading state, empty state: "Chưa có lịch sử"

**DoD:** Timeline renders đúng data, 0 TypeScript errors.

---

## Dependencies & Sequencing

```
S3-BE-04 (audit table) ──► S3-BE-02 (tai-gui ghi log)
S3-BE-04 (audit table) ──► S3-BE-01 (export ghi log nếu cần)

S3-BE-01 ──► S3-FE-01  (báo cáo)
S3-BE-02 ──► S3-FE-02  (sửa + tái gửi)
S3-BE-03 ──► S3-FE-03  (dashboard)
S3-BE-04 ──► S3-FE-04  (audit timeline)
```

**Critical path BE:**  
S3-BE-04 (migration) → S3-BE-02 (tai-gui + hook log vào chi_tra.py) → S3-BE-01 → S3-BE-03

---

## DB Migrations Required

```sql
-- Migration: 003_sprint3_audit_log.sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  actor_id UUID REFERENCES "user"(id),
  actor_name VARCHAR(200),
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
```

**Áp dụng ngay** (không dùng Alembic — sử dụng Python startup migration hoặc chạy tay qua asyncpg như Sprint 2):
```python
await db.execute(text("""
  CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES "user"(id),
    actor_name VARCHAR(200),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )
"""))
await db.execute(text("CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id)"))
await db.commit()
```

---

## New Route Structure

```
/dashboard          → Dashboard tổng quan (đặt landing sau login)
/bao-cao            → Báo cáo chi trả BTHTTĐC
/ho-so-gpmb         → (đã có)
/quy-trinh          → (đã có)
```

**Sidebar update (dashboard layout.tsx):**
```
[chart] Tổng quan       ← mới (đầu tiên)
[file]  Hồ sơ GPMB     ← đã có
[apt]   Quy trình GPMB  ← đã có (Admin only)
[bar]   Báo cáo         ← mới (tất cả roles)
```

---

## Rollback Plan

| Story | Rollback |
|-------|---------|
| S3-BE-01 (báo cáo) | Revert endpoints — no DB change |
| S3-BE-02 (tai-gui) | Revert endpoints — no DB change |
| S3-BE-03 (dashboard) | Revert endpoints — no DB change |
| S3-BE-04 (audit log) | `DROP TABLE IF EXISTS audit_log` — data loss acceptable (log data) |
| FE stories | Revert page/component files — no data loss |

---

## Out of Sprint 3 (deferred)

| Item | Sprint |
|------|--------|
| Kế hoạch tháng (UC-05-*) | Sprint 4 — cần làm rõ KH-01/02/04 trước |
| Dashboard biểu đồ (Bar chart, Gantt) | Sprint 4 |
| Refresh chi trả đã duyệt | Sprint 4 — business rules cần xác nhận |
| In-app notification | Sprint 5 |
| Phân quyền per-project | Sprint 5 |
| Export báo cáo PDF | Sprint 4 |
| Đổi mật khẩu | Sprint 5 |

---

## Engineer Assignments

| Role | Stories |
|------|---------|
| **Backend Engineer** | S3-BE-04 `[CRITICAL PATH]` → S3-BE-02 → S3-BE-01 → S3-BE-03 |
| **Frontend Engineer** | S3-FE-03 (dashboard, độc lập) → S3-FE-01 → S3-FE-02 → S3-FE-04 |

> **BE phải làm S3-BE-04 (migration) TRƯỚC** vì S3-BE-02 cần ghi audit log.  
> **FE có thể bắt đầu S3-FE-03 (dashboard)** ngay vì chỉ cần 1 API endpoint đơn giản.

---

## Definition of Done (Sprint 3)

- [ ] Code complete — tất cả AC trong story passed
- [ ] No TypeScript errors (`npx tsc --noEmit` = 0 errors)
- [ ] BE: mỗi endpoint có ít nhất 1 unit test (happy path + 1 error case)
- [ ] DB migration chạy thành công (audit_log table tồn tại)
- [ ] FE: component/page renders với data thật từ API
- [ ] No hardcoded credentials hoặc secrets
- [ ] No debug prints / console.log left in production paths
- [ ] TQE: smoke test E2E cho mỗi story

---

## Technical Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Audit log gây N+1 query (log mỗi action trong loop) | Low | Medium | Log async nếu cần; hiện tại volume nhỏ |
| Dashboard stats query chậm với nhiều hồ sơ | Low | Low | Demo data nhỏ; index đã có; thêm EXPLAIN nếu cần |
| tai-gui race condition (2 actor cùng submit) | Low | Low | Idempotent — check status trước khi set |
| Audit table không có FE-visible data ngay lập tức | Medium | Low | FE-04 có thể implement sau khi BE-04 xong |

---

*Tech Lead sign-off: Sprint 3 scope locked. BE + FE proceed independently from this document.*
