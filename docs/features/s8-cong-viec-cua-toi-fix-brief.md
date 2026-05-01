# Feature Brief — S8-F1: Sửa "Công việc của tôi" + Action Buttons

**Ngày tạo:** 2026-05-01  
**Stakeholder:** Cán bộ chuyên quản (CBCQ), Kế toán, GDDH  
**Priority:** 🔴 Must Have (blocker cho demo)  
**Loại:** Bug Fix + Enhancement

---

## 1. Vấn đề hiện tại

### 1a. Tab "Việc của tôi" không load đúng

Trang `/cong-viec` có 2 tab: "Tất cả công việc" và "Việc của tôi".

**Tab "Việc của tôi"** hiện gọi `GET /tasks?my_tasks=true`. Backend lọc theo `HoSoGPMB.cbcq_id == current_user.id` — điều này chỉ trả kết quả cho user có role `cbcq`. Với user có role khác (ke_toan, gddh, admin không phụ trách hồ sơ), tab này trả về **danh sách rỗng** dù họ có công việc cần làm.

**Nguyên nhân gốc:** Không có khái niệm "task được giao cho user cụ thể" ở cấp độ task_instance. "My tasks" hiện tại = tasks trong hồ sơ mà user là CBCQ phụ trách — không phải "task của tôi" theo nghĩa được assign cụ thể.

### 1b. Không có action button để xử lý công việc

Khi mở chi tiết công việc (`TaskDetail` drawer), chỉ có `canEdit = admin || cbcq` mới thấy:
- Switch toggle trạng thái (Hoàn thành / Đang thực hiện)
- Form điền thông tin (số văn bản, ngày, loại VB...)
- Button upload file scan

User có role khác (**ke_toan**, **gddh**) mở task chỉ thấy **trạng thái và tiến độ**, không có action nào để tương tác.

---

## 2. Yêu cầu nghiệp vụ

### UC-10: Phân quyền xử lý công việc theo role

**Bảng phân quyền mong muốn:**

| Role | "Việc của tôi" hiển thị | Action được phép |
|------|------------------------|------------------|
| `admin` | Tất cả tasks (across tất cả hồ sơ) | Xem, sửa trạng thái, upload, điền form |
| `cbcq` | Tasks trong hồ sơ mình phụ trách | Xem, sửa trạng thái, upload, điền form |
| `ke_toan` | Tasks thuộc node quy trình liên quan kế toán (hoặc tất cả tasks để xem) | Xem, điền thông tin tài chính (gia_tri_trinh, gia_tri_duyet), upload scan |
| `gddh` | Tất cả tasks (quan sát) | Chỉ xem, không sửa |

**Quyết định thiết kế PO:**
- Giai đoạn này, `ke_toan` có quyền **xem toàn bộ** công việc (không giới hạn theo hồ sơ) và được **điền các trường tài chính** + **upload file scan** khi task có yêu cầu
- `gddh` xem được toàn bộ, không có nút sửa
- Không implement task-level assignment (quá phức tạp cho sprint này) — xác định quyền theo role

### Yêu cầu cụ thể

**BE:**
1. `GET /tasks?my_tasks=true`:
   - `admin` → trả tất cả tasks
   - `cbcq` → tasks trong hồ sơ mình phụ trách (giữ nguyên)
   - `ke_toan` → tất cả tasks (không giới hạn theo hồ sơ)
   - `gddh` → tất cả tasks

2. Endpoint PATCH status và PATCH fields cần mở rộng quyền:
   - `PATCH /{ho_so_id}/tasks/{task_id}/status` — cho phép thêm `ke_toan` nếu task có `field_gia_tri_trinh` hoặc `require_scan`
   - `PATCH /{ho_so_id}/tasks/{task_id}/fields` — cho phép `ke_toan` sửa `gia_tri_trinh`, `gia_tri_duyet`, `ghi_chu`
   - `POST /{ho_so_id}/tasks/{task_id}/upload` — cho phép `ke_toan`

**FE:**
1. `TaskDetail` — mở rộng `canEdit` logic:
   ```
   canEdit = admin || cbcq
   canFillFinance = ke_toan (cho phép điền gia_tri_trinh, gia_tri_duyet, ghi_chu, upload scan)
   canView = gddh (chỉ xem)
   ```
2. `ViecCuaToiTab` — query vẫn dùng `my_tasks=true`, nhưng BE trả đúng kết quả theo role
3. Hiển thị rõ ràng: nút "Lưu" và Switch toggle chỉ xuất hiện cho user có quyền tương ứng

---

## 3. Success Criteria

- SC-1: `ke_toan` đăng nhập → vào "Việc của tôi" → thấy danh sách tasks (không rỗng)
- SC-2: `ke_toan` mở chi tiết task có `field_gia_tri_trinh` → thấy form điền được, có nút Lưu
- SC-3: `ke_toan` mở chi tiết task có `require_scan` → thấy nút Upload
- SC-4: `gddh` mở chi tiết task → không thấy nút Lưu, Switch toggle bị disabled
- SC-5: `cbcq` vẫn hoạt động đúng như cũ
- SC-6: `admin` vẫn có full access

---

## 4. Out of Scope

- Task-level assignment (gán task cho user cụ thể) — để v2
- Notification khi task được giao — để v2
- Dashboard thống kê công việc theo user — để v2

---

## 5. Files cần sửa (ước tính)

**Backend:**
- `backend/app/api/v1/global_tasks.py` — sửa my_tasks filter logic
- `backend/app/api/v1/task.py` — mở quyền PATCH status/fields/upload cho ke_toan

**Frontend:**
- `frontend/src/components/task/TaskDetail.tsx` — thêm `canFillFinance` role logic
- `frontend/src/app/(dashboard)/cong-viec/page.tsx` — không cần sửa nếu BE trả đúng
