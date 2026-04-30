# Database Design — OPC GPMB

**Generated:** 2026-05-01  
**Source:** `backend/app/db/models.py`  
**Database:** PostgreSQL 15  
**ORM:** SQLAlchemy 2.0 (async, mapped_column style)

---

## Tổng quan

Hệ thống gồm **13 bảng** chia thành 5 nhóm chức năng:

| Nhóm | Bảng |
|------|------|
| Auth & User | `users` |
| Quy trình template | `workflow_templates`, `workflow_nodes` |
| Hồ sơ GPMB & Workflow instance | `ho_so_gpmb`, `ho_so_workflow_nodes` |
| Hộ dân & Task | `ho`, `node_household_scope`, `task_instances` |
| Chi trả & Kế hoạch | `ho_so_chi_tra`, `ke_hoach_thang`, `ke_hoach_thang_item` |
| Hệ thống | `notifications`, `audit_log` |

---

## Enums

```sql
-- Role của user
RoleEnum: admin | cbcq | ke_toan | gddh

-- Trạng thái hồ sơ GPMB
HoSoStatusEnum: chuan_bi | thuc_hien | hoan_thanh

-- Trạng thái hộ dân
HoStatusEnum: moi | dang_xu_ly | da_thong_nhat | da_chi_tra | da_ban_giao

-- Trạng thái task
TaskStatusEnum: dang_thuc_hien | hoan_thanh

-- Trạng thái chi trả
ChiTraStatusEnum: da_tao | cho_phe_duyet | da_phe_duyet | bi_tu_choi | da_ban_giao
```

---

## Chi tiết bảng

### 1. `users`

Tài khoản người dùng trong hệ thống.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `id` | UUID | PK | Auto-generated UUID v4 |
| `username` | VARCHAR(100) | UNIQUE, NOT NULL | Tên đăng nhập |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt hash (passlib) |
| `full_name` | VARCHAR(255) | NOT NULL | Họ tên đầy đủ |
| `role` | ENUM(RoleEnum) | NOT NULL | Vai trò: admin/cbcq/ke_toan/gddh |
| `active` | BOOLEAN | DEFAULT true | Trạng thái tài khoản |
| `created_at` | DATETIME | DEFAULT now | Thời điểm tạo |

**Relationships:**
- `ho_so_list` → nhiều `ho_so_gpmb` (FK: cbcq_id)

**Demo accounts:**
- `admin / Admin@123` — Quản trị viên
- `cbcq / Cbcq@123` — Cán bộ chuyên quản
- `ke_toan / KeToan@123` — Kế toán
- `gddh / Gddh@123` — Giám đốc điều hành

---

### 2. `workflow_templates`

Mẫu quy trình GPMB (có thể có nhiều mẫu nhưng chỉ 1 `is_active` tại một thời điểm).

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `id` | UUID | PK | |
| `name` | VARCHAR(255) | NOT NULL | Tên mẫu quy trình |
| `is_active` | BOOLEAN | DEFAULT true | Chỉ 1 template active được dùng |
| `created_at` | DATETIME | DEFAULT now | |

**Relationships:**
- `nodes` → nhiều `workflow_nodes` (cascade delete)

**Design note:** Hệ thống hiện chỉ hỗ trợ 1 active template. Không có endpoint list tất cả templates. Seed tạo 1 template "Quy trình GPMB chuẩn".

---

### 3. `workflow_nodes`

Cây bước quy trình của một template (cấu trúc cây tự tham chiếu).

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `id` | UUID | PK | |
| `template_id` | UUID | FK → workflow_templates, CASCADE | Template chứa node |
| `parent_id` | UUID | FK → workflow_nodes (self), CASCADE, NULLABLE | Node cha (NULL = root) |
| `code` | VARCHAR(20) | NULLABLE | Mã bước (e.g. "I", "I.1", "I.1.a") |
| `name` | TEXT | NOT NULL | Tên bước |
| `level` | INTEGER | NOT NULL | Cấp độ trong cây (1=root) |
| `order` | INTEGER | DEFAULT 0 | Thứ tự hiển thị trong cùng cấp |
| `planned_days` | INTEGER | NULLABLE | Số ngày kế hoạch |
| `is_milestone` | BOOLEAN | DEFAULT false | Đây là mốc quan trọng? |
| `legal_basis` | TEXT | NULLABLE | Cơ sở pháp lý |
| `org_in_charge` | VARCHAR(255) | NULLABLE | Đơn vị phụ trách |
| `org_coordinate` | VARCHAR(255) | NULLABLE | Đơn vị phối hợp |
| `per_household` | BOOLEAN | DEFAULT false | Task theo từng hộ (vs. toàn hồ sơ) |
| `require_scan` | BOOLEAN | DEFAULT false | Yêu cầu file scan |
| `field_so_vb` | BOOLEAN | DEFAULT false | Bật trường Số văn bản |
| `field_ngay_vb` | BOOLEAN | DEFAULT false | Bật trường Ngày văn bản |
| `field_loai_vb` | BOOLEAN | DEFAULT false | Bật trường Loại văn bản |
| `field_gia_tri_trinh` | BOOLEAN | DEFAULT false | Bật trường Giá trị trình |
| `field_gia_tri_duyet` | BOOLEAN | DEFAULT false | Bật trường Giá trị duyệt |
| `field_ghi_chu` | BOOLEAN | DEFAULT false | Bật trường Ghi chú |

**Design note:** `field_*` columns là cấu hình custom field — bước nào cần ghi gì được định nghĩa ở template, không phải hardcode trong task form.

---

### 4. `ho_so_gpmb`

Hồ sơ giải phóng mặt bằng — thực thể trung tâm của hệ thống.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `id` | UUID | PK | |
| `code` | VARCHAR(50) | UNIQUE, NOT NULL | Mã hồ sơ (e.g. "HB001") |
| `name` | VARCHAR(255) | NOT NULL | Tên dự án/công trình |
| `dia_chi` | TEXT | NULLABLE | Địa chỉ |
| `status` | ENUM(HoSoStatusEnum) | NOT NULL, DEFAULT chuan_bi | Trạng thái hồ sơ |
| `cbcq_id` | UUID | FK → users (SET NULL), NULLABLE | Cán bộ chuyên quản phụ trách |
| `template_id` | UUID | FK → workflow_templates (SET NULL), NULLABLE | Quy trình đang áp dụng |
| `ngay_bat_dau` | DATE | NULLABLE | Ngày bắt đầu |
| `ngay_ket_thuc` | DATE | NULLABLE | Ngày kết thúc kế hoạch |
| `created_by` | UUID | FK → users (SET NULL), NULLABLE | Người tạo hồ sơ |
| `created_at` | DATETIME | DEFAULT now | |
| `updated_at` | DATETIME | DEFAULT now, auto-update | |
| `deleted_at` | DATETIME | NULLABLE, DEFAULT null | Soft delete |

**Relationships:**
- `cbcq_user` → `users`
- `workflow_nodes` → nhiều `ho_so_workflow_nodes` (cascade delete)
- `ho_list` → nhiều `ho` (cascade delete)
- `chi_tra_list` → nhiều `ho_so_chi_tra` (cascade delete)

**Design note:** Soft delete qua `deleted_at` — API luôn filter `WHERE deleted_at IS NULL`. Khi gán template, hệ thống snapshot toàn bộ `workflow_nodes` sang `ho_so_workflow_nodes`.

---

### 5. `ho_so_workflow_nodes`

**Snapshot** của `workflow_nodes` cho từng hồ sơ — tách biệt hoàn toàn khỏi template gốc.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `id` | UUID | PK | |
| `ho_so_id` | UUID | FK → ho_so_gpmb, CASCADE | Hồ sơ chứa node này |
| `source_node_id` | UUID | FK → workflow_nodes (SET NULL), NULLABLE | Node gốc trong template (để trace) |
| `parent_id` | UUID | FK → ho_so_workflow_nodes (self), CASCADE, NULLABLE | Node cha trong cùng hồ sơ |
| `code` | VARCHAR(20) | NULLABLE | Copy từ template |
| `name` | TEXT | NOT NULL | Copy từ template |
| `level` | INTEGER | NOT NULL | |
| `order` | INTEGER | DEFAULT 0 | |
| `planned_days` | INTEGER | NULLABLE | |
| `is_milestone` | BOOLEAN | DEFAULT false | |
| `legal_basis` | TEXT | NULLABLE | |
| `org_in_charge` | VARCHAR(255) | NULLABLE | |
| `org_coordinate` | VARCHAR(255) | NULLABLE | |
| `per_household` | BOOLEAN | DEFAULT false | Quyết định task được tạo theo hộ hay theo hồ sơ |
| `require_scan` | BOOLEAN | DEFAULT false | |
| `field_so_vb` | BOOLEAN | DEFAULT false | |
| `field_ngay_vb` | BOOLEAN | DEFAULT false | |
| `field_loai_vb` | BOOLEAN | DEFAULT false | |
| `field_gia_tri_trinh` | BOOLEAN | DEFAULT false | |
| `field_gia_tri_duyet` | BOOLEAN | DEFAULT false | |
| `field_ghi_chu` | BOOLEAN | DEFAULT false | |

**Indexes:**
```sql
ix_ho_so_workflow_nodes_ho_so_id  ON (ho_so_id)
ix_ho_so_workflow_nodes_parent_id ON (parent_id)
```

**Relationships:**
- `task_instances` → nhiều `TaskInstance` (cascade delete)
- `scope_assignments` → nhiều `NodeHouseholdScope` (cascade delete)

**Design note:** Đây là pattern "snapshot on apply" — khi template thay đổi, các hồ sơ đang thực hiện không bị ảnh hưởng. `source_node_id` chỉ để audit/trace, không dùng trong logic nghiệp vụ.

---

### 6. `ho`

Hộ dân trong một hồ sơ GPMB.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `id` | UUID | PK | |
| `ho_so_id` | UUID | FK → ho_so_gpmb, CASCADE | Hồ sơ chứa hộ |
| `ma_ho` | VARCHAR(50) | NOT NULL | Mã hộ (unique trong 1 hồ sơ) |
| `ten_chu_ho` | TEXT | NOT NULL | Tên chủ hộ |
| `dia_chi` | TEXT | NULLABLE | Địa chỉ hộ |
| `loai_dat` | VARCHAR(50) | NULLABLE | Loại đất |
| `thua` | VARCHAR(100) | NULLABLE | Số thửa |
| `dien_tich` | FLOAT | NULLABLE | Diện tích (m²) |
| `status` | ENUM(HoStatusEnum) | NOT NULL, DEFAULT moi | Trạng thái xử lý |
| `created_at` | DATETIME | DEFAULT now | |
| `updated_at` | DATETIME | DEFAULT now, auto-update | |

**Constraints:**
```sql
UNIQUE (ho_so_id, ma_ho)  -- mã hộ duy nhất trong 1 hồ sơ
INDEX ix_ho_ho_so_id ON (ho_so_id)
```

**Trạng thái hộ (lifecycle):**
```
moi → dang_xu_ly → da_thong_nhat → da_chi_tra (auto khi CT approved) → da_ban_giao (auto khi CT bàn giao)
```

---

### 7. `node_household_scope`

Bảng liên kết M-N: hộ nào được gán vào node `per_household`.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `id` | UUID | PK | |
| `workflow_node_id` | UUID | FK → ho_so_workflow_nodes, CASCADE | Node được gán |
| `ho_id` | UUID | FK → ho, CASCADE | Hộ được gán |
| `assigned_at` | DATETIME | DEFAULT now | Thời điểm gán |

**Constraints:**
```sql
UNIQUE (workflow_node_id, ho_id)  -- mỗi hộ chỉ gán 1 lần vào 1 node
```

**Design note:** Khi `per_household = true`, user phải gán hộ vào node trước khi hệ thống tạo `TaskInstance` cho từng hộ. Pivot matrix (Tab Scope) hiển thị ma trận node × hộ dựa trên bảng này.

---

### 8. `task_instances`

Công việc thực tế cần làm trong một hồ sơ.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `id` | UUID | PK | |
| `ho_so_id` | UUID | FK → ho_so_gpmb, CASCADE | Hồ sơ |
| `workflow_node_id` | UUID | FK → ho_so_workflow_nodes, CASCADE | Node quy trình |
| `ho_id` | UUID | FK → ho, CASCADE, NULLABLE | NULL = task cho toàn hồ sơ; có giá trị = task cho 1 hộ cụ thể |
| `status` | ENUM(TaskStatusEnum) | NOT NULL, DEFAULT dang_thuc_hien | |
| `so_vb` | VARCHAR(100) | NULLABLE | Số văn bản (nếu field_so_vb = true) |
| `ngay_vb` | DATETIME | NULLABLE | Ngày văn bản |
| `loai_vb` | VARCHAR(100) | NULLABLE | Loại văn bản |
| `gia_tri_trinh` | FLOAT | NULLABLE | Giá trị trình (VNĐ) |
| `gia_tri_duyet` | FLOAT | NULLABLE | Giá trị duyệt (VNĐ) |
| `ghi_chu` | TEXT | NULLABLE | Ghi chú |
| `scan_file_path` | VARCHAR(500) | NULLABLE | Đường dẫn file scan (server path) |
| `completed_at` | DATETIME | NULLABLE | Thời điểm hoàn thành |
| `created_at` | DATETIME | DEFAULT now | |
| `updated_at` | DATETIME | DEFAULT now, auto-update | |

**Constraints & Indexes:**
```sql
UNIQUE (workflow_node_id, ho_id)               -- per-household task: 1 task/node/hộ
UNIQUE (workflow_node_id) WHERE ho_id IS NULL   -- per-hoSo task: 1 task/node (partial index)
INDEX ix_task_instances_ho_so_id
INDEX ix_task_instances_ho_id
INDEX ix_task_instances_workflow_node_id
```

**Design note:** Partial unique index `uq_task_node_ho_null` là PostgreSQL-specific — đảm bảo node `per_household=false` chỉ có đúng 1 TaskInstance. Không thể replicate trên SQLite.

---

### 9. `ho_so_chi_tra`

Hồ sơ chi trả bồi thường cho một hộ dân trong một hồ sơ GPMB.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `id` | UUID | PK | |
| `ho_so_id` | UUID | FK → ho_so_gpmb, CASCADE | Hồ sơ GPMB |
| `ho_id` | UUID | FK → ho, CASCADE | Hộ dân được chi trả |
| `status` | ENUM(ChiTraStatusEnum) | NOT NULL, DEFAULT da_tao | Trạng thái phê duyệt |
| `so_tien_bt` | FLOAT | NULLABLE | Số tiền bồi thường (VNĐ) |
| `so_tien_ht` | FLOAT | NULLABLE | Số tiền hỗ trợ (VNĐ) |
| `so_tien_tdc` | FLOAT | NULLABLE | Số tiền tái định cư (VNĐ) |
| `ghi_chu` | TEXT | NULLABLE | Ghi chú |
| `ke_toan_id` | UUID | FK → users (SET NULL), NULLABLE | Kế toán lập chi trả |
| `gddh_id` | UUID | FK → users (SET NULL), NULLABLE | GDDH phê duyệt |
| `ly_do_tu_choi` | TEXT | NULLABLE | Lý do từ chối (nếu bị_tu_choi) |
| `ngay_gui_duyet` | DATETIME | NULLABLE | Ngày gửi lên GDDH |
| `ngay_duyet` | DATETIME | NULLABLE | Ngày GDDH duyệt |
| `ngay_ban_giao_mat_bang` | DATETIME | NULLABLE | Ngày bàn giao mặt bằng |
| `created_at` | DATETIME | DEFAULT now | |
| `updated_at` | DATETIME | DEFAULT now, auto-update | |

**Workflow chi trả:**
```
da_tao → cho_phe_duyet (ke_toan gửi) → da_phe_duyet (gddh duyệt) → da_ban_giao
                                      ↘ bi_tu_choi (gddh từ chối) → có thể gửi lại
```

**Side effects khi status thay đổi:**
- `cho_phe_duyet`: gửi Notification cho GDDH
- `da_phe_duyet`: gửi Notification cho ke_toan; cập nhật `ho.status = da_chi_tra`
- `bi_tu_choi`: gửi Notification cho ke_toan
- `da_ban_giao`: cập nhật `ho.status = da_ban_giao`

**Indexes:**
```sql
ix_ho_so_chi_tra_ho_so_id ON (ho_so_id)
```

---

### 10. `ke_hoach_thang`

Kế hoạch công việc theo tháng của một hồ sơ.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `id` | UUID | PK | |
| `ho_so_id` | UUID | FK → ho_so_gpmb, CASCADE | Hồ sơ |
| `thang` | INTEGER | NOT NULL | Tháng (1–12) |
| `nam` | INTEGER | NOT NULL | Năm |
| `created_by` | UUID | FK → users (SET NULL), NULLABLE | Người tạo |
| `created_at` | DATETIME(tz) | DEFAULT now | |
| `da_xuat_bao_cao` | BOOLEAN | DEFAULT false | Đã xuất PDF? |
| `ngay_xuat` | DATETIME(tz) | NULLABLE | Ngày xuất PDF |
| `ghi_chu` | TEXT | NULLABLE | Ghi chú tổng hợp |

**Constraints:**
```sql
UNIQUE (ho_so_id, thang, nam)  -- mỗi tháng chỉ có 1 kế hoạch/hồ sơ
```

**Relationships:**
- `items` → nhiều `KeHoachThangItem` (cascade delete)

---

### 11. `ke_hoach_thang_item`

Từng hạng mục công việc trong kế hoạch tháng.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `id` | UUID | PK | |
| `ke_hoach_thang_id` | UUID | FK → ke_hoach_thang, CASCADE | Kế hoạch tháng chứa item |
| `task_instance_id` | UUID | FK → task_instances (SET NULL), NULLABLE | Task liên kết (có thể null = việc phát sinh) |
| `ten_cong_viec` | TEXT | NOT NULL | Tên công việc |
| `mo_ta` | TEXT | NULLABLE | Mô tả chi tiết |
| `ngay_du_kien` | DATE | NULLABLE | Ngày dự kiến hoàn thành |
| `ghi_chu` | TEXT | NULLABLE | Ghi chú |
| `la_viec_phat_sinh` | BOOLEAN | DEFAULT false | Là việc phát sinh ngoài quy trình? |
| `thu_tu` | INTEGER | DEFAULT 0 | Thứ tự hiển thị |

**Design note:** `task_instance_id = NULL` khi đây là việc phát sinh không có trong workflow. PDF export sẽ in tất cả items trong tháng, kèm status từ task_instance nếu có.

---

### 12. `notifications`

Thông báo trong ứng dụng.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users, CASCADE | Người nhận |
| `title` | VARCHAR(200) | NOT NULL | Tiêu đề thông báo |
| `body` | TEXT | NULLABLE | Nội dung |
| `is_read` | BOOLEAN | DEFAULT false | Đã đọc? |
| `link_url` | VARCHAR(500) | NULLABLE | Đường dẫn khi click vào thông báo |
| `created_at` | DATETIME(tz) | DEFAULT now | |

**Indexes:**
```sql
ix_notifications_user_id_model ON (user_id)
```

**Design note (ADR-Sprint7):** Push notification không dùng WebSocket. FE polling `GET /notifications` mỗi 60 giây. Notification được tạo tự động khi chi trả thay đổi trạng thái (trong `chi_tra.py` — `_create_notification()` helper). Cross-user access trả 404 (not 403) để ẩn thông tin.

---

### 13. `audit_log`

Lịch sử thao tác trên các entity chính.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `id` | UUID | PK | |
| `entity_type` | VARCHAR(50) | NOT NULL | Loại entity (e.g. "ho_so", "chi_tra") |
| `entity_id` | UUID | NOT NULL | ID của entity |
| `action` | VARCHAR(50) | NOT NULL | Hành động (e.g. "create", "approve", "reject") |
| `actor_id` | UUID | FK → users (SET NULL), NULLABLE | Người thực hiện |
| `actor_name` | VARCHAR(200) | NULLABLE | Tên người thực hiện (denormalized) |
| `note` | TEXT | NULLABLE | Ghi chú bổ sung |
| `created_at` | DATETIME | DEFAULT now | |

**Indexes:**
```sql
idx_audit_log_entity ON (entity_type, entity_id)
```

**Design note:** `actor_name` được lưu denormalize để tránh JOIN khi user bị xóa. Không có FK enforced trên `entity_id` vì entity_type đa dạng.

---

## ERD (Entity Relationship Diagram)

```
users ──────────────────────────────────────────────────────┐
  │ cbcq_id                                                  │ ke_toan_id, gddh_id
  │                                                          │
  ▼                                                          │
ho_so_gpmb ────────────────────────────────────────────── ho_so_chi_tra
  │ template_id                                          │         │
  │                                                      │ ho_id   │ ho_id
  ▼                                                      │         │
workflow_templates                                        │         │
  │                                                      ▼         │
  └──► workflow_nodes (self-ref tree)                   ho ◄───────┘
              │                                          │
              │ (snapshot on apply)                      │
              ▼                                          │
       ho_so_workflow_nodes (self-ref tree)              │
              │                                          │
              ├──► task_instances ◄─────────────────────┘
              │         │
              │         └──► ke_hoach_thang_item
              │                        │
              └──► node_household_scope └──► ke_hoach_thang ──► ho_so_gpmb
                        │
                        └── ho

notifications ──► users
audit_log    ──► users (actor)
```

---

## Cascade Delete Rules

| Bảng bị xóa | Tác động |
|-------------|----------|
| `workflow_templates` | CASCADE: `workflow_nodes` |
| `workflow_nodes` | CASCADE: children nodes (self-ref) |
| `ho_so_gpmb` | CASCADE: `ho_so_workflow_nodes`, `ho`, `ho_so_chi_tra`, `ke_hoach_thang` |
| `ho_so_workflow_nodes` | CASCADE: children nodes, `task_instances`, `node_household_scope` |
| `ho` | CASCADE: `task_instances`, `node_household_scope`, `ho_so_chi_tra` |
| `ke_hoach_thang` | CASCADE: `ke_hoach_thang_item` |
| `users` | SET NULL: `ho_so_gpmb.cbcq_id`, `ho_so_gpmb.created_by`, `ho_so_chi_tra.ke_toan_id`, `ho_so_chi_tra.gddh_id`, `audit_log.actor_id` |

---

## Indexes tổng hợp

| Table | Index | Columns | Type |
|-------|-------|---------|------|
| `ho_so_workflow_nodes` | `ix_ho_so_workflow_nodes_ho_so_id` | (ho_so_id) | BTREE |
| `ho_so_workflow_nodes` | `ix_ho_so_workflow_nodes_parent_id` | (parent_id) | BTREE |
| `ho` | `ix_ho_ho_so_id` | (ho_so_id) | BTREE |
| `task_instances` | `ix_task_instances_ho_so_id` | (ho_so_id) | BTREE |
| `task_instances` | `ix_task_instances_ho_id` | (ho_id) | BTREE |
| `task_instances` | `ix_task_instances_workflow_node_id` | (workflow_node_id) | BTREE |
| `task_instances` | `uq_task_node_ho_null` | (workflow_node_id) WHERE ho_id IS NULL | UNIQUE PARTIAL |
| `ho_so_chi_tra` | `ix_ho_so_chi_tra_ho_so_id` | (ho_so_id) | BTREE |
| `notifications` | `ix_notifications_user_id_model` | (user_id) | BTREE |
| `audit_log` | `idx_audit_log_entity` | (entity_type, entity_id) | BTREE |

---

## Unique Constraints

| Table | Constraint | Columns |
|-------|-----------|---------|
| `users` | implicit | (username) |
| `ho_so_gpmb` | implicit | (code) |
| `ho` | `uq_ho_ho_so_ma` | (ho_so_id, ma_ho) |
| `node_household_scope` | `uq_node_household_scope` | (workflow_node_id, ho_id) |
| `task_instances` | `uq_task_node_ho` | (workflow_node_id, ho_id) |
| `ke_hoach_thang` | `uq_ke_hoach_thang` | (ho_so_id, thang, nam) |

---

## Quyết định thiết kế quan trọng

### 1. Snapshot pattern (workflow_nodes → ho_so_workflow_nodes)

Khi gán template vào hồ sơ, toàn bộ `workflow_nodes` được copy sang `ho_so_workflow_nodes`. Lý do: template có thể thay đổi theo thời gian nhưng không được ảnh hưởng các hồ sơ đang thực hiện. `source_node_id` lưu truy vết về node gốc.

### 2. per_household flag

Node có `per_household = true` → `task_instances` được tạo theo từng hộ (`ho_id` không null). Node có `per_household = false` → 1 task duy nhất cho toàn hồ sơ (`ho_id = null`). Partial unique index đảm bảo constraint này ở DB level.

### 3. Custom fields trên WorkflowNode

Thay vì có EAV (entity-attribute-value) phức tạp, hệ thống dùng `field_*` boolean columns trên node để bật/tắt trường dữ liệu. TaskInstance luôn có đầy đủ các cột (`so_vb`, `ngay_vb`, ...) — nullable columns, chỉ hiện UI field khi node config bật.

### 4. Soft delete chỉ trên ho_so_gpmb

Chỉ `ho_so_gpmb` có `deleted_at` (soft delete). Các entity khác dùng hard delete với cascade. Lý do: hồ sơ GPMB là tài liệu pháp lý cần lưu vết xóa.

### 5. Notifications polling (không WebSocket)

ADR Sprint 7: dùng polling 60s thay vì WebSocket để đơn giản hóa BE. Không cần thêm Redis/message broker. Acceptable với tần suất thông báo thực tế (thấp).
