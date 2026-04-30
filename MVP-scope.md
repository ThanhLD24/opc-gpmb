# OPC — MVP SCOPE (Demo Khách Hàng)

> **Mục tiêu:** Demo end-to-end **một luồng nghiệp vụ duy nhất nhưng hoàn chỉnh** từ tạo hồ sơ GPMB → quản lý hộ → thực thi quy trình → chi trả BTHTTĐC → bàn giao mặt bằng.
>
> **Tham chiếu:** Mọi quy tắc nghiệp vụ chi tiết xem `OPC_UseCase_Specification.md`. File này chỉ chốt **scope**, không lặp lại đặc tả.
>
> **Effort ước lượng:** ~12 người-tuần.

---

## 1. Nguyên tắc cắt scope

| Nguyên tắc | Áp dụng |
|---|---|
| **Đi hết 1 luồng đầy đủ** | Hơn là làm dở 5 module. |
| **Hardcode > config** | Danh mục, enum, cấu hình hệ thống → seed cứng. |
| **1 happy path** | Mỗi UC chỉ làm luồng chính, bỏ phần lớn alternative. |
| **Bỏ tính năng "vô hình"** | Audit log, in-app notification, soft delete → bỏ. |
| **Bỏ Refresh / phục hồi trạng thái** | State machine đi 1 chiều cho MVP. |
| **2 role chính + 2 role chốt duyệt** | Admin, CBCQ, Kế toán, GĐĐH. Bỏ QLPB, BLĐ. |

---

## 2. Phạm vi 4 Role MVP

| Role | Quyền cốt lõi |
|---|---|
| **Admin** | Full quyền: cấu hình quy trình chuẩn, CRUD danh mục seed, xem mọi thứ. |
| **CBCQ** (Cán bộ chuyên quản) | CRUD hồ sơ GPMB, CRUD hộ, gán hộ vào quy trình, cập nhật task, cập nhật ngày bàn giao mặt bằng. |
| **Kế toán** | CRUD hồ sơ chi trả, gửi duyệt. |
| **GĐĐH** | Duyệt / Từ chối hồ sơ chi trả. Xem mọi thứ. |

> **Phân quyền MVP:** check role trên BE cho từng API endpoint. Bỏ ma trận chi tiết — chỉ ẩn nút trên FE theo role.

---

## 3. Danh sách Use Case MUST-HAVE (13 UC)

| # | UC | Tên | Module | Ghi chú |
|---|---|---|---|---|
| 1 | UC-00-01 | Đăng nhập | Auth | Username/password đơn giản, JWT. |
| 2 | UC-00-05 | Đăng xuất | Auth | |
| 3 | UC-03-01 | Quản lý quy trình GPMB chuẩn (CRUD cây node) | Quy trình | Bỏ Import Excel (UC-03-02) — seed bằng tay từ file `Quy trinh GPMB (1).xlsx`. |
| 4 | UC-03-03 | Cấu hình custom field theo node | Quy trình | Bật/tắt: Số VB, Ngày VB, Loại VB, Số tiền trình/duyệt, file scan, **`per_household`**. |
| 5 | UC-01-01 | Danh sách hồ sơ GPMB | Hồ sơ | List + filter cơ bản. |
| 6 | UC-01-02 | Chi tiết hồ sơ GPMB | Hồ sơ | Tabs: Thông tin chung / Hộ / Quy trình & Tiến độ / Tiến độ theo hộ / Chi trả. |
| 7 | UC-01-03 | Tạo mới hồ sơ GPMB | Hồ sơ | ⭐ Snapshot template + sinh task instance theo II.2.3. |
| 8 | UC-02-01 | Danh sách hộ/tổ chức (trong 1 hồ sơ) | Hộ | |
| 9 | UC-02-03 | Thêm mới hộ | Hộ | Form đơn |
| 10 | UC-02-06 | Import Excel danh sách hộ | Hộ | Bắt buộc — vài trăm hộ không nhập tay được. |
| 11 | UC-04-01 | Danh sách công việc + filter theo hộ | Công việc | Cây task, có cột "Hộ". |
| 12 | UC-04-03 | Chi tiết task instance | Công việc | Hiển thị custom field bật/tắt theo node. |
| 13 | UC-04-04 | Cập nhật trạng thái task lá | Công việc | 2 trạng thái: Đang thực hiện / Hoàn thành. Auto rollup task cha. |
| 14 | UC-04-07 | Nhập custom field GPMB + upload file scan | Công việc | Số VB, Ngày VB, Loại VB, file scan. |
| 15 | **UC-04-11** | **Gán/gỡ hộ vào nhánh quy trình** | Công việc | ⭐ Sinh / xoá task instance đệ quy. |
| 16 | **UC-04-12** | **Ma trận tiến độ task theo hộ + Export Excel** | Công việc | ⭐⭐ Điểm chốt demo. |
| 17 | UC-06-01 | Danh sách hồ sơ chi trả BTHTTĐC | Chi trả | Trong tab của hồ sơ GPMB. |
| 18 | UC-06-02 | Chi tiết hồ sơ chi trả | Chi trả | |
| 19 | UC-06-03 | Tạo hồ sơ chi trả (rút gọn) | Chi trả | 3 khoản tiền (BT/HT/TĐC), tổng auto, 1 file chứng từ. **Quy tắc:** 1 hộ = tối đa 1 hồ sơ chi trả active (≠ Bị từ chối). |
| 20 | UC-06-04 | Gửi duyệt | Chi trả | `Đã tạo` → `Chờ phê duyệt`. |
| 21 | UC-06-05 | Duyệt / Từ chối (rút gọn) | Chi trả | **Bỏ Refresh**. State 1 chiều. |
| 22 | UC-06-06 | Cập nhật ngày bàn giao mặt bằng | Chi trả | ⭐ Đóng vòng luồng. |

> **Tổng: 22 UC** (đếm cả Auth). Tương đương ~46% của 48 UC đặc tả gốc.

---

## 4. State Machines (đơn giản hoá cho MVP)

### 4.1 Hồ sơ GPMB

```
(mới tạo) → Chuẩn bị → Thực hiện → Hoàn thành
```

**MVP:** chỉ làm `Chuẩn bị → Thực hiện` (Admin/CBCQ chuyển tay). Bỏ logic auto chuyển sang Hoàn thành.

### 4.2 Hộ / Tổ chức

```
Mới → Đang xử lý → Đã thống nhất phương án → Đã chi trả → Đã bàn giao mặt bằng
```

**MVP:** đi đủ 5 trạng thái (đây là USP — phải demo).
- `Mới → Đang xử lý`: tự động khi có task của hộ chuyển sang Hoàn thành đầu tiên.
- `Đang xử lý → Đã thống nhất phương án`: chuyển tay (CBCQ click button).
- `Đã thống nhất → Đã chi trả`: tự động khi hồ sơ chi trả của hộ ở `Đã phê duyệt`.
- `Đã chi trả → Đã bàn giao mặt bằng`: UC-06-06.

### 4.3 Công việc (task instance)

```
Đang thực hiện ⇄ Hoàn thành
```

- Task lá: CBCQ chuyển tay.
- Task cha: auto rollup theo II.3.

### 4.4 Hồ sơ chi trả BTHTTĐC

```
Đã tạo → Chờ phê duyệt → (Đã phê duyệt | Bị từ chối)
                                              ↓
                                          Đã tạo (sửa lại)
```

**MVP bỏ:** Refresh hồ sơ đã duyệt.

---

## 5. Mô hình dữ liệu cốt lõi (cho engineer)

> Tham chiếu chính: `OPC_UseCase_Specification.md` mục **II.0**.

```
user (id, username, password_hash, full_name, role, active)

workflow_template
  └── workflow_node (cây, parent_id, level, order, code, name,
                     planned_days, is_milestone, per_household,
                     field_so_vb, field_ngay_vb, field_loai_vb,
                     field_gia_tri_trinh, field_gia_tri_duyet,
                     field_ghi_chu, require_scan)

ho_so_gpmb (id, code, name, dia_chi, cbcq_id, ngay_bd, ngay_kt, status)
  └── ho_so_workflow_node  (snapshot 1-1 từ workflow_node tại thời điểm tạo hồ sơ)

ho (id, ho_so_id, ma_ho, loai_dat, ten_chu_ho, dia_chi, thua, dien_tich, status)

node_household_scope (ho_so_id, node_id, ho_id) -- gán hộ vào node cha cấp cao nhất per_household=true

task_instance
  - id
  - ho_so_id (FK)
  - node_id  (FK ho_so_workflow_node)
  - ho_id    (FK ho, NULLABLE)
  - status   (Đang thực hiện / Hoàn thành)
  - so_vb, ngay_vb, loai_vb, gia_tri_trinh, gia_tri_duyet, ghi_chu
  - file_scan_url
  - completed_at
  - UNIQUE (ho_so_id, node_id, ho_id)

ho_so_chi_tra
  - id, ma_hsct (auto), ho_so_id, ho_id
  - so_tien_bt, so_tien_ht, so_tien_tdc, tong_de_nghi (computed)
  - noi_dung, ghi_chu, file_chung_tu_url
  - status (Đã tạo / Chờ phê duyệt / Đã phê duyệt / Bị từ chối)
  - ly_do_tu_choi
  - created_by, approved_by, approved_at
  - ngay_ban_giao_mat_bang
```

**Index quan trọng:**
- `task_instance (ho_so_id, ho_id)` — pivot view 354 hộ × N node.
- `task_instance (ho_so_id, node_id)` — rollup task cha.
- `ho_so_chi_tra (ho_id, status)` — enforce 1 hồ sơ chi trả active / hộ.

---

## 6. Backlog Sprint (chia 4 sprint × 1 tuần × 3 dev)

### Sprint 1 — Nền tảng + Auth + Quy trình (Tuần 1)
- [ ] S1.1 — Setup project (FE + BE + DB schema) — 0.5 tuần
- [ ] S1.2 — UC-00-01, UC-00-05 (login/logout, JWT, role guard)
- [ ] S1.3 — UC-03-01 (CRUD cây node template, validate `per_household` cha-con)
- [ ] S1.4 — UC-03-03 (cấu hình custom field theo node)
- [ ] S1.5 — Seed cây quy trình GPMB từ file `Quy trinh GPMB (1).xlsx` (110 node)

### Sprint 2 — Hồ sơ GPMB + Hộ (Tuần 2)
- [ ] S2.1 — UC-01-01, UC-01-02 (list + detail hồ sơ với 5 tab)
- [ ] S2.2 — UC-01-03 (tạo hồ sơ + ⭐ snapshot template + sinh task instance node `per_household=false`)
- [ ] S2.3 — UC-02-01, UC-02-03 (list + thêm hộ)
- [ ] S2.4 — UC-02-06 (Import Excel danh sách hộ)

### Sprint 3 — Công việc + Ma trận theo hộ (Tuần 3) — ⭐ Trọng tâm
- [ ] S3.1 — UC-04-11 (gán/gỡ hộ vào node → sinh/xoá task instance đệ quy)
- [ ] S3.2 — UC-04-01 (danh sách công việc + filter theo hộ)
- [ ] S3.3 — UC-04-03 (chi tiết task)
- [ ] S3.4 — UC-04-04 (cập nhật trạng thái + auto rollup task cha)
- [ ] S3.5 — UC-04-07 (nhập custom field + upload file scan)
- [ ] S3.6 — ⭐⭐ UC-04-12 (ma trận pivot + Export Excel theo format sheet 2 file mẫu)
- [ ] S3.7 — Auto chuyển trạng thái hộ `Mới → Đang xử lý` khi có task Hoàn thành đầu tiên

### Sprint 4 — Chi trả BTHTTĐC + đóng vòng (Tuần 4)
- [ ] S4.1 — UC-06-01, UC-06-02 (list + detail hồ sơ chi trả)
- [ ] S4.2 — UC-06-03 (tạo hồ sơ chi trả: 3 khoản, tổng auto, 1 file chứng từ, validate 1 hộ = 1 hồ sơ active)
- [ ] S4.3 — UC-06-04 (gửi duyệt)
- [ ] S4.4 — UC-06-05 (duyệt/từ chối, **bỏ Refresh**)
- [ ] S4.5 — Auto chuyển trạng thái hộ `Đã thống nhất → Đã chi trả` khi hồ sơ chi trả Đã phê duyệt
- [ ] S4.6 — UC-06-06 (cập nhật ngày bàn giao mặt bằng → hộ → `Đã bàn giao mặt bằng`)
- [ ] S4.7 — Polish demo: seed user 4 role, seed 1 hồ sơ mẫu, test kịch bản end-to-end

---

## 7. Kịch bản Demo (20 phút)

| Phút | Ai | Hành động |
|---|---|---|
| 0–2 | Admin | Login → vào "Quy trình GPMB chuẩn" → show cây 110 node đã seed → mở 1 node, show toggle `per_household` + custom field. |
| 2–4 | Admin | Vào "Hồ sơ GPMB" → "Thêm mới" → tạo "CCN Hữu Bằng" → vào tab "Quy trình & Tiến độ" → cây task hiển thị, các node `per_household=false` (C001–C007) đã có 1 task / node. |
| 4–6 | CBCQ | Vào tab "Hộ" → Import Excel 354 hộ → list hiển thị đầy đủ. |
| 6–8 | CBCQ | Tab "Quy trình & Tiến độ" → chọn node "Kiểm đếm" (`per_household=true`) → "Gán hộ" → multi-select 354 hộ → Lưu → cây task sinh hàng nghìn task instance. |
| 8–11 | CBCQ | Mở task lá của hộ HB001 → nhập Số VB, Ngày VB, upload PDF scan → đánh "Hoàn thành" → quay lại cây → tiến độ X/Y cập nhật → trạng thái hộ HB001 chuyển `Mới → Đang xử lý` (auto). |
| 11–14 | Tất cả | ⭐⭐ Vào tab "Tiến độ theo hộ" → bảng pivot 354 hộ × N node → nhấn **Export Excel** → mở ra giống sheet 2 của file mẫu khách cung cấp. |
| 14–15 | CBCQ | Chọn hộ HB001 → "Đánh dấu Đã thống nhất phương án". |
| 15–17 | Kế toán | Login → tab "Chi trả" của hồ sơ → "Tạo mới" → chọn HB001 → 1.2 tỷ BT + 200tr HT → tổng auto 1.4 tỷ → upload PDF chứng từ → Gửi duyệt. |
| 17–18 | GĐĐH | Login → "Hồ sơ chi trả chờ duyệt" → mở HB001 → **Duyệt** → state `Đã phê duyệt` → trạng thái hộ tự chuyển `Đã chi trả`. |
| 18–19 | CBCQ | Vào hộ HB001 → "Cập nhật ngày bàn giao mặt bằng" = today → trạng thái hộ chuyển `Đã bàn giao mặt bằng` ✅. |
| 19–20 | Tất cả | Quay lại danh sách hộ → filter `Đã bàn giao` → thấy HB001 → ✅ **đóng vòng luồng end-to-end**. |

---

## 8. Definition of Done (cho mỗi story)

- [ ] Code trên branch `feat/<story-id>`, có PR review.
- [ ] Unit test cho business logic chính (đặc biệt: sinh task instance, rollup task cha, state transition hộ).
- [ ] Smoke test thủ công theo bước trong UC.
- [ ] Seed data minh hoạ đủ để demo.
- [ ] Không có lỗi console / lỗi 500 trên happy path.

---

## 9. Out of Scope MVP — danh sách cô đọng

| Module / Tính năng | Hoãn đến |
|---|---|
| UC-03-02 Import Excel quy trình | Sprint 5 |
| UC-04-02 Công việc của tôi (filter) | Sprint 5 |
| UC-04-05/06 Khó khăn & giải pháp | Sprint 5 |
| UC-04-09/10 Nhận xét cấp trên | Sprint 6 |
| UC-01-04/05 Sửa/Xoá hồ sơ | Sprint 5 |
| UC-02-04/05 Sửa/Xoá hộ | Sprint 5 |
| UC-02-07 Export hộ | Sprint 5 |
| UC-05-* Kế hoạch tháng | Sprint 6 |
| UC-07-* Báo cáo | Sprint 6 |
| UC-08-* Dashboard | Sprint 7 |
| UC-09-* Danh mục có UI quản lý | Sprint 5 (MVP seed cứng) |
| Module thông báo in-app | Sprint 6 |
| Audit log | Sprint 6 |
| 6 role đầy đủ + ma trận phân quyền | Sprint 5 |
| Refresh hồ sơ chi trả đã duyệt | Sprint 6 |
| Multi-attachment | Sprint 5 |
| Tích hợp ngân hàng / xuất UNC | Out of scope dài hạn |

---

## 10. Rủi ro & giả định

| Rủi ro | Giảm thiểu |
|---|---|
| Cây 110 node × 354 hộ = ~39k task instance — query chậm | Index `(ho_so_id, ho_id)`, server-side pagination, materialized view cho pivot. |
| Export Excel pivot lớn | Dùng `openpyxl` streaming, async job nếu > 10k cells. |
| Snapshot template tốn dung lượng | Chấp nhận trade-off; sẽ optimize sau MVP. |
| Khách yêu cầu tính năng ngoài scope khi demo | Có sẵn slide "Lộ trình sau MVP" để pivot. |

**Giả định:**
- Khách chấp nhận seed cứng cây quy trình từ file mẫu (không Import Excel ở MVP).
- Khách chấp nhận 1 hộ = 1 hồ sơ chi trả active ở MVP.
- Hạ tầng demo: 1 server (FE + BE + DB) chạy local hoặc 1 VPS nhỏ.
