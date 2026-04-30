# HỆ THỐNG OPC — PHẦN MỀM HỖ TRỢ ĐIỀU HÀNH GIẢI PHÓNG MẶT BẰNG
## TÀI LIỆU USE CASE & ĐẶC TẢ USE CASE

**Phiên bản:** 1.0  
**Ngày:** 26/04/2026  
**Nguồn tham chiếu:** BRD_GPMB (OPC) + QLDAXD_UseCase_Specification (OPA)

---

## MỤC LỤC

1. [Luồng nghiệp vụ tổng thể](#i-luồng-nghiệp-vụ-tổng-thể)
2. [Nguyên tắc chung](#ii-nguyên-tắc-chung)
3. [Danh sách Use Case](#iii-danh-sách-use-case)
4. [Đặc tả chi tiết Use Case](#iv-đặc-tả-chi-tiết-use-case)
5. [Sơ đồ điều hướng](#v-sơ-đồ-điều-hướng)

---

## I. LUỒNG NGHIỆP VỤ TỔNG THỂ

### I.1. Mục tiêu & phạm vi hệ thống

OPC (Odin Project Clearance) là **phần mềm hỗ trợ điều hành Giải phóng mặt bằng (GPMB)**, được xây dựng trên cùng kiến trúc nghiệp vụ với OPA (QLDAXD) nhưng tập trung riêng cho nghiệp vụ GPMB. Hệ thống giải quyết 4 bài toán cốt lõi:

1. **Quản lý Hồ sơ GPMB** — theo dõi toàn bộ vòng đời một hồ sơ GPMB theo dự án.
2. **Quản lý Hộ/Tổ chức bị ảnh hưởng** — đây là điểm khác biệt cốt lõi so với OPA.
3. **Theo dõi tiến độ công việc** theo quy trình GPMB chuẩn (task/subtask/subsubtask), có custom field theo nghiệp vụ GPMB.
4. **Quản lý chi trả BTHTTĐC** (Bồi thường, Hỗ trợ, Tái định cư) với luồng phê duyệt.

**OPC so với OPA:**

| | OPA (QLDAXD) | OPC (GPMB) |
|---|---|---|
| Đối tượng trung tâm | Dự án đầu tư xây dựng | Hồ sơ GPMB |
| Entity đặc thù | Hợp đồng / Nhà thầu | Hộ / Tổ chức bị ảnh hưởng |
| Luồng tài chính | TBCTTT → BC giải ngân | Chi trả BTHTTĐC |
| Báo cáo tổng hợp | BC tổng hợp tháng (GĐĐH) | Báo cáo chi trả BTHTTĐC |
| Chatbot AI | Có | Không (giai đoạn này) |
| Quy trình | Nhiều template | 1 template duy nhất toàn hệ thống |

---

### I.2. Các tác nhân (Actors) và trách nhiệm chính

| Vai trò | Viết tắt | Trách nhiệm chính | Hành động được thực hiện |
|---|---|---|---|
| Cán bộ chuyên quản | CBCQ | Chủ công thực thi nghiệp vụ GPMB. Quản lý hồ sơ, hộ, công việc hằng ngày. | CRUD hồ sơ GPMB, CRUD hộ/tổ chức, cập nhật công việc, lập kế hoạch tháng, import hộ. |
| Kế toán | KT | Quản lý luồng tài chính chi trả BTHTTĐC. | Tạo/sửa/gửi duyệt hồ sơ chi trả BTHTTĐC. |
| Admin | Admin | Quản trị danh mục và tài khoản. | CRUD quy trình GPMB, cấu hình field quy trình, CRUD loại đất, nhân viên, phòng ban, tài khoản. |
| Quản lý phòng ban | QLPB | Giám sát công việc và hồ sơ. | Xem hồ sơ/công việc; nhận xét. |
| Ban lãnh đạo | BLĐ | Giám sát toàn cục, xem báo cáo tổng quan. | Xem dashboard, nhận xét hồ sơ/công việc, xuất báo cáo. |
| Giám đốc điều hành | GĐĐH | Phê duyệt chi trả BTHTTĐC; xem dashboard. | Duyệt/Từ chối/Refresh hồ sơ chi trả. Xem dashboard. |

---

### I.3. Vòng đời của một Hồ sơ GPMB

```
[Chuẩn bị] ──► [Thực hiện] ──► [Kết thúc]
```

| Giai đoạn | Hoạt động chính | Role thao tác | Điểm chuyển giai đoạn |
|---|---|---|---|
| **Chuẩn bị** | Khởi tạo hồ sơ, gán quy trình, nhập danh sách hộ ban đầu. | CBCQ (tạo, sửa, nhập liệu); Admin (danh mục); BLĐ/GĐĐH (xem, nhận xét) | *(cần xác nhận: thủ công hay điều kiện?)* |
| **Thực hiện** | Thực thi task theo quy trình, cập nhật tiến độ, quản lý hộ, chi trả BTHTTĐC. | CBCQ (cập nhật công việc, hộ); Kế toán (chi trả); GĐĐH (phê duyệt); QLPB/BLĐ (nhận xét, giám sát) | *(cần xác nhận)* |
| **Kết thúc** | Tổng kết, xuất báo cáo, lưu trữ. | CBCQ (xem, xuất); BLĐ/GĐĐH (xuất báo cáo) | Kết thúc vòng đời |

> ⚠️ **Lưu ý:** Các action ghi/sửa chỉ mở khi hồ sơ ở **Chuẩn bị** hoặc **Thực hiện**. Hồ sơ **Kết thúc** chỉ cho Xem và Xuất báo cáo.

---

### I.4. Các luồng nghiệp vụ chính (End-to-End)

#### F1 — Khởi tạo hồ sơ GPMB & gán quy trình

**Mục tiêu:** Đưa một hồ sơ GPMB vào hệ thống với đầy đủ metadata và cây task.

**Role tham gia:** Admin (chuẩn bị danh mục) → CBCQ (tạo hồ sơ)

**Các bước:**
1. Admin đảm bảo danh mục Loại đất, Nhân viên, Phòng ban, Đơn vị phát hành, Quy trình GPMB đã có.
2. Admin có thể Import quy trình từ Excel (1 template duy nhất).
3. CBCQ tạo hồ sơ GPMB mới, nhập metadata.
4. Hệ thống tự động gán quy trình GPMB chuẩn và sinh cây task/subtask/subsubtask.
5. Hồ sơ ở trạng thái **Chuẩn bị**.

**UC liên quan:** UC-09-01, UC-09-03 → UC-01-03

---

#### F2 — Quản lý hộ/tổ chức bị ảnh hưởng

**Mục tiêu:** Theo dõi toàn bộ hộ/tổ chức bị ảnh hưởng, cập nhật tiến độ bàn giao.

**Role tham gia:** CBCQ (CRUD), Kế toán (xem, tạo chi trả), Cấp trên (xem)

**Các bước:**
1. CBCQ thêm hộ/tổ chức vào hồ sơ GPMB (thủ công hoặc import Excel).
2. CBCQ cập nhật thông tin hộ: thửa đất, diện tích, loại đất, trạng thái, vướng mắc.
3. Khi hộ có vướng mắc: hệ thống cảnh báo, không cho đánh dấu "Đã bàn giao" cho đến khi đóng vướng mắc.
4. Khi hoàn tất: CBCQ cập nhật ngày bàn giao mặt bằng.

**UC liên quan:** UC-02-01 → UC-02-03, UC-02-04, UC-02-05, UC-02-06, UC-02-07

---

#### F3 — Thực thi công việc theo quy trình GPMB

**Mục tiêu:** CBCQ thực thi các task sinh từ quy trình GPMB, cập nhật tình trạng kèm văn bản nghiệp vụ. Cấp trên giám sát và nhận xét.

**Role tham gia:** CBCQ ↔ QLPB / BLĐ / GĐĐH

**Các bước:**
1. CBCQ xem danh sách task của hồ sơ GPMB.
2. Với task lá đã xong: xác nhận hoàn thành → cập nhật trạng thái.
3. Nhập trường custom GPMB: Số VB, Ngày VB, Đơn vị phát hành, Loại VB, Hộ liên quan, File scan đính kèm.
4. Hệ thống tự động tính task cha Hoàn thành khi tất cả task con Hoàn thành.
5. Cấp trên theo dõi, nhận xét công việc. CBCQ xử lý nhận xét.

**UC liên quan:** UC-04-01 → UC-04-03 → UC-04-04 → UC-04-08 (auto); UC-04-05, UC-04-06, UC-04-07 song song; UC-04-09 ↔ UC-04-10

---

#### F4 — Chi trả BTHTTĐC

**Mục tiêu:** Kế toán lập hồ sơ chi trả, GĐĐH phê duyệt, cộng vào tổng đã chi trả.

**Role tham gia:** Kế toán → GĐĐH

**Các bước:**
1. Kế toán tạo hồ sơ chi trả cho một hộ/tổ chức (gắn với hồ sơ GPMB đang Thực hiện).
2. Nhập số tiền bồi thường / hỗ trợ / TĐC, nội dung, chứng từ.
3. Kế toán gửi duyệt → GĐĐH nhận thông báo.
4. GĐĐH duyệt → hồ sơ chi trả cộng vào tổng đã chi trả của hộ.
5. GĐĐH từ chối → Kế toán sửa và gửi lại.
6. GĐĐH Refresh → hồ sơ về trạng thái trước, trừ lũy kế nếu cần.

**UC liên quan:** UC-06-03 → UC-06-04 → UC-06-05

---

### I.5. State Machine tổng hợp

#### 1. Hồ sơ GPMB

| Từ trạng thái | Sang trạng thái | Điều kiện / Action | Role |
|---|---|---|---|
| (mới tạo) | Chuẩn bị | Tạo hồ sơ thành công | CBCQ / Admin |
| Chuẩn bị | Thực hiện | *(cần xác nhận điều kiện)* | CBCQ / Admin |
| Thực hiện | Kết thúc | *(cần xác nhận điều kiện)* | CBCQ / Admin |

#### 2. Hộ / Tổ chức

| Từ trạng thái | Sang trạng thái | Điều kiện / Action | Role |
|---|---|---|---|
| (mới thêm) | Đang theo dõi | Thêm hộ thành công | CBCQ / Admin |
| Đang theo dõi | Có vướng mắc đang mở | CBCQ đánh dấu có vướng mắc | CBCQ |
| Có vướng mắc | Đang theo dõi | Vướng mắc được đóng | CBCQ |
| Đang theo dõi | Đã bàn giao mặt bằng | CBCQ cập nhật ngày bàn giao (khi không có vướng mắc) | CBCQ |
| Đang theo dõi | Ngừng theo dõi | CBCQ đánh dấu ngừng (có điều kiện) | CBCQ / Admin |
| Ngừng theo dõi | Đang theo dõi | Mở lại theo dõi nếu cần | CBCQ / Admin |

#### 3. Công việc (giống OPA, custom field GPMB)

| Từ trạng thái | Sang trạng thái | Điều kiện / Action | Role |
|---|---|---|---|
| Đang thực hiện | Hoàn thành (task lá) | CBCQ xác nhận hoàn thành | CBCQ / Admin |
| Đang thực hiện | Hoàn thành (task cha) | Auto khi tất cả task con Hoàn thành | System |
| Hoàn thành | Đang thực hiện | Thu hồi task con → task cha auto reset | System |

#### 4. Chi trả BTHTTĐC

| Từ trạng thái | Sang trạng thái | Điều kiện / Action | Role |
|---|---|---|---|
| (mới tạo) | Đã tạo | Kế toán tạo hồ sơ | Kế toán |
| Đã tạo | Chờ phê duyệt | Kế toán gửi duyệt | Kế toán |
| Chờ phê duyệt | Đã phê duyệt | GĐĐH duyệt → cộng vào tổng đã chi trả | GĐĐH |
| Chờ phê duyệt | Bị từ chối | GĐĐH từ chối kèm lý do | GĐĐH |
| Bị từ chối | Chờ phê duyệt | Kế toán sửa và gửi lại | Kế toán |
| Đã phê duyệt | Đã tạo | GĐĐH Refresh → trừ lũy kế | GĐĐH |

---

## II. NGUYÊN TẮC CHUNG

### II.1. Quy tắc Import Excel (dùng chung)

Mọi màn hình có Import Excel đều tuân theo:

1. **Tải file mẫu** — người dùng tải file `.xlsx` chuẩn từ hệ thống.
2. **Kiểm tra định dạng** — hệ thống kiểm tra đúng template (phần mở rộng, số cột, tên cột, kiểu dữ liệu).
3. **Trả lý do sai rõ ràng** — không báo chung chung; phải nêu cụ thể: `"Thiếu cột [Tên bước] ở hàng tiêu đề"`, `"Dòng 5 – cột Giá trị: phải là số"`.
4. **Preview trước khi import** — bảng 2 phần: dòng hợp lệ (sẽ import) và dòng lỗi (kèm lý do).
5. **Tải toàn bộ dữ liệu đã cập nhật** — sau khi import thành công, hệ thống cho phép tải file Excel phản ánh trạng thái mới nhất.

> ⚠️ **Áp dụng cho Quy trình GPMB:** Bắt buộc có nút "Tải toàn bộ quy trình" sau khi upload hoặc chỉnh sửa. File tải về phản ánh đúng cây task/subtask/subsubtask hiện tại.

---

### II.2. Quy tắc Quy trình GPMB (1 template duy nhất)

- OPC chỉ có **1 template quy trình duy nhất** cho toàn hệ thống (khác OPA có nhiều template).
- Admin CRUD cây task. Template được áp dụng tự động khi tạo hồ sơ GPMB mới.
- Cấu trúc: **task (cấp 1) / subtask (cấp 2) / subsubtask (cấp 3)**.
- Admin có thể cấu hình bật/tắt custom field theo từng node.
- ⚠️ **Điểm cần xác nhận:** Khi Admin cập nhật template, các hồ sơ đang thực hiện có bị ảnh hưởng không?

---

### II.3. Quy tắc tiến độ công việc theo cây task

Kế thừa từ OPA, áp dụng cho OPC:

- **Task lá (subsubtask):** chỉ có 2 trạng thái — `Đang thực hiện` / `Hoàn thành`. **Không nhập % tiến độ.**
- **Task cha:** hiển thị `X/Y` (số task con Hoàn thành / tổng task con).
- **Auto hoàn thành task cha:** tất cả task con Hoàn thành → task cha auto Hoàn thành. Quy tắc lan truyền đệ quy lên cấp cao hơn.
- **Reversibility:** thu hồi task con → hệ thống tự reset task cha về `Đang thực hiện`.

---

### II.4. Custom field GPMB trên công việc

Admin có thể bật/tắt các trường sau theo **từng node** trong quy trình:

| Field | Loại | Ghi chú |
|---|---|---|
| Số văn bản | Text | |
| Ngày văn bản | Date | |
| Đơn vị phát hành | Lookup (danh mục) | |
| Loại văn bản | Enum: Thông báo / Quyết định / Biên bản / Tờ trình / Khác | |
| Hộ liên quan | Lookup multi (hộ trong hồ sơ) | Có thể chọn nhiều hộ |
| File scan đính kèm | File upload | Bật/tắt bắt buộc lưu scan (Y/N) |

---

### II.5. Nguyên tắc chung xuyên suốt

| Nguyên tắc | Nội dung |
|---|---|
| **Phân quyền theo vai trò** | Action bị ẩn/disabled khi user không có quyền. |
| **Action theo trạng thái** | Mọi UC kiểm tra trạng thái hiện tại trước khi cho phép thao tác. |
| **Phạm vi dữ liệu** | Tất cả vai trò thấy toàn bộ dữ liệu hệ thống. Ngoại lệ duy nhất: màn "Công việc cần làm của tôi" của CBCQ filter theo công việc được phân công. |
| **Thông báo** | Mọi thay đổi trạng thái quan trọng (duyệt, từ chối, refresh, nhận xét) gửi thông báo in-app đến các bên liên quan (UC-00-04). |
| **Ràng buộc xóa** | Không xóa cứng đối tượng đã phát sinh dữ liệu tài chính (hộ đã có hồ sơ chi trả được duyệt, v.v.). |
| **Audit log** | Mọi thao tác Create/Update/Delete/Approve/Reject ghi log (ai, khi nào, từ giá trị nào → giá trị nào). |
| **Hiệu năng** | 30 người dùng đồng thời ổn định. < 3s cho list, < 5s cho báo cáo. |

---

## III. DANH SÁCH USE CASE

| STT | Mã UC | Tên Use Case | Tác nhân chính | Module |
|---|---|---|---|---|
| 1 | UC-00-01 | Đăng nhập hệ thống | Tất cả vai trò | Đăng nhập & Thông tin cá nhân |
| 2 | UC-00-02 | Xem & cập nhật thông tin cá nhân | Tất cả vai trò | Đăng nhập & Thông tin cá nhân |
| 3 | UC-00-03 | Đổi mật khẩu | Tất cả vai trò | Đăng nhập & Thông tin cá nhân |
| 4 | UC-00-04 | Xem thông báo hệ thống | Tất cả vai trò | Đăng nhập & Thông tin cá nhân |
| 5 | UC-00-05 | Đăng xuất | Tất cả vai trò | Đăng nhập & Thông tin cá nhân |
| 6 | UC-01-01 | Xem danh sách hồ sơ GPMB | Tất cả vai trò | Hồ sơ GPMB |
| 7 | UC-01-02 | Xem chi tiết hồ sơ GPMB | Tất cả vai trò | Hồ sơ GPMB |
| 8 | UC-01-03 | Tạo mới hồ sơ GPMB | CBCQ, Admin | Hồ sơ GPMB |
| 9 | UC-01-04 | Chỉnh sửa hồ sơ GPMB | CBCQ, Admin | Hồ sơ GPMB |
| 10 | UC-01-05 | Xóa hồ sơ GPMB | CBCQ, Admin | Hồ sơ GPMB |
| 11 | UC-01-06 | Nhận xét hồ sơ GPMB (cấp trên) | QLPB, BLĐ, GĐĐH | Hồ sơ GPMB |
| 12 | UC-01-07 | Xử lý nhận xét hồ sơ GPMB (CBCQ) | CBCQ, Admin | Hồ sơ GPMB |
| 13 | UC-02-01 | Xem danh sách hộ/tổ chức | Tất cả vai trò | Hộ / Tổ chức |
| 14 | UC-02-02 | Xem chi tiết hộ/tổ chức | Tất cả vai trò | Hộ / Tổ chức |
| 15 | UC-02-03 | Thêm mới hộ/tổ chức | CBCQ, Admin | Hộ / Tổ chức |
| 16 | UC-02-04 | Chỉnh sửa hộ/tổ chức | CBCQ, Admin | Hộ / Tổ chức |
| 17 | UC-02-05 | Xóa / Ngừng theo dõi hộ/tổ chức | CBCQ, Admin | Hộ / Tổ chức |
| 18 | UC-02-06 | Import danh sách hộ từ Excel | CBCQ, Admin | Hộ / Tổ chức |
| 19 | UC-02-07 | Export danh sách hộ ra Excel | CBCQ, Admin, QLPB | Hộ / Tổ chức |
| 20 | UC-03-01 | Quản lý quy trình GPMB chuẩn | Admin (CRUD), QLPB/BLĐ/GĐĐH (Xem) | Quy trình GPMB |
| 21 | UC-03-02 | Import quy trình từ Excel | Admin | Quy trình GPMB |
| 22 | UC-03-03 | Cấu hình trường thông tin bước quy trình | Admin | Quy trình GPMB |
| 23 | UC-04-01 | Xem danh sách công việc (toàn hệ thống) | Tất cả vai trò | Quản lý Công việc |
| 24 | UC-04-02 | Xem danh sách công việc cần làm của tôi | CBCQ | Quản lý Công việc |
| 25 | UC-04-03 | Xem chi tiết công việc | Tất cả vai trò | Quản lý Công việc |
| 26 | UC-04-04 | Cập nhật trạng thái công việc (task lá) | CBCQ, Admin | Quản lý Công việc |
| 27 | UC-04-05 | Nhập khó khăn & giải pháp | CBCQ, Admin | Quản lý Công việc |
| 28 | UC-04-06 | Nhập tình trạng xử lý | CBCQ, Admin | Quản lý Công việc |
| 29 | UC-04-07 | Nhập trường custom GPMB & đính kèm scan | CBCQ, Admin | Quản lý Công việc |
| 30 | UC-04-08 | Xác nhận hoàn thành công việc (task cha — tự động) | System | Quản lý Công việc |
| 31 | UC-04-09 | Nhận xét công việc (cấp trên) | QLPB, BLĐ, GĐĐH | Quản lý Công việc |
| 32 | UC-04-10 | Xử lý nhận xét công việc (CBCQ) | CBCQ, Admin | Quản lý Công việc |
| 33 | UC-05-01 | Xem danh sách kế hoạch tháng | CBCQ, QLPB, BLĐ, GĐĐH, Kế toán | Kế hoạch tháng |
| 34 | UC-05-02 | Chỉnh sửa kế hoạch tháng & thêm việc phát sinh | CBCQ | Kế hoạch tháng |
| 35 | UC-05-03 | Xuất báo cáo công việc tháng | CBCQ, QLPB, BLĐ, GĐĐH, Kế toán | Kế hoạch tháng |
| 36 | UC-06-01 | Xem danh sách hồ sơ chi trả BTHTTĐC | Tất cả vai trò | Chi trả BTHTTĐC |
| 37 | UC-06-02 | Xem chi tiết hồ sơ chi trả BTHTTĐC | Tất cả vai trò | Chi trả BTHTTĐC |
| 38 | UC-06-03 | Tạo mới / Chỉnh sửa hồ sơ chi trả BTHTTĐC | Kế toán | Chi trả BTHTTĐC |
| 39 | UC-06-04 | Gửi duyệt hồ sơ chi trả BTHTTĐC | Kế toán | Chi trả BTHTTĐC |
| 40 | UC-06-05 | Duyệt / Từ chối / Refresh hồ sơ chi trả (GĐĐH) | GĐĐH | Chi trả BTHTTĐC |
| 41 | UC-06-06 | Cập nhật ngày bàn giao mặt bằng | CBCQ, Admin | Chi trả BTHTTĐC |
| 42 | UC-07-01 | Báo cáo chi trả BTHTTĐC | Tất cả vai trò | Báo cáo / Export |
| 43 | UC-08-01 | Xem Dashboard tổng quan GPMB | BLĐ, GĐĐH | Dashboard |
| 44 | UC-09-01 | Quản lý loại đất (Admin) | Admin | Danh mục |
| 45 | UC-09-02 | Quản lý đơn vị phát hành (Admin) | Admin | Danh mục |
| 46 | UC-09-03 | Quản lý nhân viên (Admin) | Admin (CRUD), QLPB/BLĐ/GĐĐH (Xem) | Danh mục |
| 47 | UC-09-04 | Quản lý phòng ban (Admin) | Admin | Danh mục |
| 48 | UC-09-05 | Quản lý tài khoản (Admin) | Admin | Danh mục |

---

## IV. ĐẶC TẢ CHI TIẾT USE CASE THEO MODULE

---

### 1. Module Đăng nhập & Thông tin cá nhân

#### UC-00-01 — Đăng nhập hệ thống

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-00-01 |
| **Tên UC** | Đăng nhập hệ thống |
| **Tác nhân chính** | Tất cả vai trò |
| **Mô tả** | Người dùng nhập thông tin xác thực để truy cập OPC. |
| **Điều kiện tiên quyết** | Tài khoản đã được Admin tạo và chưa bị khóa. |
| **Điều kiện sau** | Phiên làm việc được tạo, chuyển màn hình chính theo vai trò. |

**Luồng chính:**
1. Người dùng mở trang Đăng nhập.
2. Nhập Tên đăng nhập và Mật khẩu.
3. Nhấn "Đăng nhập".
4. Hệ thống xác thực tài khoản và kiểm tra số thiết bị đang đăng nhập.
5. Nếu hợp lệ → chuyển đến màn hình chính theo vai trò.

**Luồng thay thế / ngoại lệ:**
- Sai thông tin: hiển thị thông báo lỗi.
- Tài khoản bị khóa: chặn đăng nhập, hiển thị thông báo.
- Vượt quá số thiết bị: cảnh báo và yêu cầu đăng xuất thiết bị khác.

**Trường dữ liệu:**
- Tên đăng nhập (text, bắt buộc)
- Mật khẩu (password, bắt buộc)
- [Config hệ thống] Số thiết bị đồng thời tối đa (int, mặc định 1)

**Liên kết UC:** UC-00-05

---

#### UC-00-02 — Xem & cập nhật thông tin cá nhân

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-00-02 |
| **Tác nhân chính** | Tất cả vai trò |
| **Mô tả** | Người dùng xem và chỉnh sửa thông tin cá nhân. |
| **Điều kiện tiên quyết** | Đã đăng nhập. |

**Luồng chính:**
1. Vào Hồ sơ cá nhân.
2. Tab "Thông tin cá nhân": xem/sửa; Tab "Thông tin tài khoản": chỉ xem.
3. Cập nhật các trường cho phép → Lưu.

**Trường dữ liệu:**
- Họ và tên (bắt buộc), Email (bắt buộc), Số điện thoại (bắt buộc)
- Giới tính (select: Nam/Nữ/Khác), Ngày sinh
- Tỉnh/Thành phố (select), Xã/Phường (select theo tỉnh), Địa chỉ chi tiết

**Liên kết UC:** UC-00-03

---

#### UC-00-03 — Đổi mật khẩu

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-00-03 |
| **Tác nhân chính** | Tất cả vai trò |
| **Điều kiện tiên quyết** | Đã đăng nhập. |

**Luồng chính:** Vào Hồ sơ cá nhân → Tab Đổi mật khẩu → Nhập MK cũ, MK mới, xác nhận MK mới → Lưu.

**Luồng ngoại lệ:** MK cũ sai / xác nhận không khớp / MK mới không đủ mạnh (< 6 ký tự, cần chữ + số) → lỗi từng trường.

**Trường dữ liệu:** Mật khẩu cũ, Mật khẩu mới (≥ 6 ký tự, gồm chữ và số), Xác nhận mật khẩu mới.

---

#### UC-00-04 — Xem thông báo hệ thống

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-00-04 |
| **Tác nhân chính** | Tất cả vai trò |
| **Mô tả** | Xem thông báo được gửi từ hệ thống khi có thay đổi trạng thái quan trọng. |
| **Điều kiện tiên quyết** | Đã đăng nhập. |

**Trigger thông báo (gửi in-app):**
- Hồ sơ chi trả được duyệt / từ chối / refresh
- Nhận xét mới trên hồ sơ GPMB hoặc công việc
- Task cao nhất của hồ sơ hoàn thành

**Luồng chính:** Nhấn icon Thông báo → xem danh sách theo thời gian → nhấn thông báo → chuyển đến đối tượng liên quan → đánh dấu đã đọc.

**Trường dữ liệu:** Loại thông báo (enum), Nội dung (text), Thời gian tạo (datetime), Trạng thái đọc (boolean), Link đối tượng.

---

#### UC-00-05 — Đăng xuất

**Luồng chính:** Vào Hồ sơ cá nhân → Chọn Đăng xuất → Xác nhận → Kết thúc phiên.

---

### 2. Module Hồ sơ GPMB

#### UC-01-01 — Xem danh sách hồ sơ GPMB

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-01-01 |
| **Tác nhân chính** | CBCQ, Admin, QLPB, BLĐ, GĐĐH, Kế toán |
| **Mô tả** | Xem danh sách tất cả hồ sơ GPMB với bộ lọc và tìm kiếm. |
| **Điều kiện tiên quyết** | Đã đăng nhập. |

**Luồng chính:**
1. Vào menu Hồ sơ GPMB → Danh sách.
2. Hệ thống hiển thị bảng danh sách.
3. Lọc theo trạng thái, địa điểm (xã/phường), CBCQ phụ trách, khoảng ngày tạo.
4. Tìm kiếm theo Mã hồ sơ, Tên công trình.

**Trường dữ liệu hiển thị:**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| Mã hồ sơ | Text | Auto sinh |
| Tên công trình | Text | |
| Loại công trình | Text/Enum | *(cần xác nhận enum)* |
| Địa điểm (xã/phường) | Text | |
| CBCQ phụ trách | Text | |
| Trạng thái | Enum | Chuẩn bị / Thực hiện / Kết thúc |
| Số hộ | Int | Tổng số hộ trong hồ sơ |
| % bàn giao | Số | Số hộ đã BG / tổng số hộ *(cần xác nhận công thức)* |
| Ngày tạo | Date | |
| Thao tác | Action | Xem / Sửa (theo quyền) |

**Liên kết UC:** UC-01-02, UC-01-03

---

#### UC-01-02 — Xem chi tiết hồ sơ GPMB

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-01-02 |
| **Tác nhân chính** | Tất cả vai trò |
| **Mô tả** | Xem chi tiết hồ sơ GPMB qua các tab chức năng. |
| **Điều kiện tiên quyết** | Hồ sơ GPMB tồn tại. |

**Luồng chính:**
1. Nhấn vào tên hồ sơ từ danh sách.
2. Hệ thống hiển thị trang chi tiết với các tab:
   - **Tab Thông tin chung:** metadata hồ sơ.
   - **Tab Quy trình GPMB:** cây task/subtask/subsubtask kèm tiến độ X/Y.
   - **Tab Hộ/Tổ chức:** danh sách hộ trong hồ sơ (UC-02-01).
   - **Tab Công việc:** danh sách công việc của hồ sơ (UC-04-01 filter theo hồ sơ).
   - **Tab Chi trả BTHTTĐC:** danh sách hồ sơ chi trả (UC-06-01 filter).
   - **Tab Báo cáo/Export:** xuất báo cáo, export dữ liệu.
   - **Tab Nhận xét:** lịch sử nhận xét của cấp trên và phản hồi CBCQ.
3. Người dùng chuyển tab để xem. Action hiển thị theo role.

**Trường dữ liệu — Tab Thông tin chung:**
- Mã hồ sơ (auto), Tên công trình, Loại công trình, Địa điểm (xã/phường/thôn)
- Chủ đầu tư, CBCQ phụ trách, Lãnh đạo phụ trách
- Quy mô dự án, Tổng diện tích thu hồi dự kiến (m²), Số hộ dự kiến
- Ngày bắt đầu, Ngày kết thúc dự kiến, Trạng thái, Mô tả/Ghi chú

**Liên kết UC:** UC-01-04, UC-02-01, UC-04-01, UC-06-01, UC-01-06

---

#### UC-01-03 — Tạo mới hồ sơ GPMB

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-01-03 |
| **Tác nhân chính** | CBCQ, Admin |
| **Mô tả** | Tạo mới hồ sơ GPMB. Hệ thống tự gán quy trình chuẩn và sinh cây task. |
| **Điều kiện tiên quyết** | Đã đăng nhập CBCQ/Admin. Quy trình GPMB chuẩn đã được Admin cấu hình. |

**Luồng chính:**
1. Nhấn "Thêm hồ sơ GPMB".
2. Điền form (các trường bắt buộc đánh dấu *).
3. Nhấn "Lưu".
4. Hệ thống tạo hồ sơ với trạng thái **Chuẩn bị**, tự gán quy trình GPMB chuẩn, sinh cây task/subtask/subsubtask tương ứng.
5. Hiển thị popup thành công → chuyển sang chi tiết hồ sơ.

**Luồng thay thế / ngoại lệ:**
- Thiếu trường bắt buộc: lỗi từng trường.
- Quy trình GPMB chuẩn chưa có: Admin cần tạo quy trình trước.

**Trường dữ liệu:**

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| Tên công trình | Text | ✅ | |
| Mã hồ sơ | Text | Auto | Hệ thống tự sinh |
| Loại công trình | Enum/Text | | *(cần xác nhận enum)* |
| Địa điểm — Tỉnh/TP | Select | ✅ | |
| Địa điểm — Xã/Phường | Select | ✅ | Theo tỉnh/TP |
| Địa điểm — Thôn | Text | | |
| Chủ đầu tư | Text | | |
| CBCQ phụ trách | Select (nhân viên) | ✅ | |
| Lãnh đạo phụ trách | Select (QLPB/BLĐ/GĐĐH) | | |
| Quy mô dự án | Text | | |
| Tổng diện tích thu hồi dự kiến | Số (m²) | | |
| Số hộ dự kiến | Int | | |
| Ngày bắt đầu | Date | | |
| Ngày kết thúc dự kiến | Date | | |
| Mô tả / Ghi chú | Textarea | | |

**Liên kết UC:** UC-01-02, UC-03-01, UC-04-01

---

#### UC-01-04 — Chỉnh sửa hồ sơ GPMB

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-01-04 |
| **Tác nhân chính** | CBCQ, Admin |
| **Điều kiện tiên quyết** | Hồ sơ ở trạng thái **Chuẩn bị** hoặc **Thực hiện**. |

**Luồng chính:** Từ Danh sách hoặc Chi tiết → nhấn "Chỉnh sửa" → cập nhật trường → Lưu.

**Luồng thay thế:** Hồ sơ đã **Kết thúc**: không cho sửa, các trường ở chế độ readonly.

**Trường dữ liệu:** Như UC-01-03 + Trạng thái hồ sơ.

---

#### UC-01-05 — Xóa hồ sơ GPMB

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-01-05 |
| **Tác nhân chính** | CBCQ, Admin |
| **Mô tả** | Xóa hồ sơ GPMB khi chưa phát sinh dữ liệu nghiệp vụ. |
| **Điều kiện tiên quyết** | *(cần xác nhận điều kiện cụ thể — BRD ghi "Xóa có điều kiện")* |

**Luồng chính:** Nhấn "Xóa" → Xác nhận xóa → Hệ thống kiểm tra điều kiện → Xóa thành công.

**Luồng thay thế:** Đã có hộ/tổ chức hoặc hồ sơ chi trả được duyệt → không thể xóa, hiển thị lý do cụ thể.

> ⚠️ **Điểm cần làm rõ (HB-06):** Điều kiện cụ thể để được phép xóa là gì? Gợi ý: chỉ xóa khi ở trạng thái Chuẩn bị và chưa có hộ/tổ chức nào.

---

#### UC-01-06 — Nhận xét hồ sơ GPMB (cấp trên)

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-01-06 |
| **Tác nhân chính** | QLPB, BLĐ, GĐĐH |
| **Mô tả** | Cấp trên thêm nhận xét/góp ý cho hồ sơ GPMB. |
| **Điều kiện tiên quyết** | Đang xem Chi tiết hồ sơ — Tab Nhận xét. |

**Luồng chính:** Vào Tab Nhận xét → Nhập nội dung → Gửi → Nhận xét lưu, CBCQ nhận thông báo.

**Trường dữ liệu:** Nội dung nhận xét (bắt buộc), Người nhận xét (auto), Thời gian (auto).

**Liên kết UC:** UC-01-07

---

#### UC-01-07 — Xử lý nhận xét hồ sơ GPMB (CBCQ)

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-01-07 |
| **Tác nhân chính** | CBCQ, Admin |
| **Điều kiện tiên quyết** | Có nhận xét chưa xử lý. |

**Luồng chính:** Mở Tab Nhận xét → Nhấn "Xác nhận" hoặc "Từ chối" kèm ghi chú → Trạng thái nhận xét được cập nhật.

**Trường dữ liệu:** Nội dung nhận xét (readonly), Trạng thái xử lý (Chờ / Đã xác nhận / Đã từ chối), Ghi chú xử lý.

---

### 3. Module Hộ / Tổ chức

#### UC-02-01 — Xem danh sách hộ/tổ chức

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-02-01 |
| **Tác nhân chính** | Tất cả vai trò |
| **Mô tả** | Xem danh sách hộ/tổ chức trong một hồ sơ GPMB. |
| **Điều kiện tiên quyết** | Đang xem Chi tiết hồ sơ GPMB — Tab Hộ/Tổ chức. |

**Luồng chính:**
1. Trong Tab Hộ/Tổ chức của hồ sơ GPMB.
2. Hệ thống hiển thị danh sách.
3. Lọc theo loại đối tượng, trạng thái, có vướng mắc, CBCQ phụ trách.
4. Tìm kiếm theo Mã hộ, Tên chủ hộ.

**Trường dữ liệu hiển thị:**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| Mã hộ/tổ chức | Text | |
| Tên chủ hộ/tổ chức | Text | |
| Loại đối tượng | Enum | Cá nhân / Hộ gia đình / Tổ chức / Khác |
| Địa chỉ | Text | |
| Số điện thoại | Text | |
| Diện tích thu hồi (m²) | Số | |
| Loại đất | Select (danh mục) | |
| Trạng thái tổng quan | Enum | Chưa KK / Đã KK / Đã PA / Đã chi trả / Đã BG |
| Có vướng mắc | Boolean | Cảnh báo nếu có |
| Ngày cập nhật cuối | Date | |
| Thao tác | Action | Xem / Sửa (theo quyền) |

---

#### UC-02-02 — Xem chi tiết hộ/tổ chức

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-02-02 |
| **Tác nhân chính** | Tất cả vai trò |
| **Điều kiện tiên quyết** | Hộ/tổ chức tồn tại trong hồ sơ. |

**Luồng chính:** Nhấn vào hộ từ danh sách → xem chi tiết đầy đủ.

**Trường dữ liệu:**
- Mã hộ/tổ chức, Tên chủ hộ/tổ chức, Loại đối tượng
- Địa chỉ, Số điện thoại, Cán bộ phụ trách
- **Thông tin đất:** Số thửa, Số tờ bản đồ, Diện tích thu hồi (m²), Loại đất, Nguồn gốc đất *(cần xác nhận: enum hay text?)*, Tỷ lệ thu hồi (%)
- **Tài sản:** Tài sản trên đất *(cần xác nhận: text mô tả hay có cấu trúc riêng?)*
- **Trạng thái & tiến độ:** Trạng thái tổng quan, Có vướng mắc, Kết quả thực hiện đến ngày báo cáo, Kế hoạch tiếp tục triển khai, Khó khăn/vướng mắc, Hướng giải quyết
- Ngày cập nhật cuối

---

#### UC-02-03 — Thêm mới hộ/tổ chức

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-02-03 |
| **Tác nhân chính** | CBCQ, Admin |
| **Điều kiện tiên quyết** | Hồ sơ GPMB ở trạng thái **Chuẩn bị** hoặc **Thực hiện**. |

**Luồng chính:**
1. Trong Tab Hộ/Tổ chức → nhấn "Thêm mới".
2. Điền form.
3. Lưu → hộ được thêm với trạng thái "Đang theo dõi".

**Luồng thay thế:** Thiếu trường bắt buộc → lỗi từng trường.

**Trường dữ liệu:** Như UC-02-02 (bỏ Kết quả thực hiện). Mã hộ có thể auto sinh hoặc nhập thủ công *(cần xác nhận)*.

---

#### UC-02-04 — Chỉnh sửa hộ/tổ chức

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-02-04 |
| **Tác nhân chính** | CBCQ, Admin |
| **Điều kiện tiên quyết** | Hộ ở trạng thái **Đang theo dõi** hoặc **Có vướng mắc**. |

**Luồng chính:** Từ chi tiết hộ → "Chỉnh sửa" → cập nhật trường → Lưu.

**Luồng thay thế:**
- Hộ đã **Đã bàn giao mặt bằng**: chỉ cho cập nhật Ghi chú/Hồ sơ bổ sung.
- Hộ **Ngừng theo dõi**: chỉ Xem, không cho sửa.

> ⚠️ **Điểm cần làm rõ (HO-01):** Điều kiện cụ thể nào ngăn chặn sửa hộ? (VD: không cho xóa hộ đã có hồ sơ chi trả duyệt)

---

#### UC-02-05 — Xóa / Ngừng theo dõi hộ/tổ chức

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-02-05 |
| **Tác nhân chính** | CBCQ, Admin |
| **Điều kiện tiên quyết** | *(cần xác nhận điều kiện — BRD ghi "Có điều kiện")* |

**Luồng A — Ngừng theo dõi:**
1. Nhấn "Ngừng theo dõi" → xác nhận → trạng thái hộ chuyển sang "Ngừng theo dõi".
2. Hộ vẫn còn trong danh sách nhưng không active. Có thể mở lại theo dõi nếu cần.

**Luồng B — Xóa (cứng):**
- Chỉ xóa khi hộ chưa phát sinh dữ liệu tài chính.

> ⚠️ **Điểm cần làm rõ (HO-07):** Điều kiện "Ngừng theo dõi" là gì? Có cần approval không?

---

#### UC-02-06 — Import danh sách hộ từ Excel

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-02-06 |
| **Tác nhân chính** | CBCQ, Admin |
| **Mô tả** | Import hàng loạt hộ/tổ chức từ file Excel theo mẫu. |
| **Điều kiện tiên quyết** | Hồ sơ GPMB đang Chuẩn bị hoặc Thực hiện. File mẫu hợp lệ. |

**Luồng chính (tuân theo quy tắc II.1):**
1. Nhấn "Import" → Tải file mẫu nếu cần.
2. Upload file Excel.
3. Hệ thống kiểm tra định dạng (phải đúng template).
4. Validate từng dòng: kiểu dữ liệu, bắt buộc, khóa ngoại (loại đất, CBCQ phụ trách).
5. Nếu lỗi: trả danh sách lỗi chi tiết (dòng, cột, lý do). Người dùng sửa và upload lại.
6. Preview: dòng hợp lệ / dòng lỗi.
7. Xác nhận import → tạo hộ hàng loạt.
8. Nút "Tải toàn bộ dữ liệu" sau khi import thành công.

**Luồng thay thế:**
- File sai định dạng: từ chối, hiển thị lý do cụ thể.
- Duplicate mã hộ: *(cần xác nhận — skip, override, hay lỗi?)* (HO-06)

**Trường dữ liệu:** File import (.xlsx), Kết quả validation (dòng, cột, lý do lỗi), Danh sách hợp lệ/lỗi.

---

#### UC-02-07 — Export danh sách hộ ra Excel

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-02-07 |
| **Tác nhân chính** | CBCQ, Admin, QLPB |
| **Mô tả** | Xuất danh sách hộ/tổ chức đầy đủ thông tin ra file Excel. |

**Luồng chính:**
1. Trong Tab Hộ/Tổ chức → nhấn "Export".
2. Hệ thống validate dữ liệu trước khi export: trả lý do sai cụ thể theo dòng/cột nếu có.
3. Tải file Excel.

---

### 4. Module Quy trình GPMB

#### UC-03-01 — Quản lý quy trình GPMB chuẩn

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-03-01 |
| **Tác nhân chính** | Admin (CRUD/Import); BLĐ, GĐĐH (Xem) |
| **Mô tả** | Admin quản lý 1 template quy trình GPMB duy nhất cho toàn hệ thống. Cấu trúc cây task/subtask/subsubtask. |
| **Điều kiện tiên quyết** | Đã đăng nhập Admin. |

**Luồng chính:**
1. Vào Danh mục → Quy trình GPMB chuẩn → xem cây quy trình.
2. **Thêm node:** Thêm task/subtask/subsubtask tại bất kỳ vị trí nào.
3. **Sửa node:** Sửa tên, sắp xếp thứ tự.
4. **Xóa node:** Cảnh báo nếu có node con. Không cho xóa nếu hồ sơ đang thực hiện đang dùng node này.
5. **Cấu hình field:** Bật/tắt custom field GPMB theo từng node (xem UC-03-03).
6. **Export:** Tải toàn bộ quy trình ra Excel (phản ánh cây task hiện tại).

**Luồng thay thế:**
- Hồ sơ đang thực hiện dùng quy trình: *(cần xác nhận — có cho sửa template không? Nếu sửa thì ảnh hưởng hồ sơ đang chạy thế nào?)* (QT-01)

**Trường dữ liệu:**
- Tên task/subtask/subsubtask (bắt buộc)
- Cấp (1/2/3)
- Thứ tự hiển thị
- Custom field config (xem UC-03-03)

> ⚠️ **Điểm cần làm rõ (QT-02):** Cây quy trình chuẩn do team nghiệp vụ cung cấp sẵn hay phải dựng lại? Cần data mẫu để xây dựng và test.

**Liên kết UC:** UC-03-02, UC-03-03, UC-01-03

---

#### UC-03-02 — Import quy trình từ Excel

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-03-02 |
| **Tác nhân chính** | Admin |
| **Mô tả** | Import toàn bộ cây quy trình từ file Excel theo mẫu QLDAXD. |

**Luồng chính (tuân theo quy tắc II.1):**
1. Nhấn "Import quy trình" → tải file mẫu nếu cần.
2. Upload file Excel.
3. Hệ thống kiểm tra định dạng (đúng template QLDAXD).
4. Validate: cấu trúc cây, tên bước, cấp độ.
5. Nếu lỗi: trả danh sách lỗi chi tiết.
6. Xác nhận import → **ghi đè template hiện tại** *(cần xác nhận hành vi ghi đè)*.
7. Bắt buộc có nút "Tải toàn bộ quy trình" sau import.

---

#### UC-03-03 — Cấu hình trường thông tin bước quy trình

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-03-03 |
| **Tác nhân chính** | Admin |
| **Mô tả** | Admin bật/tắt các custom field GPMB theo từng node trong cây quy trình. |

**Luồng chính:**
1. Trong quản lý quy trình, chọn một node.
2. Cấu hình bật/tắt các field:
   - Bật/tắt **Số văn bản**
   - Bật/tắt **Ngày văn bản**
   - Bật/tắt **Đơn vị phát hành**
   - Bật/tắt **Loại văn bản**
   - Bật/tắt **Hộ liên quan**
   - Yêu cầu lưu scan văn bản (Y/N)
3. Lưu cấu hình.

> ⚠️ **Điểm cần làm rõ (DM-04):** Cấu hình này lưu theo template (toàn hệ thống) hay có thể override theo từng hồ sơ GPMB?

---

### 5. Module Quản lý Công việc

#### UC-04-01 — Xem danh sách công việc (toàn hệ thống)

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-04-01 |
| **Tác nhân chính** | CBCQ, Admin, QLPB, BLĐ, GĐĐH, Kế toán |
| **Mô tả** | Xem danh sách tất cả công việc (task/subtask/subsubtask) trên toàn hệ thống. |

**Luồng chính:**
1. Vào Quản lý Công việc → Danh sách.
2. Hệ thống hiển thị cây công việc.
3. Lọc theo hồ sơ GPMB, trạng thái, CBCQ phụ trách, khoảng thời gian.

**Trường dữ liệu:**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| Tên công việc | Text | |
| Hồ sơ GPMB | Text | |
| Cấp | Enum | task / subtask / subsubtask |
| CBCQ phụ trách | Text | |
| Trạng thái | Enum | Đang thực hiện / Hoàn thành |
| Tiến độ | Text | Task cha: "X/Y"; Task lá: "—" |
| Ngày bắt đầu | Date | |
| Ngày hạn | Date | |

**Liên kết UC:** UC-04-03, UC-01-02

---

#### UC-04-02 — Xem danh sách công việc cần làm của tôi

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-04-02 |
| **Tác nhân chính** | CBCQ (duy nhất) |
| **Mô tả** | Xem danh sách công việc được phân công cho CBCQ đang đăng nhập. Đây là ngoại lệ duy nhất về phạm vi dữ liệu trong toàn hệ thống. |

**Luồng chính:** Như UC-04-01 nhưng hệ thống tự động filter theo CBCQ đang đăng nhập. Không cho phép bỏ filter này.

---

#### UC-04-03 — Xem chi tiết công việc

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-04-03 |
| **Tác nhân chính** | Tất cả vai trò |
| **Điều kiện tiên quyết** | Công việc tồn tại. |

**Luồng chính:**
1. Nhấn vào công việc từ danh sách.
2. Xem đầy đủ thông tin, lịch sử cập nhật, nhận xét, custom field GPMB.
3. Với task cha: xem cây task con kèm tỉ lệ hoàn thành (X/Y).
4. Action hiển thị theo role và trạng thái công việc.

**Trường dữ liệu:**
- Tên công việc, Cấp (level), Hồ sơ GPMB, Bước quy trình, CBCQ phụ trách
- Trạng thái, Ngày bắt đầu, Ngày hạn, Ngày hoàn thành thực tế
- **Task cha:** Cột "Số task con Hoàn thành / Tổng task con" (vd: 5/7) + Cây task con
- **Task lá:** Chỉ trạng thái (không có %)
- **Lịch sử:** Khó khăn / Giải pháp / Tình trạng xử lý (kèm timestamp)
- **Custom field GPMB** (theo cấu hình node): Số VB, Ngày VB, Đơn vị phát hành, Loại VB, Hộ liên quan, File scan
- **Tài liệu đính kèm**
- **Nhận xét cấp trên** + Phản hồi CBCQ

---

#### UC-04-04 — Cập nhật trạng thái công việc (task lá)

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-04-04 |
| **Tác nhân chính** | CBCQ (có điều kiện), Admin |
| **Mô tả** | Cập nhật trạng thái task lá. Chỉ áp dụng cho task lá (subsubtask — cấp thấp nhất). |
| **Điều kiện tiên quyết** | Task lá đang ở trạng thái **Đang thực hiện**. |

**Luồng chính:**
1. Từ Chi tiết công việc (task lá) → "Xác nhận hoàn thành".
2. Chọn trạng thái Hoàn thành / giữ Đang thực hiện.
3. Nhập ghi chú nếu cần.
4. Lưu.
5. Hệ thống tự động tính lại tiến độ task cha (UC-04-08).

**Luồng thay thế:**
- Không phải task lá: nút "Xác nhận hoàn thành" không hiển thị.
- CBCQ có điều kiện *(cần xác nhận HB-03)*, Admin không cần điều kiện.

**Trường dữ liệu:** Trạng thái (Đang thực hiện / Hoàn thành), Ngày cập nhật (auto), Ghi chú.

---

#### UC-04-05 — Nhập khó khăn & giải pháp

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-04-05 |
| **Tác nhân chính** | CBCQ, Admin |
| **Điều kiện tiên quyết** | Công việc đang Thực hiện. |

**Luồng chính:** Nhấn "Nhập khó khăn" / "Nhập giải pháp" → Nhập nội dung → Lưu (kèm timestamp tự động).

**Trường dữ liệu:** Nội dung khó khăn (bắt buộc khi là khó khăn), Nội dung giải pháp, Ngày ghi nhận (auto).

---

#### UC-04-06 — Nhập tình trạng xử lý

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-04-06 |
| **Tác nhân chính** | CBCQ, Admin |
| **Điều kiện tiên quyết** | Công việc đang Thực hiện. |

**Luồng chính:** Nhấn "Nhập tình trạng xử lý" → Chọn/Nhập tình trạng + ghi chú → Lưu.

**Trường dữ liệu:** Tình trạng xử lý *(cần xác nhận: enum hay text tự do? — CV-01)*, Ghi chú, Ngày cập nhật (auto).

---

#### UC-04-07 — Nhập trường custom GPMB & đính kèm scan

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-04-07 |
| **Tác nhân chính** | CBCQ, Admin |
| **Mô tả** | Nhập các trường custom GPMB được Admin bật cho node quy trình này. |
| **Điều kiện tiên quyết** | Công việc đang Thực hiện. Node có ít nhất 1 custom field được bật. |

**Luồng chính:**
1. Trong Chi tiết công việc, phần Custom field GPMB.
2. Nhập các trường được bật (Số VB, Ngày VB, Đơn vị phát hành, Loại VB, Hộ liên quan).
3. Nếu node yêu cầu scan: upload file scan văn bản.
4. Lưu.

**Trường dữ liệu (tùy theo cấu hình node):**
- Số văn bản (text)
- Ngày văn bản (date)
- Đơn vị phát hành (lookup từ danh mục)
- Loại văn bản (enum: Thông báo / Quyết định / Biên bản / Tờ trình / Khác)
- Hộ liên quan (multi-select từ danh sách hộ trong hồ sơ GPMB)
- File scan đính kèm (upload; bắt buộc nếu node yêu cầu scan = Y)

> ⚠️ **Điểm cần làm rõ (CT-05):** Loại file được phép? Dung lượng tối đa? Số file tối đa?

---

#### UC-04-08 — Xác nhận hoàn thành công việc (task cha — tự động)

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-04-08 |
| **Tác nhân chính** | System (auto) |
| **Mô tả** | Hệ thống tự động đánh dấu task cha Hoàn thành khi tất cả task con Hoàn thành. |

**Luồng chính:**
1. Task con chuyển trạng thái Hoàn thành (từ UC-04-04).
2. Hệ thống kiểm tra: tất cả task con trực tiếp của task cha đều Hoàn thành?
3. Nếu có → task cha auto Hoàn thành. Lan truyền đệ quy lên cấp cao hơn.
4. Nếu không → task cha giữ nguyên Đang thực hiện.

**Luồng thay thế:** Task con bị thu hồi Hoàn thành → hệ thống tự reset task cha về Đang thực hiện (đệ quy).

**Trường dữ liệu:** Số task con Hoàn thành / Tổng task con (vd 5/7), Trạng thái task cha (auto), Thời điểm auto-complete.

---

#### UC-04-09 — Nhận xét công việc (cấp trên)

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-04-09 |
| **Tác nhân chính** | QLPB, BLĐ, GĐĐH |
| **Điều kiện tiên quyết** | Công việc đang Thực hiện. |

**Luồng chính:** Trong Chi tiết công việc → "Nhận xét" → Nhập nội dung → Gửi → Nhận xét lưu, CBCQ nhận thông báo.

---

#### UC-04-10 — Xử lý nhận xét công việc (CBCQ)

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-04-10 |
| **Tác nhân chính** | CBCQ, Admin |
| **Điều kiện tiên quyết** | Có nhận xét chưa xử lý. |

**Luồng chính:** Mở phần Nhận xét → "Xác nhận" hoặc "Từ chối" kèm ghi chú → Trạng thái nhận xét cập nhật.

---

### 6. Module Kế hoạch tháng

#### UC-05-01 — Xem danh sách kế hoạch tháng

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-05-01 |
| **Tác nhân chính** | CBCQ, QLPB, BLĐ, GĐĐH, Kế toán (Admin không có trong list — cần xác nhận) |

**Luồng chính:** Vào Kế hoạch tháng → Danh sách → Lọc theo tháng/năm, hồ sơ GPMB, CBCQ.

**Trường dữ liệu:** Tháng/Năm, Hồ sơ GPMB, CBCQ, Tổng số công việc theo kế hoạch, Trạng thái.

> ⚠️ **Điểm cần làm rõ (KH-01, KH-02):** Kế hoạch tháng được tạo thủ công hay auto? Granularity: 1 kế hoạch/CBCQ/tháng hay 1 kế hoạch/CBCQ/hồ sơ/tháng?

---

#### UC-05-02 — Chỉnh sửa kế hoạch tháng & thêm việc phát sinh

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-05-02 |
| **Tác nhân chính** | CBCQ |
| **Điều kiện tiên quyết** | Kế hoạch tháng tồn tại. |

**Luồng chính:**
1. Chi tiết kế hoạch tháng → "Chỉnh sửa".
2. Cập nhật danh sách công việc từ quy trình áp dụng cho tháng đó.
3. Nhấn "Thêm việc phát sinh" → điền thông tin việc phát sinh.
4. Lưu.

**Luồng thay thế:** Đã xuất báo cáo: cảnh báo trước khi cho sửa.

**Trường dữ liệu:**
- Tháng kế hoạch, Danh sách công việc từ quy trình
- **Việc phát sinh:** Tên (bắt buộc), Mô tả, Ngày dự kiến, Ghi chú

---

#### UC-05-03 — Xuất báo cáo công việc tháng

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-05-03 |
| **Tác nhân chính** | CBCQ (Có); QLPB, BLĐ, GĐĐH, Kế toán (Xem) |

**Luồng chính:** Nhấn "Xuất báo cáo" → Chọn định dạng (Excel/PDF) → Tải file.

> ⚠️ **Điểm cần làm rõ (KH-04):** Format xuất là Excel hay PDF hay cả hai?

---

### 7. Module Chi trả BTHTTĐC

#### UC-06-01 — Xem danh sách hồ sơ chi trả BTHTTĐC

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-06-01 |
| **Tác nhân chính** | CBCQ, Kế toán, Admin, QLPB, BLĐ, GĐĐH |

**Luồng chính:** Vào Chi trả BTHTTĐC → Danh sách → Lọc theo trạng thái, hồ sơ GPMB, hộ/tổ chức, khoảng thời gian.

**Trường dữ liệu:**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| Mã hồ sơ chi trả | Text | Auto sinh |
| Hồ sơ GPMB | Text | |
| Hộ/Tổ chức | Text | |
| Tổng tiền bồi thường | Số (VNĐ) | |
| Tổng tiền hỗ trợ | Số (VNĐ) | |
| Tổng tiền TĐC | Số (VNĐ) | Nếu có |
| Tổng đề nghị chi trả | Số (VNĐ) | |
| Tổng đã chi trả | Số (VNĐ) | Chỉ tính hồ sơ đã phê duyệt |
| Còn lại | Số (VNĐ) | = Đề nghị - Đã chi trả |
| Trạng thái | Enum | Đã tạo / Chờ PD / Đã PD / Bị từ chối |
| Thao tác | Action | Theo role và trạng thái |

---

#### UC-06-02 — Xem chi tiết hồ sơ chi trả BTHTTĐC

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-06-02 |
| **Tác nhân chính** | Tất cả vai trò |

**Luồng chính:** Nhấn vào hồ sơ chi trả → xem chi tiết đầy đủ kèm lịch sử duyệt/từ chối/refresh.

**Trường dữ liệu:** Tất cả trường từ UC-06-01 + Nội dung chi trả, Ghi chú, Chứng từ đính kèm, Lịch sử xử lý (ai, khi nào, hành động, lý do).

---

#### UC-06-03 — Tạo mới / Chỉnh sửa hồ sơ chi trả BTHTTĐC

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-06-03 |
| **Tác nhân chính** | Kế toán |
| **Mô tả** | Kế toán lập hồ sơ chi trả BTHTTĐC cho một hộ/tổ chức. |
| **Điều kiện tiên quyết** | Hồ sơ GPMB ở trạng thái **Thực hiện**. Hộ/tổ chức tồn tại. Hồ sơ chi trả ở trạng thái **Đã tạo** (khi sửa). |

**Luồng chính:**
1. Tạo mới: chọn Hồ sơ GPMB → chọn Hộ/Tổ chức.
2. Nhập thông tin chi trả.
3. Lưu nháp (trạng thái: **Đã tạo**).

**Luồng thay thế:** Hồ sơ chi trả đang **Chờ phê duyệt** hoặc đã **Đã phê duyệt**: Kế toán không sửa được.

**Trường dữ liệu:**

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| Hồ sơ GPMB | Select | ✅ | |
| Hộ/Tổ chức | Select | ✅ | Lookup hộ trong hồ sơ |
| Số tiền bồi thường | Số (VNĐ) | | *(cần xác nhận: nhập tổng hay từ bảng chi tiết?)* |
| Số tiền hỗ trợ | Số (VNĐ) | | |
| Số tiền TĐC | Số (VNĐ) | | Nếu có |
| Tổng đề nghị chi trả | Số (VNĐ) | ✅ | Tự tính hoặc nhập? |
| Nội dung chi trả | Textarea | ✅ | |
| Chứng từ đính kèm | File | | *(cần xác nhận loại file, dung lượng)* |
| Ghi chú | Textarea | | |

> ⚠️ **Điểm cần làm rõ (CT-01, CT-02):** 1 hộ có thể có nhiều hồ sơ chi trả không? Các khoản tiền nhập tổng hay có bảng chi tiết riêng?

---

#### UC-06-04 — Gửi duyệt hồ sơ chi trả BTHTTĐC

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-06-04 |
| **Tác nhân chính** | Kế toán |
| **Điều kiện tiên quyết** | Hồ sơ chi trả ở trạng thái **Đã tạo** hoặc **Bị từ chối**. |

**Luồng chính:**
1. Từ Chi tiết hồ sơ chi trả → "Gửi duyệt".
2. Nhập ghi chú gửi duyệt (nếu cần).
3. Xác nhận → Trạng thái chuyển sang **Chờ phê duyệt**.
4. GĐĐH nhận thông báo.

---

#### UC-06-05 — Duyệt / Từ chối / Refresh hồ sơ chi trả (GĐĐH)

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-06-05 |
| **Tác nhân chính** | GĐĐH |
| **Mô tả** | GĐĐH phê duyệt, từ chối hoặc refresh hồ sơ chi trả BTHTTĐC. |

**Luồng A — Duyệt:**
- Điều kiện: hồ sơ **Chờ phê duyệt**.
- Nhấn "Duyệt" → Xác nhận → **Đã phê duyệt**.
- Hệ thống cộng số tiền vào Tổng đã chi trả của hộ.
- Kế toán nhận thông báo.

**Luồng B — Từ chối:**
- Điều kiện: hồ sơ **Chờ phê duyệt**.
- Nhấn "Từ chối" → Nhập lý do (bắt buộc) → Xác nhận → **Bị từ chối**.
- Kế toán nhận thông báo, có thể sửa và gửi lại.

**Luồng C — Refresh:**
- Điều kiện: hồ sơ **Đã phê duyệt**.
- Nhấn "Refresh" → Xác nhận → Hồ sơ về **Đã tạo**.
- Hệ thống trừ số tiền đã cộng vào Tổng đã chi trả của hộ.

> ⚠️ **Điểm cần làm rõ (CT-03, CT-04):** "Refresh" → về trạng thái "Đã tạo" hay "Chờ phê duyệt"? Có giới hạn số lần gửi lại không?

**Trường dữ liệu:**
- Ngày duyệt/từ chối (auto)
- Lý do từ chối (bắt buộc khi từ chối)
- Lý do refresh (tùy chọn)

---

#### UC-06-06 — Cập nhật ngày bàn giao mặt bằng

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-06-06 |
| **Tác nhân chính** | CBCQ, Admin |
| **Điều kiện tiên quyết** | Hộ không còn vướng mắc đang mở. |

**Luồng chính:** Trong Chi tiết hộ hoặc sau khi hồ sơ chi trả được duyệt → Cập nhật ngày bàn giao mặt bằng → Trạng thái hộ chuyển sang **Đã bàn giao mặt bằng**.

> ⚠️ **Điểm cần làm rõ (CT-06):** Phân quyền mâu thuẫn — CBCQ chỉ "Xem" hồ sơ chi trả nhưng lại có thể "Cập nhật ngày bàn giao mặt bằng". Cần xác nhận intentional hay không.

---

### 8. Module Báo cáo / Export

#### UC-07-01 — Báo cáo chi trả BTHTTĐC

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-07-01 |
| **Tác nhân chính** | Tất cả vai trò (Xem/Xuất) |
| **Mô tả** | Xem và xuất báo cáo tổng hợp chi trả BTHTTĐC theo bộ lọc. |
| **Điều kiện tiên quyết** | Đã đăng nhập. |

**Luồng chính:**
1. Vào Báo cáo → Báo cáo chi trả BTHTTĐC.
2. Lọc theo: Hồ sơ GPMB, Hộ/tổ chức, Khoảng thời gian, Trạng thái chi trả.
3. Xem bảng tổng hợp.
4. Nhấn "Xuất" → Tải file.

**Trường dữ liệu:**
- Hồ sơ GPMB, Hộ/Tổ chức, Tổng tiền đề nghị, Đã chi trả, Còn lại, Trạng thái chi trả, Khoảng thời gian.

> ⚠️ **Điểm cần làm rõ (BC-01, BC-02):** Xuất Excel hay PDF hay cả hai? Template báo cáo có theo mẫu nhà nước không?

---

### 9. Module Dashboard

#### UC-08-01 — Xem Dashboard tổng quan GPMB

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-08-01 |
| **Tác nhân chính** | BLĐ, GĐĐH |
| **Mô tả** | Xem tổng quan hệ thống GPMB theo biểu đồ thống kê real-time. |
| **Điều kiện tiên quyết** | Đã đăng nhập BLĐ hoặc GĐĐH. |

**Luồng chính:**
1. Vào Tổng quan / Dashboard.
2. Hệ thống hiển thị các widget real-time.
3. Lọc theo hồ sơ GPMB, tháng/năm.

**Widget / Trường dữ liệu:**

| Widget | Nội dung |
|---|---|
| Tổng số hồ sơ GPMB | Số (tất cả trạng thái) |
| Hộ theo trạng thái | Số hộ: Chưa KK / Đã KK / Đã phê duyệt PA / Đã chi trả / Đã bàn giao |
| Tổng chi trả BTHTTĐC lũy kế | Số tiền (VNĐ) — chỉ tính hồ sơ đã phê duyệt |
| Số vướng mắc đang mở | Số lượng *(liên quan HO-05: vướng mắc quản lý ở đâu?)* |
| Biểu đồ tiến độ theo công trình | *(cần xác nhận loại biểu đồ: bar/pie/gantt?)* |
| Cảnh báo quá hạn | Danh sách task/hồ sơ sắp/đã quá hạn *(cần xác nhận ngưỡng cảnh báo)* |

> ⚠️ **Điểm cần làm rõ (DB-01, DB-03, DB-04):** Polling hay WebSocket? Ngưỡng cảnh báo quá hạn? Vướng mắc quản lý ở đâu?

---

### 10. Module Danh mục (Admin)

#### UC-09-01 — Quản lý loại đất

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-09-01 |
| **Tác nhân chính** | Admin |
| **Điều kiện tiên quyết** | Đã đăng nhập Admin. |

**Luồng chính:** Vào Danh mục → Loại đất → Thêm/Sửa/Xóa.

**Trường dữ liệu:** Mã loại (VD: LUC/RSX/CLN/ONT/HNK/...), Tên loại đất (bắt buộc), Mô tả.

**Ràng buộc xóa:** Không xóa nếu loại đất đang được gắn với hộ/tổ chức nào.

---

#### UC-09-02 — Quản lý đơn vị phát hành

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-09-02 |
| **Tác nhân chính** | Admin |

**Luồng chính:** Vào Danh mục → Đơn vị phát hành → Thêm/Sửa/Xóa. Tìm kiếm theo tên đơn vị.

**Trường dữ liệu:** Tên đơn vị phát hành (bắt buộc, duy nhất), Mô tả.

---

#### UC-09-03 — Quản lý nhân viên

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-09-03 |
| **Tác nhân chính** | Admin (CRUD), QLPB/BLĐ/GĐĐH (Xem) |
| **Mô tả** | Admin quản lý nhân viên. Tái sử dụng cấu trúc từ OPA, confirm lại field nào áp dụng cho OPC. |

**Luồng chính:** Vào Danh mục → Nhân viên → Thêm/Xem/Sửa/Xóa/Cấp tài khoản.

**Trường dữ liệu:**

*Danh sách:* STT, Mã NV, Họ tên, Phòng ban, Vị trí, Email, SĐT, Tình trạng tài khoản.

*Thêm/Sửa:* Họ và tên*, Giới tính* (select), Ngày sinh, Email*, SĐT, Phòng ban* (select), Vị trí*, Tỉnh/TP, Xã/Phường, Địa chỉ chi tiết.

*Cấp tài khoản:* Tên đăng nhập*, Mật khẩu*, Nhóm quyền* (CBCQ/Admin/Kế toán/QLPB/BLĐ/GĐĐH).

**Ràng buộc xóa:** Đang phụ trách hồ sơ GPMB: cảnh báo.

> ⚠️ **Điểm cần làm rõ (DM-03):** 1 nhân viên có thể có nhiều role không?

---

#### UC-09-04 — Quản lý phòng ban

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-09-04 |
| **Tác nhân chính** | Admin |

**Luồng chính:** Vào Danh mục → Phòng ban → Thêm/Sửa/Xóa.

**Trường dữ liệu:** Mã phòng ban (auto sinh), Tên phòng ban (bắt buộc), Mô tả.

**Ràng buộc xóa:** Có nhân viên trong phòng: không cho xóa.

---

#### UC-09-05 — Quản lý tài khoản

| Trường | Nội dung |
|---|---|
| **Mã UC** | UC-09-05 |
| **Tác nhân chính** | Admin |

**Luồng chính:** Vào Danh mục → Tài khoản → Thêm mới / Chỉnh sửa / Xóa / Khóa / Mở khóa.

**Luồng thay thế:** Username trùng → lỗi. Xóa tài khoản Admin cuối → cảnh báo.

**Trường dữ liệu:** Tên tài khoản (bắt buộc, duy nhất), Mật khẩu (bắt buộc khi tạo mới), Nhân viên (bắt buộc), Nhóm quyền (CBCQ/Admin/Kế toán/QLPB/BLĐ/GĐĐH), Trạng thái (Hoạt động/Bị khóa).

**Liên kết UC:** UC-09-03, UC-00-01

---

## V. SƠ ĐỒ ĐIỀU HƯỚNG

### Các chuỗi điều hướng chính theo luồng nghiệp vụ:

```
Đăng nhập (UC-00-01)
    └─► Màn hình chính theo vai trò

CBCQ:
    Danh sách hồ sơ GPMB (UC-01-01)
        └─► Chi tiết hồ sơ (UC-01-02)
                ├─► Tab Hộ/Tổ chức → Danh sách hộ (UC-02-01) → Chi tiết hộ (UC-02-02)
                ├─► Tab Công việc → Chi tiết CV (UC-04-03) → Cập nhật (UC-04-04 đến UC-04-07)
                ├─► Tab Chi trả BTHTTĐC → DS chi trả (UC-06-01)
                └─► Tab Nhận xét → Xử lý nhận xét (UC-01-07)

    Danh sách công việc của tôi (UC-04-02)
        └─► Chi tiết CV (UC-04-03) → Cập nhật các trường

    Kế hoạch tháng (UC-05-01) → Chỉnh sửa (UC-05-02) → Xuất báo cáo (UC-05-03)

Kế toán:
    DS chi trả BTHTTĐC (UC-06-01)
        └─► Tạo hồ sơ (UC-06-03) → Gửi duyệt (UC-06-04)
                └─► GĐĐH duyệt/từ chối/refresh (UC-06-05)

GĐĐH:
    DS chi trả chờ phê duyệt (UC-06-01)
        └─► Chi tiết (UC-06-02) → Duyệt/Từ chối/Refresh (UC-06-05)
    Dashboard (UC-08-01)

BLĐ:
    Dashboard (UC-08-01)
    DS hồ sơ GPMB → Xem, Nhận xét (UC-01-06)

Admin:
    Quản lý quy trình GPMB (UC-03-01) → Import (UC-03-02) → Cấu hình field (UC-03-03)
    Danh mục (UC-09-01 đến UC-09-05)
    Mọi màn hình CBCQ có thể truy cập
```

---

## PHỤ LỤC: ĐIỂM CẦN LÀM RÕ TỔNG HỢP

| Mã | Module | Câu hỏi | Mức độ |
|---|---|---|---|
| HB-01 | Hồ sơ GPMB | Enum đầy đủ của trạng thái hồ sơ? | Cao |
| HB-02 | Hồ sơ GPMB | Ai kích hoạt chuyển trạng thái hồ sơ? Thủ công hay tự động? | Cao |
| HB-06 | Hồ sơ GPMB | Điều kiện cụ thể để xóa hồ sơ? | Cao |
| HO-01 | Hộ/Tổ chức | Điều kiện "Có điều kiện" khi thêm/sửa/xóa hộ? | Cao |
| HO-02 | Hộ/Tổ chức | Trạng thái hộ (Chưa KK, Đã KK...) do ai cập nhật — auto hay thủ công? | Cao |
| HO-05 | Hộ/Tổ chức | Vướng mắc quản lý ở đâu? Field trong hộ hay entity riêng? | Cao |
| HO-06 | Hộ/Tổ chức | Duplicate mã hộ khi import xử lý thế nào? | Trung bình |
| QT-01 | Quy trình | Update template ảnh hưởng hồ sơ đang chạy không? | Cao |
| QT-02 | Quy trình | Cây quy trình GPMB chuẩn do nghiệp vụ cung cấp hay phải dựng? | Cao |
| CV-01 | Công việc | "Tình trạng xử lý" là enum hay text tự do? | Trung bình |
| CV-03 | Công việc | Điều kiện CBCQ được xác nhận hoàn thành task lá? | Cao |
| KH-01 | Kế hoạch tháng | Kế hoạch tháng tạo thủ công hay auto? | Cao |
| KH-02 | Kế hoạch tháng | Granularity: 1 KH/CBCQ/tháng hay 1 KH/CBCQ/hồ sơ/tháng? | Cao |
| CT-01 | Chi trả | 1 hộ có thể có nhiều hồ sơ chi trả không? | Cao |
| CT-02 | Chi trả | Số tiền BT/HT/TĐC nhập tổng hay từ bảng chi tiết? | Cao |
| CT-03 | Chi trả | "Refresh" — hồ sơ về trạng thái nào? | Cao |
| CT-06 | Chi trả | Mâu thuẫn phân quyền CBCQ — xem chi trả nhưng cập nhật ngày BG? | Cao |
| DM-03 | Danh mục | 1 nhân viên có nhiều role không? | Cao |
| DM-04 | Danh mục | Cấu hình field quy trình: lưu theo template hay override theo hồ sơ? | Cao |
| DB-01 | Dashboard | Real-time: polling hay WebSocket? | Trung bình |
| DB-03 | Dashboard | Ngưỡng cảnh báo quá hạn bao nhiêu ngày? | Trung bình |
| GE-01 | Chung | OPC và OPA: dữ liệu và tài khoản share hay tách biệt? | Cao |
| GE-02 | Chung | Danh sách trigger thông báo đầy đủ? | Trung bình |

---

*Tài liệu này được tổng hợp từ BRD_GPMB (OPC) và QLDAXD_UseCase_Specification (OPA). Các điểm chưa xác nhận được đánh dấu rõ ràng để confirm với team nghiệp vụ trước khi triển khai.*
