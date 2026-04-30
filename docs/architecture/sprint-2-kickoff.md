# Sprint 2 Kickoff — OPC GPMB

**Date:** 2026-04-29  
**Tech Lead:** BMAD TL Agent  
**Sprint goal:** CRUD hoàn chỉnh (sửa/xoá hồ sơ + hộ) + Import/Export Excel quy trình  
**Deadline:** 2026-05-09 (~7 ngày sau demo)  
**Based on:** `docs/prd.md` §6 backlog + Sprint 1 gaps

---

## Sprint 2 — Scope

### Lý do chọn stories này
Sprint 1 chỉ có Create+Read cho hầu hết modules. Sprint 2 hoàn thiện CRUD cơ bản và đóng nốt UC Import Excel quy trình (UC-03-02) bị để lại từ Sprint 1. Không có thay đổi kiến trúc — tất cả follow pattern đã thiết lập.

### Stories

| ID | Title | UC | BE | FE | Độ phức tạp |
|----|-------|----|----|-----|------------|
| S2-01 | Sửa hồ sơ GPMB | UC-01-04 | S2-BE-01 | S2-FE-01 | S |
| S2-02 | Xoá hồ sơ GPMB | UC-01-05 | S2-BE-02 | S2-FE-02 | S |
| S2-03 | Sửa hộ | UC-02-04 | S2-BE-03 | S2-FE-03 | S |
| S2-04 | Xoá hộ | UC-02-05 | S2-BE-04 | S2-FE-04 | S |
| S2-05 | Import Excel quy trình | UC-03-02 | S2-BE-05 | S2-FE-05 | M |
| S2-06 | Export Excel quy trình | UC-03-02b | S2-BE-06 | S2-FE-06 | S |

**Total:** 6 stories, ~12 tasks (6 BE + 6 FE)

---

## ADRs (locked for Sprint 2)

| # | Decision | Rationale |
|---|----------|-----------|
| ADR-S2-01 | Soft-delete cho hồ sơ GPMB: thêm cột `deleted_at TIMESTAMP NULL` | Giữ data integrity, tránh cascade delete nhầm; list API filter `WHERE deleted_at IS NULL` |
| ADR-S2-02 | Hard-delete cho hộ nếu `status = moi` và không có task instance | Hộ "mới" chưa có data gắn liền → safe to delete; các trạng thái khác → block với error 409 |
| ADR-S2-03 | Import Excel quy trình: upsert by `code` (unique key) | Cho phép re-import để update; code là business key của node |
| ADR-S2-04 | Import flow: preview trước, confirm sau (2 bước) | Tránh import nhầm; follow pattern Import Hộ đã có ở Sprint 1 |

---

## Backend Stories

### S2-BE-01 — Sửa hồ sơ GPMB (UC-01-04)

**Endpoint:** `PATCH /api/v1/ho-so/{ho_so_id}`  
**Auth:** Admin hoặc CBCQ (role check)  
**Body:** `{ name?, dia_chi?, cbcq_id?, ngay_bd?, ngay_kt? }` (tất cả optional)

**Acceptance Criteria:**
- [ ] Trả 200 + updated object khi thành công
- [ ] Trả 403 nếu role là ke_toan hoặc gddh
- [ ] Trả 404 nếu hồ sơ không tồn tại hoặc `deleted_at IS NOT NULL`
- [ ] Không cho phép đổi `code` (auto-generated, immutable)
- [ ] Validate: `name` nếu có thì không được rỗng

**DoD:** Code complete, unit test `test_update_ho_so.py`, reviewed, no secrets.

---

### S2-BE-02 — Xoá hồ sơ GPMB (UC-01-05)

**Endpoint:** `DELETE /api/v1/ho-so/{ho_so_id}`  
**Auth:** Admin only  
**Cơ chế:** Soft delete — set `deleted_at = now()`

**Acceptance Criteria:**
- [ ] Trả 204 khi soft-delete thành công
- [ ] Trả 403 nếu không phải Admin
- [ ] Trả 409 nếu hồ sơ có `status != 'chuan_bi'` (đang hoặc đã thực hiện → không xoá được)
- [ ] List API `/ho-so` tự động lọc `deleted_at IS NULL`
- [ ] Detail API trả 404 sau khi deleted

**DB migration:** `ALTER TABLE ho_so_gpmb ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;`  
**DoD:** Migration file, unit test `test_delete_ho_so.py`, reviewed.

---

### S2-BE-03 — Sửa hộ (UC-02-04)

**Endpoint:** `PATCH /api/v1/ho-so/{ho_so_id}/ho/{ho_id}`  
**Auth:** Admin hoặc CBCQ  
**Body:** `{ ma_ho?, loai_dat?, ten_chu_ho?, dia_chi?, thua?, dien_tich? }`

**Acceptance Criteria:**
- [ ] Trả 200 + updated ho object
- [ ] Trả 403 nếu ke_toan / gddh
- [ ] Trả 409 nếu `ho.status` là `da_thong_nhat`, `da_chi_tra`, hoặc `da_ban_giao` (không cho sửa khi đã chốt phương án)
- [ ] Validate: `ma_ho` nếu có thì unique trong hồ sơ

**DoD:** Unit test, reviewed.

---

### S2-BE-04 — Xoá hộ (UC-02-05)

**Endpoint:** `DELETE /api/v1/ho-so/{ho_so_id}/ho/{ho_id}`  
**Auth:** Admin hoặc CBCQ

**Acceptance Criteria:**
- [ ] Trả 204 khi xoá thành công
- [ ] Trả 409 nếu `ho.status != 'moi'` — chỉ xoá được hộ chưa xử lý gì
- [ ] Trả 409 nếu hộ có task_instance records (đã gán vào quy trình)
- [ ] Trả 409 nếu hộ có chi_tra records
- [ ] Hard delete (không cần soft delete cho hộ mới)

**DoD:** Unit test, reviewed.

---

### S2-BE-05 — Import Excel quy trình (UC-03-02) `[SECURITY]`

**Endpoint:** `POST /api/v1/workflow/import-excel`  
**Auth:** Admin only  
**Content-Type:** `multipart/form-data` (field: `file`)  
**Mode query param:** `?mode=preview` (validate only) | `?mode=confirm` (upsert)

**File format expected (columns):**
```
code | parent_code | name | planned_days | per_household | 
field_so_vb | field_ngay_vb | field_loai_vb | 
field_gia_tri_trinh | field_gia_tri_duyet | field_ghi_chu | require_scan |
legal_basis | org_in_charge
```

**Acceptance Criteria:**
- [ ] `mode=preview`: parse file, trả list rows với `status: ok|error` và `error_message`
- [ ] `mode=confirm`: upsert by `code` — INSERT nếu code mới, UPDATE nếu code đã tồn tại
- [ ] Validate: file phải là `.xlsx`; size < 5MB; đúng columns header
- [ ] Validate per row: `code` required; `parent_code` phải tồn tại trong file hoặc DB; `per_household` là boolean
- [ ] `[SECURITY]` Validate file content (không chạy macro, chỉ đọc data cells)
- [ ] Trả 403 nếu không phải Admin
- [ ] Trả summary: `{ total, inserted, updated, errors: [{row, code, message}] }`

**DoD:** Unit test với 3 file fixtures (valid, invalid header, data errors), reviewed.

---

### S2-BE-06 — Export Excel quy trình

**Endpoint:** `GET /api/v1/workflow/export-excel`  
**Auth:** Admin only  
**Response:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**Acceptance Criteria:**
- [ ] Trả file `.xlsx` với tất cả nodes của workflow template hiện tại
- [ ] Columns: `code, parent_code, name, planned_days, per_household, field_so_vb, field_ngay_vb, field_loai_vb, field_gia_tri_trinh, field_gia_tri_duyet, field_ghi_chu, require_scan, legal_basis, org_in_charge`
- [ ] Rows sắp xếp theo DFS (depth-first) để giữ thứ tự cây
- [ ] Header row bold, freeze top row
- [ ] Filename: `quy-trinh-template-YYYY-MM-DD.xlsx`

**DoD:** Unit test kiểm tra file bytes valid xlsx, reviewed.

---

## Frontend Stories

### S2-FE-01 — Sửa hồ sơ GPMB

**Vị trí:** Tab "Thông tin chung" trong `/ho-so-gpmb/[id]`  
**Component mới:** `EditHoSoModal.tsx`

**Acceptance Criteria:**
- [ ] Nút "Sửa thông tin" visible cho Admin/CBCQ; ẩn với ke_toan/gddh
- [ ] Click → Modal với form prefilled: name, dia_chi, cbcq_id (Select), ngay_bd, ngay_kt (DatePicker)
- [ ] Save → `PATCH /ho-so/{id}` → close modal → invalidate query → tab refresh
- [ ] Validation: name required
- [ ] Loading state trên nút Save

**DoD:** Component renders, PATCH called correctly, no TypeScript errors.

---

### S2-FE-02 — Xoá hồ sơ GPMB

**Vị trí:** Trang list `/ho-so-gpmb` (cột Thao tác) + có thể trong detail page header

**Acceptance Criteria:**
- [ ] Nút "Xoá" chỉ visible cho Admin
- [ ] Popconfirm: "Xóa hồ sơ này? Không thể hoàn tác."
- [ ] Confirm → `DELETE /ho-so/{id}` → redirect về `/ho-so-gpmb`
- [ ] Error 409 → notification.error với message từ backend
- [ ] Loading state trong Popconfirm

**DoD:** No TypeScript errors, reviewed.

---

### S2-FE-03 — Sửa hộ

**Vị trí:** Cột Thao tác trong bảng Hộ (tab "Hộ")  
**Component:** Mở rộng `HoForm.tsx` hoặc tạo `EditHoModal.tsx`

**Acceptance Criteria:**
- [ ] Nút "Sửa" visible cho Admin/CBCQ
- [ ] Click → Modal với form prefilled (ma_ho, loai_dat, ten_chu_ho, dia_chi, thua, dien_tich)
- [ ] Save → `PATCH /ho-so/{id}/ho/{ho_id}` → close → refresh table
- [ ] Hiển thị lỗi 409 (status quá tiến trình) rõ ràng
- [ ] Loading state

**DoD:** No TypeScript errors.

---

### S2-FE-04 — Xoá hộ

**Vị trí:** Cột Thao tác trong bảng Hộ

**Acceptance Criteria:**
- [ ] Nút "Xoá" visible cho Admin/CBCQ
- [ ] Popconfirm: "Xóa hộ {ma_ho}? Chỉ xoá được hộ chưa vào quy trình."
- [ ] Confirm → `DELETE /ho-so/{id}/ho/{ho_id}` → refresh table + update count
- [ ] Lỗi 409 → notification.error với detail từ backend
- [ ] Loading state

**DoD:** No TypeScript errors.

---

### S2-FE-05 — Import Excel quy trình

**Vị trí:** Trang `/quy-trinh`  
**Component mới:** `ImportQuyTrinhModal.tsx`

**Acceptance Criteria:**
- [ ] Nút "Import Excel" visible cho Admin trong header Card cây quy trình
- [ ] Click → Modal với Upload component (accept `.xlsx` only)
- [ ] Upload file → gọi `POST /workflow/import-excel?mode=preview` → hiển thị preview table
- [ ] Preview table: cột code, name, parent_code, status (ok/error), error_message
- [ ] Rows có lỗi highlight đỏ
- [ ] Nút "Xác nhận Import" chỉ enable khi không có lỗi (hoặc user accept errors)
- [ ] Confirm → `POST /workflow/import-excel?mode=confirm` → success notification → close modal → invalidate tree
- [ ] Summary: "Đã import X node (Y thêm mới, Z cập nhật)"

**DoD:** 2-step flow hoạt động, no TypeScript errors.

---

### S2-FE-06 — Export Excel quy trình

**Vị trí:** Trang `/quy-trinh`, header Card

**Acceptance Criteria:**
- [ ] Nút "Xuất Excel" visible cho Admin
- [ ] Click → `GET /workflow/export-excel` → trigger download file xlsx
- [ ] Loading state trên nút trong khi download
- [ ] Sử dụng `window.location.href` hoặc `<a download>` pattern với Bearer token (dùng api interceptor)

**DoD:** File downloads correctly, no TypeScript errors.

---

## Dependencies & Sequencing

```
S2-BE-01 ──► S2-FE-01   (FE cần BE endpoint xong trước)
S2-BE-02 ──► S2-FE-02
S2-BE-03 ──► S2-FE-03
S2-BE-04 ──► S2-FE-04
S2-BE-05 ──► S2-FE-05
S2-BE-06 ──► S2-FE-06
```

BE và FE có thể implement song song — FE mock response nếu BE chưa xong.

---

## DB Migrations Required

```sql
-- Migration: 002_sprint2_soft_delete_ho_so.sql
ALTER TABLE ho_so_gpmb ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
CREATE INDEX idx_ho_so_gpmb_deleted_at ON ho_so_gpmb(deleted_at) WHERE deleted_at IS NULL;
```

---

## Rollback Plan

| Story | Rollback |
|-------|---------|
| S2-BE-01/02 (soft delete) | Revert migration — `ALTER TABLE ho_so_gpmb DROP COLUMN deleted_at` |
| S2-BE-03/04 (sửa/xoá hộ) | Revert endpoints (no DB change) |
| S2-BE-05/06 (import/export Excel) | Revert endpoints (no DB change) |
| FE stories | Revert component files — no data loss risk |

---

## Out of Sprint 2 (deferred)

| Item | Sprint |
|------|--------|
| 6 role đầy đủ + ma trận phân quyền | Sprint 3 |
| Báo cáo (UC-07-*) | Sprint 3 |
| Kế hoạch tháng (UC-05-*) | Sprint 3 |
| Refresh hồ sơ chi trả đã duyệt | Sprint 3 |
| Dashboard (UC-08-*) | Sprint 4 |
| Audit log | Sprint 3 |
| Tích hợp ngân hàng | Long-term |

---

## Engineer Assignments

| Role | Stories |
|------|---------|
| **Backend Engineer** | S2-BE-01, S2-BE-02, S2-BE-03, S2-BE-04, S2-BE-05 `[SECURITY]`, S2-BE-06 |
| **Frontend Engineer** | S2-FE-01, S2-FE-02, S2-FE-03, S2-FE-04, S2-FE-05, S2-FE-06 |

> Both engineers read this kickoff independently and implement their assigned stories in parallel.

---

## Definition of Done (Sprint 2)

- [ ] Code complete — tất cả AC trong story passed
- [ ] No TypeScript errors (`npx tsc --noEmit` = 0 errors)
- [ ] BE: mỗi endpoint có ít nhất 1 unit test (happy path + 1 error case)
- [ ] FE: component renders, API calls đúng method/URL/body
- [ ] No hardcoded credentials hoặc secrets
- [ ] No debug prints / console.log left in production paths
- [ ] Reviewed by Tech Lead (TL code review checklist)
- [ ] TQE: smoke test E2E cho mỗi story

---

*Tech Lead sign-off: Sprint 2 scope locked. BE + FE proceed independently from this document.*
