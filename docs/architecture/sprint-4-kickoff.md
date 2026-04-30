# Sprint 4 Kickoff — OPC GPMB

**Date:** 2026-04-30
**Tech Lead:** BMAD TL Agent
**Sprint goal:** Hoàn thiện state machine GPMB (UC-06 bàn giao) + biểu đồ dashboard + demo data enrichment để sẵn sàng demo khách hàng
**Deadline:** 2026-05-02 (~2 ngày)
**Based on:** Sprint 3 TQE sign-off (Entry 005 handoff log) + sprint-3-results.md backlog đề xuất

---

## Sprint 4 — Scope

### Lý do chọn stories này

Sprint 3 đã đóng các tính năng báo cáo + dashboard + audit + sửa/tái gửi chi trả. Sprint 4 (Sprint cuối trước demo May 2) tập trung vào **3 mục tiêu**:

1. **Đóng state machine GPMB** (UC-06): Bàn giao mặt bằng — bước cuối cùng của workflow chi trả → hộ. Without this, demo flow không close loop.
2. **Tăng giá trị visualisation** cho Dashboard: thêm Bar chart chi trả theo tháng + Pie chart hộ status — landing page sau login phải "wow" được khách hàng.
3. **Enrich demo data**: hiện tại chỉ có 1 hồ sơ + 1 chi trả → demo trông trống. Cần seed thêm để báo cáo + dashboard có data nhìn rõ.

### Defer khỏi Sprint 4

| Item | Lý do |
|------|-------|
| UC-05 Kế hoạch chi trả tháng | 4 open questions KH-01..04 chưa được PO trả lời. Defer sang Sprint 5. |
| Email/SMS notification | Không cần cho demo on-prem. Defer sang Sprint 5. |
| Per-project CBCQ permission | Không phải critical demo path. Defer sang Sprint 5. |
| Export báo cáo PDF | Excel đã đủ cho demo. Defer sang Sprint 5. |

### Stories

| ID | Title | UC | BE | FE | Độ phức tạp |
|----|-------|----|----|-----|------------|
| S4-01 | Bàn giao mặt bằng (đóng state machine) | UC-06 | S4-BE-01 | S4-FE-01 | M |
| S4-02 | Dashboard biểu đồ (Bar + Pie) | UC-08-02 | — | S4-FE-02 | S |
| S4-03 | Demo data enrichment | N/A | S4-BE-02 | — | S |

**Total:** 3 stories, ~5 tasks (3 BE + 2 FE)

---

## ADRs (locked for Sprint 4)

| # | Decision | Rationale |
|---|----------|-----------|
| ADR-S4-01 | Bàn giao mặt bằng = action 1 chiều: chi trả `da_phe_duyet` → `da_ban_giao` đồng thời set `ho.status = da_ban_giao`. Không revert. | State machine GPMB phải đơn giản cho MVP; revert tạo phức tạp về kế toán. |
| ADR-S4-02 | Bàn giao yêu cầu input `ngay_ban_giao` (DatePicker, default = today). Không cho phép back-date quá 30 ngày, không cho phép future date. | Tránh nhập sai ngày; phù hợp pháp lý chi trả + bàn giao. |
| ADR-S4-03 | Dashboard biểu đồ dùng `recharts` (đã trong dependency hoặc thêm mới) — không dùng AntV/G2 vì bundle size lớn. | recharts đơn giản, đủ cho 2 chart loại Bar + Pie; bundle nhỏ. |
| ADR-S4-04 | Demo data seed dùng script Python idempotent — chạy nhiều lần không nhân đôi data. Skip nếu mã đã tồn tại. | Tránh tạo duplicate khi chạy lại; an toàn cho dev/staging. |

---

## Backend Stories

### S4-BE-01 — Bàn giao mặt bằng (UC-06)

**Endpoint:** `POST /api/v1/ho-so/{ho_so_id}/chi-tra/{ct_id}/ban-giao`
**Auth:** CBCQ hoặc Admin (kế toán không có quyền bàn giao)
**Điều kiện:** Chỉ cho phép khi `chi_tra.status = da_phe_duyet`

**Request body:**
```json
{
  "ngay_ban_giao": "2026-04-30",
  "ghi_chu": "Bàn giao mặt bằng tại hiện trường — hộ ký nhận"
}
```

**Logic transaction:**
1. Validate `chi_tra.status = da_phe_duyet` → else 409
2. Validate `ngay_ban_giao` không sau hôm nay, không quá 30 ngày trước → else 422
3. Set `chi_tra.status = da_ban_giao`, `chi_tra.ngay_ban_giao_mat_bang = ngay_ban_giao`, `chi_tra.ghi_chu = ghi_chu`
4. Set `ho.status = da_ban_giao` (cùng transaction)
5. Ghi audit log: `action = "ban_giao"`, `note = ghi_chu`
6. Commit, trả 200 + updated chi_tra object

**Acceptance Criteria:**
- [ ] POST `/ban-giao` trả 200 với `chi_tra.status = da_ban_giao` khi đầu vào hợp lệ
- [ ] Trả 409 khi `chi_tra.status != da_phe_duyet`
- [ ] Trả 422 khi `ngay_ban_giao` vượt khoảng [today - 30, today]
- [ ] Trả 403 khi role là `ke_toan` hoặc `gddh`
- [ ] Sau call thành công: `ho.status = da_ban_giao` (verify qua GET `/ho/{id}`)
- [ ] Audit log có entry `action=ban_giao` với `note` từ request

**DoD:** Unit test happy path + 3 error cases (409, 422, 403), no secrets, transaction rollback nếu update `ho` fail.

---

### S4-BE-02 — Demo data enrichment script

**File:** `backend/scripts/seed_demo_data.py` (idempotent, chạy được nhiều lần)

**Mục đích:** Tạo data đa dạng cho demo May 2 — đảm bảo Dashboard, Báo cáo và Bàn giao đều có data nhìn rõ.

**Yêu cầu sinh data:**
- 2 hồ sơ GPMB MỚI (ngoài hồ sơ HS-202504-001 hiện có) với `ma_ho_so` `HS-202504-002`, `HS-202504-003`. Mỗi hồ sơ ~30-50 hộ.
- Trên hồ sơ HS-202504-001: tạo thêm ~10 chi trả với status đa dạng:
  - 3 records `da_phe_duyet` (để demo UC-06 bàn giao)
  - 2 records `cho_phe_duyet`
  - 1 record `bi_tu_choi` (mới — không phải record TQE đã tái gửi)
  - 4 records `da_ban_giao` (đã có ngày bàn giao 2026-04-25, 2026-04-27, 2026-04-28, 2026-04-29)
- Trên hồ sơ HS-202504-002: 5 chi trả `da_phe_duyet` (chưa bàn giao)
- Trên hồ sơ HS-202504-003: 3 chi trả `da_tao` (chưa gửi duyệt)
- Số tiền random hợp lý: BT 50-200tr, HT 10-50tr, TĐC 0-100tr

**Idempotent:**
- Skip tạo hồ sơ nếu `ma_ho_so` đã tồn tại
- Skip tạo hộ nếu `ma_ho` đã tồn tại
- Skip tạo chi trả nếu đã có chi trả cho `(ho_so_id, ho_id)` cặp
- Audit log nên có entries cho các chi trả tạo qua script (action=tao)

**Cách chạy:** `python3 backend/scripts/seed_demo_data.py` (sau khi `seed.py` chạy trước)

**Acceptance Criteria:**
- [ ] Script chạy thành công (exit 0) trên DB hiện tại
- [ ] Sau khi chạy: GET `/dashboard/stats` trả `ho_so.total >= 3`, `chi_tra.total_records >= 18`
- [ ] Chạy lại lần 2 không tạo duplicate (verify count không tăng)
- [ ] Báo cáo `/reports/chi-tra?status=da_phe_duyet` trả >= 8 records
- [ ] Báo cáo `/reports/chi-tra?status=da_ban_giao` trả >= 4 records

**DoD:** Script chạy thành công, idempotency verified, no hardcoded secrets, không xóa data hiện có.

---

## Frontend Stories

### S4-FE-01 — Bàn giao mặt bằng UI

**Vị trí:** Tab "Chi trả" trong `/ho-so-gpmb/[id]`, phần expandable row của chi trả

**Acceptance Criteria:**
- [ ] Khi `chi_tra.status = da_phe_duyet`: hiện nút "Bàn giao mặt bằng" (icon: home/key) trong expanded row
- [ ] Click nút → mở Modal "Bàn giao mặt bằng"
- [ ] Modal có: DatePicker "Ngày bàn giao" (default hôm nay, disable future + > 30 ngày trước), TextArea "Ghi chú"
- [ ] Submit → POST `/ban-giao` → success: toast "Đã bàn giao mặt bằng thành công" + close modal + invalidate query
- [ ] Sau bàn giao: status tag chuyển từ "Đã phê duyệt" → "Đã bàn giao" (Tag màu xanh đậm/teal)
- [ ] Hộ tương ứng (ở tab "Hộ") status update lên `da_ban_giao` (verify by reload tab)
- [ ] Roles: chỉ admin / cbcq thấy nút bàn giao. Kế toán + gddh không thấy.
- [ ] Error 409 / 422 / 403 hiển thị rõ ràng qua `message.error`
- [ ] AuditTimeline trong expanded row hiển thị thêm entry "Bàn giao mặt bằng bởi [actor] — [thời gian]" + ghi chú

**Component mới:** `src/components/chi-tra/BanGiaoMatBangModal.tsx`

**DoD:** 0 TypeScript errors, end-to-end flow hoạt động: bấm nút → modal → submit → status update + audit log update.

---

### S4-FE-02 — Dashboard biểu đồ (Bar + Pie)

**Vị trí:** `/dashboard` page — thêm Row 2.5 (giữa Row 2 progress hiện có và Row 3 recent ho_so)

**Acceptance Criteria:**
- [ ] Thêm Bar chart "Chi trả đã duyệt theo tháng" (6 tháng gần nhất) — dùng `recharts <BarChart>`
- [ ] Thêm Pie chart "Phân bố hộ theo trạng thái" — dùng `recharts <PieChart>`
- [ ] BE endpoint dùng lại `GET /dashboard/stats` (đã có `chi_tra.tong_da_phe_duyet` và `ho.by_status`). Nếu cần thêm breakdown theo tháng, thêm field `chi_tra.by_month` vào response (BE phải bổ sung — coordinate với BE qua interface contract).
- [ ] Mỗi chart trong Card riêng, span 12 cols (md), 24 cols (xs)
- [ ] Color palette dùng Agribank red + neutral grays (xem tokens hiện có)
- [ ] Loading state: Skeleton charts. Empty state: "Chưa có dữ liệu"
- [ ] Format trục Y với short suffix: triệu/tỷ

**⚠️ Interface contract với BE:**
Nếu chart Bar cần data theo tháng, FE phải request BE thêm field. Phương án mặc định: nếu BE không thêm, FE tự fetch `/reports/chi-tra?tu_ngay=...&den_ngay=...` 6 lần (1 mỗi tháng) trên client — chấp nhận được vì dataset nhỏ.

**Dependency mới:** `recharts` (~85kb gzip). Add vào `package.json`.

**DoD:** 0 TypeScript errors, 2 charts render đúng với data thật, responsive xuống mobile.

---

## Dependencies & Sequencing

```
S4-BE-02 (seed data)      ──► (chạy 1 lần, không block)
S4-BE-01 (ban-giao)       ──► S4-FE-01 (BanGiaoMatBangModal)
S4-FE-02 (charts)         ──► (độc lập, có thể bắt đầu ngay)
```

**Critical path BE:** S4-BE-01 (ban-giao) → S4-BE-02 (seed)
**Critical path FE:** S4-FE-02 (charts, độc lập) → S4-FE-01 (đợi S4-BE-01)

---

## DB Migrations Required

**Không cần migration mới.**

- `chi_tra.status` enum đã có `da_ban_giao` từ Sprint 3 (BUG-S3-001 fix)
- `chi_tra.ngay_ban_giao_mat_bang` column đã có
- `ho.status` enum đã có `da_ban_giao`
- `audit_log` table đã có

Toàn bộ infra đã sẵn sàng — chỉ cần thêm endpoint + UI.

---

## New Routes / Components

```
[NEW] src/components/chi-tra/BanGiaoMatBangModal.tsx
[NEW] backend/scripts/seed_demo_data.py
[UPDATE] backend/app/api/v1/chi_tra.py — thêm POST /ban-giao
[UPDATE] frontend/src/app/(dashboard)/ho-so-gpmb/[id]/page.tsx — thêm nút Bàn giao trong ChiTraTab
[UPDATE] frontend/src/app/(dashboard)/dashboard/page.tsx — thêm 2 charts
```

---

## Rollback Plan

| Story | Rollback |
|-------|---------|
| S4-BE-01 (ban-giao) | Revert endpoint — không có DB schema change. Status `da_ban_giao` records bị stuck nhưng không corrupt data. |
| S4-BE-02 (seed) | Run cleanup SQL: `DELETE FROM ho_so_chi_tra WHERE created_at > '<seed_run_time>' AND ho_so_id IN (SELECT id FROM ho_so_gpmb WHERE ma_ho_so IN ('HS-202504-002','HS-202504-003'));` rồi `DELETE FROM ho_so_gpmb WHERE ma_ho_so IN ('HS-202504-002','HS-202504-003');` |
| S4-FE-01 (modal) | Revert page + remove component file |
| S4-FE-02 (charts) | Revert dashboard page + `npm uninstall recharts` |

---

## Out of Sprint 4 (deferred to Sprint 5)

| Item | Sprint |
|------|--------|
| Kế hoạch chi trả tháng (UC-05) | Sprint 5 — cần PO trả lời KH-01..04 trước |
| In-app notification | Sprint 5 |
| Email/SMS notification | Sprint 5 |
| Per-project CBCQ permission | Sprint 5 |
| Export báo cáo PDF | Sprint 5 |
| Đổi mật khẩu | Sprint 5 |

---

## Engineer Assignments

| Role | Stories | Critical path |
|------|---------|--------------|
| **Backend Engineer** | S4-BE-01 (ban-giao endpoint) → S4-BE-02 (seed data script) | ban-giao là critical, làm trước |
| **Frontend Engineer** | S4-FE-02 (dashboard charts, độc lập) → S4-FE-01 (BanGiaoMatBangModal, đợi BE-01) | FE-02 làm trước vì độc lập |

> **BE phải làm S4-BE-01 trước** vì FE-01 cần endpoint sẵn sàng.
> **FE bắt đầu với S4-FE-02 (charts)** vì độc lập với BE-01.

---

## Definition of Done (Sprint 4)

- [ ] Code complete — tất cả AC trong story passed
- [ ] No TypeScript errors (`npx tsc --noEmit` = 0 errors)
- [ ] BE: mỗi endpoint có ít nhất 1 unit test (happy path + 1 error case)
- [ ] BE: seed script chạy idempotent (test bằng cách chạy 2 lần)
- [ ] FE: Modal/charts render với data thật từ API
- [ ] No hardcoded credentials hoặc secrets
- [ ] No debug prints / console.log left in production paths
- [ ] State machine close loop: chi trả → da_ban_giao + ho → da_ban_giao trong cùng transaction
- [ ] TQE: smoke test E2E cho mỗi story + final demo flow

---

## Demo Readiness Checklist (post-sprint)

Sau khi Sprint 4 done, check trước demo May 2:

- [ ] Demo flow E2E: login admin → dashboard → tạo hồ sơ → import hộ → tạo chi trả → gửi duyệt → phê duyệt → bàn giao → xem báo cáo + audit log
- [ ] Dashboard có >= 3 hồ sơ, charts có data nhìn rõ
- [ ] Báo cáo lọc theo status có data đầy đủ ở mọi status
- [ ] Audit log: ít nhất 1 chi trả có chuỗi tao → gui_duyet → phe_duyet → ban_giao
- [ ] No 500 errors khi nhấn các nút chính
- [ ] All 4 user roles login được + UI hiển thị đúng quyền

---

## Technical Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Bàn giao transaction fail giữa update chi_tra và ho | Low | High | Dùng async session transaction với rollback; unit test mock failure |
| Seed script tạo duplicate khi chạy lại | Medium | Low | Idempotent check theo `ma_ho_so` / `ma_ho` / `(ho_so_id, ho_id)` chi trả |
| recharts bundle quá lớn | Low | Medium | Lazy load dashboard page (đã là route riêng); recharts gzip ~85kb chấp nhận được |
| FE không có data theo tháng cho Bar chart | Medium | Low | Fallback: client-side aggregate từ `/reports/chi-tra` (dataset nhỏ chấp nhận được) |
| Demo data làm hỏng hộ HB001 hiện có | Low | High | Seed script chỉ tạo hồ sơ MỚI, không động vào HS-202504-001 hiện có |

---

## Cross-cutting concerns

- **Audit log** (touched bởi S4-BE-01 ban-giao): assign cho BE Engineer (cùng người làm Sprint 3 audit). Action `ban_giao` với note = ghi_chu.
- **State machine** (touched bởi S4-BE-01): cross-cutting auth + status transitions. BE Engineer phải double-check role check + status guard.

---

*Tech Lead sign-off: Sprint 4 scope locked. BE + FE proceed independently from this document. Engineers tự đọc kickoff doc, không cần thêm prompt context.*
