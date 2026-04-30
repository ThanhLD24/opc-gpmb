# PRD — Product Requirements Document
## OPC: Phần mềm hỗ trợ điều hành Giải phóng mặt bằng (GPMB)

**Version:** 1.0  
**Date:** 2026-04-29  
**Phase:** MVP — Demo Khách hàng  
**Reference:** `OPC_UseCase_Specification.md` (đặc tả đầy đủ) | `MVP-scope.md` (scope cắt)

---

## 1. Product Vision

OPC là hệ thống SaaS nội bộ giúp đơn vị GPMB:
- **Theo dõi** cây quy trình GPMB với hàng trăm bước × hàng trăm hộ dân
- **Quản lý** vòng đời từng hộ từ khảo sát đến bàn giao mặt bằng
- **Phê duyệt** chi trả BTHTTĐC với luồng có kiểm soát
- **Xuất** báo cáo tiến độ dạng ma trận pivot Excel

---

## 2. User Personas (MVP — 4 Role)

| Persona | Mô tả | Pain Point chính |
|---|---|---|
| **Admin** | Quản trị hệ thống, cấu hình quy trình | Phải seed cây 110 node bằng tay; cần UI trực quan |
| **CBCQ** | Cán bộ nhập liệu hàng ngày, theo dõi tiến độ | Nhập vài trăm hộ = phải có Import Excel; cần nhìn thấy ma trận tiến độ |
| **Kế toán** | Lập hồ sơ chi trả BTHTTĐC | Form nhập tiền 3 khoản, tổng auto; gửi duyệt đơn giản |
| **GĐĐH** | Phê duyệt chi trả, xem tổng quan | Màn duyệt gọn: xem → duyệt / từ chối |

---

## 3. Feature List & MVP Scope

### 3.1 Module Auth (UC-00-01, UC-00-05)
| Feature | MoSCoW | Mô tả |
|---|---|---|
| Đăng nhập username/password + JWT | **MUST** | 4 role seed sẵn |
| Đăng xuất | **MUST** | |
| Role-based route guard | **MUST** | BE check + FE ẩn nút |
| Đổi mật khẩu, thông báo in-app | WON'T (MVP) | Sprint 5+ |

**Success criteria:** Login thành công với 4 account; sai password → lỗi rõ; token expire → redirect login.

---

### 3.2 Module Quy trình GPMB (UC-03-01, UC-03-03)
| Feature | MoSCoW | Mô tả |
|---|---|---|
| CRUD cây node template (Admin) | **MUST** | Đệ quy N cấp, drag-reorder |
| Cấu hình custom field per node | **MUST** | Toggle: so_vb, ngay_vb, loai_vb, gia_tri_trinh, gia_tri_duyet, ghi_chu, require_scan |
| Toggle `per_household` per node | **MUST** | Validate: cha per_household=true → con phải true |
| Import Excel quy trình (UC-03-02) | WON'T (MVP) | Seed bằng script từ Excel |
| Export "tải toàn bộ quy trình" | SHOULD | Sprint 2 nếu còn time |

**Success criteria:** Admin tạo/sửa/xoá node; toggle `per_household` đúng luật kế thừa; cây hiển thị collapsible.

---

### 3.3 Module Hồ sơ GPMB (UC-01-01, UC-01-02, UC-01-03)
| Feature | MoSCoW | Mô tả |
|---|---|---|
| Danh sách hồ sơ + filter cơ bản | **MUST** | Filter: trạng thái, CBCQ, ngày tạo |
| Chi tiết hồ sơ — 5 tab | **MUST** | Tabs: Thông tin chung / Hộ / Quy trình & Tiến độ / Tiến độ theo hộ / Chi trả |
| Tạo hồ sơ + **snapshot template** + sinh task | **MUST** | ⭐ Core logic |
| Chuyển trạng thái Chuẩn bị → Thực hiện | **MUST** | Thủ công (CBCQ/Admin click button) |
| Sửa / Xoá hồ sơ | WON'T (MVP) | Sprint 5 |

**Success criteria:** Tạo hồ sơ → snapshot cây template → sinh task instance cho mọi node per_household=false; trạng thái bắt đầu "Chuẩn bị".

---

### 3.4 Module Hộ / Tổ chức (UC-02-01, UC-02-03, UC-02-06)
| Feature | MoSCoW | Mô tả |
|---|---|---|
| Danh sách hộ trong hồ sơ + filter | **MUST** | Filter theo trạng thái |
| Thêm hộ thủ công (form) | **MUST** | |
| **Import Excel danh sách hộ** | **MUST** | Preview + validate trước import |
| Trạng thái hộ (5 bước) | **MUST** | Mới / Đang xử lý / Đã thống nhất / Đã chi trả / Đã bàn giao |
| Sửa / Xoá hộ | WON'T (MVP) | Sprint 5 |
| Export hộ | WON'T (MVP) | Sprint 5 |

**State machine hộ (MVP):**
```
Mới ──(auto: task đầu tiên Hoàn thành)──► Đang xử lý
Đang xử lý ──(CBCQ click)──► Đã thống nhất phương án
Đã thống nhất ──(auto: hồ sơ chi trả Đã phê duyệt)──► Đã chi trả
Đã chi trả ──(CBCQ cập nhật ngày bàn giao)──► Đã bàn giao mặt bằng
```

**Success criteria:** Import 354 hộ từ Excel thành công; preview lỗi rõ ràng; trạng thái hộ chuyển đúng trigger.

---

### 3.5 Module Công việc / Task (UC-04-01, UC-04-03, UC-04-04, UC-04-07, UC-04-11, UC-04-12)
| Feature | MoSCoW | Mô tả |
|---|---|---|
| Danh sách task + filter theo hộ | **MUST** | Cây collapsible, cột "Hộ" |
| Chi tiết task instance | **MUST** | Hiển thị custom field theo cấu hình node |
| Cập nhật trạng thái task lá | **MUST** | Đang thực hiện ⇄ Hoàn thành |
| Auto rollup task cha | **MUST** | X/Y con Hoàn thành → cha Hoàn thành |
| Nhập custom field GPMB + upload scan | **MUST** | so_vb, ngay_vb, loai_vb, file PDF |
| **Gán/gỡ hộ vào nhánh quy trình** | **MUST** | ⭐ Sinh/xoá task instance đệ quy |
| **Ma trận pivot hộ × node + Export Excel** | **MUST** | ⭐⭐ Điểm chốt demo |
| "Công việc của tôi" filter | WON'T (MVP) | Sprint 5 |
| Khó khăn & giải pháp | WON'T (MVP) | Sprint 5 |
| Nhận xét cấp trên | WON'T (MVP) | Sprint 6 |

**Success criteria:**
- Gán 354 hộ vào node per_household=true → sinh ~39k task instance trong < 10s
- Ma trận pivot load trong < 3s; Export Excel đúng format mẫu (sheet 2)
- Task lá cập nhật → task cha auto rollup đúng scope hộ

---

### 3.6 Module Chi trả BTHTTĐC (UC-06-01 → UC-06-06)
| Feature | MoSCoW | Mô tả |
|---|---|---|
| Danh sách hồ sơ chi trả (trong tab hồ sơ GPMB) | **MUST** | |
| Chi tiết hồ sơ chi trả | **MUST** | |
| Tạo hồ sơ chi trả | **MUST** | 3 khoản (BT/HT/TĐC), tổng auto, 1 file chứng từ |
| Validate 1 hộ = 1 hồ sơ active | **MUST** | Active = ≠ Bị từ chối |
| Gửi duyệt | **MUST** | Đã tạo → Chờ phê duyệt |
| Duyệt / Từ chối (GĐĐH) | **MUST** | State 1 chiều, bỏ Refresh |
| Cập nhật ngày bàn giao mặt bằng | **MUST** | ⭐ Đóng vòng luồng |
| Refresh hồ sơ đã duyệt | WON'T (MVP) | Sprint 6 |

**State machine chi trả:**
```
Đã tạo → Chờ phê duyệt → Đã phê duyệt
                       → Bị từ chối → (Kế toán sửa) → Chờ phê duyệt
```

**Success criteria:** Kế toán tạo → gửi duyệt; GĐĐH duyệt → hộ auto "Đã chi trả"; CBCQ nhập ngày bàn giao → hộ "Đã bàn giao mặt bằng".

---

## 4. Data Model (Core — MVP)

```sql
-- Xem MVP-scope.md §5 để biết đầy đủ field
user (id, username, password_hash, full_name, role, active)

workflow_template (id, name, version)
workflow_node (id, template_id, parent_id, level, order, code, name,
               planned_days, is_milestone, per_household,
               field_so_vb, field_ngay_vb, field_loai_vb,
               field_gia_tri_trinh, field_gia_tri_duyet,
               field_ghi_chu, require_scan)

ho_so_gpmb (id, code, name, dia_chi, cbcq_id, ngay_bd, ngay_kt, status)
ho_so_workflow_node (id, ho_so_id, ...snapshot fields từ workflow_node)

ho (id, ho_so_id, ma_ho, loai_dat, ten_chu_ho, dia_chi, thua, dien_tich, status)
node_household_scope (ho_so_id, node_id, ho_id)

task_instance (id, ho_so_id, node_id, ho_id NULLABLE, status,
               so_vb, ngay_vb, loai_vb, gia_tri_trinh, gia_tri_duyet,
               ghi_chu, file_scan_url, completed_at,
               UNIQUE(ho_so_id, node_id, ho_id))

ho_so_chi_tra (id, ma_hsct, ho_so_id, ho_id,
               so_tien_bt, so_tien_ht, so_tien_tdc, tong_de_nghi,
               noi_dung, ghi_chu, file_chung_tu_url,
               status, ly_do_tu_choi,
               created_by, approved_by, approved_at,
               ngay_ban_giao_mat_bang)
```

---

## 5. Sprint Plan (3 ngày — Solo AI Development)

> **Điều chỉnh từ 4-sprint plan gốc sang 3 ngày:**

### Ngày 1 — Foundation + Auth + Quy trình + Hồ sơ
- Setup project (FE + BE + DB schema + Docker compose)
- UC-00-01/05: Login/logout, JWT, role guard
- UC-03-01/03: CRUD cây node template, custom field toggle
- Seed script: chạy script đọc Excel → insert 110 node vào DB
- UC-01-01/02/03: Danh sách + chi tiết + tạo hồ sơ + snapshot

### Ngày 2 — Hộ + Công việc + Ma trận (⭐ Core)
- UC-02-01/03/06: Danh sách + thêm hộ + Import Excel
- UC-04-11: Gán/gỡ hộ → sinh task instance đệ quy
- UC-04-01/03/04/07: Danh sách task + chi tiết + cập nhật + custom field
- UC-04-12: ⭐⭐ Ma trận pivot + Export Excel

### Ngày 3 — Chi trả + Polish + Seed Demo Data
- UC-06-01/02/03/04/05/06: Full module chi trả
- State transitions hộ (auto triggers)
- Seed demo data: 1 hồ sơ CCN Hữu Bằng, 4 user, 354 hộ mẫu
- Bug fix + smoke test kịch bản demo 20 phút
- Deploy (nếu cần)

---

## 6. Out of Scope (MVP)

| Tính năng | Hoãn đến |
|---|---|
| Import Excel quy trình (UC-03-02) | Sprint 5 |
| Sửa/Xoá hồ sơ GPMB | Sprint 5 |
| Sửa/Xoá hộ | Sprint 5 |
| Audit log | Sprint 6 |
| In-app notification | Sprint 6 |
| Dashboard (UC-08-*) | Sprint 7 |
| Báo cáo (UC-07-*) | Sprint 6 |
| Kế hoạch tháng (UC-05-*) | Sprint 6 |
| 6 role đầy đủ + ma trận phân quyền | Sprint 5 |
| Refresh hồ sơ chi trả đã duyệt | Sprint 6 |
| Multi-attachment | Sprint 5 |
| Tích hợp ngân hàng | Out of scope dài hạn |

---

## 7. Business Rules (MVP)

| Mã | Rule |
|---|---|
| BR-TASK-01 | Node cha `per_household=true` → tất cả node con phải `per_household=true` |
| BR-TASK-02 | Snapshot template khi tạo hồ sơ — không sync khi template thay đổi |
| BR-TASK-03 | Task cha auto Hoàn thành khi tất cả task con (cùng ho_id scope) Hoàn thành |
| BR-TASK-04 | Task lá Hoàn thành → cập nhật X/Y rollup lên cha đệ quy |
| BR-HO-01 | Hộ "Mới → Đang xử lý": trigger khi task instance đầu tiên của hộ Hoàn thành |
| BR-HO-02 | Hộ "Đã thống nhất → Đã chi trả": trigger khi hồ sơ chi trả của hộ "Đã phê duyệt" |
| BR-HO-03 | Hộ "Đã chi trả → Đã bàn giao": CBCQ nhập ngày bàn giao (UC-06-06) |
| BR-HSCT-01 | 1 hộ tối đa 1 hồ sơ chi trả active (active ≠ Bị từ chối) |
| BR-HSCT-02 | MVP: không có Refresh hồ sơ đã duyệt. State machine 1 chiều. |
| BR-AUTH-01 | JWT; role check trên mọi API endpoint; FE ẩn nút theo role |

---

## 8. Open Questions (Blockers trước khi implement)

> ❗ Các điểm sau cần user xác nhận TRƯỚC khi bắt đầu scaffold code.

| # | Câu hỏi | Tác động | Mức độ |
|---|---|---|---|
| **Q1** | **Tech stack?** FE: React/Next.js/Vue? BE: Node.js (Express/Fastify)/Python (FastAPI)/Java? DB: PostgreSQL/MySQL? | Không thể scaffold code nếu chưa biết | 🔴 BLOCKER |
| **Q2** | **File `Quy trinh GPMB (1).xlsx`** (110 node) có sẵn trong project không? Cần upload để viết seed script. | Không thể seed cây quy trình cho demo | 🔴 BLOCKER |
| **Q3** | **File mẫu Excel pivot (sheet 2)** — format cụ thể của cột/hàng export? File khách cung cấp ở đâu? | Không thể viết đúng format export | 🟠 IMPORTANT |
| **Q4** | **File upload** cho demo: lưu local filesystem OK hay cần S3/MinIO? | Ảnh hưởng config storage | 🟡 CAN DEFAULT (local OK) |
| **Q5** | **State machine hộ**: confirm dùng phiên bản MVP-scope.md (5 bước: Mới/Đang xử lý/Đã thống nhất/Đã chi trả/Đã bàn giao) thay cho phiên bản UseCase spec gốc (Đang theo dõi/Có vướng mắc/...)? | Model DB + state transition logic | 🟠 IMPORTANT |
| **Q6** | **Hosting demo**: local machine, Docker, hay VPS (IP/domain)? | CI/CD config, URL hardcode | 🟡 CAN DEFAULT |

---

## 9. Assumptions (đã giả định)

- Template snapshot khi tạo hồ sơ (Phương án A — không sync) ✅
- Hộ active = mọi trạng thái ≠ Bị từ chối ✅
- Seed cứng danh mục (loại đất, loại văn bản) — không có UI quản lý ở MVP ✅
- Demo dùng data mẫu (không có PII thật) ✅

---

*MVP được coi là hoàn thành khi demo 20 phút theo kịch bản §7 của MVP-scope.md chạy không lỗi.*
