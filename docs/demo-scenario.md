# Kịch bản Demo OPC GPMB

> **Phiên bản:** 1.0 — 2026-05-01  
> **Dự án:** CCN Hữu Bằng (HS-202504-001)  
> **Thời gian dự kiến:** ~40 phút  
> **URL:** http://localhost:3000

---

## Thông tin tài khoản demo

| Tài khoản | Mật khẩu | Vai trò |
|-----------|----------|---------|
| `admin` | `Admin@123` | Quản trị viên — toàn quyền |
| `cbcq` | `Cbcq@123` | Cán bộ chuyên quản — quản lý hồ sơ, hộ, công việc |
| `ketoan` | `Ketoan@123` | Kế toán — tạo và quản lý chi trả |
| `gddh` | `Gddh@123` | Giám đốc điều hành — phê duyệt chi trả |

---

## PHẦN 0 — Chuẩn bị: Xem và cấu hình Quy trình GPMB

> **Tài khoản:** admin / Admin@123  
> **Thời gian:** ~5 phút  
> **Mục tiêu:** Giới thiệu tính năng quản lý quy trình mẫu — xem cấu trúc bước, gắn tài liệu hướng dẫn

### Bước 0.1 — Đăng nhập hệ thống

1. Mở trình duyệt → http://localhost:3000
2. Nhập tài khoản: `admin` / `Admin@123`
3. Click **Đăng nhập** → vào trang Dashboard

### Bước 0.2 — Xem danh sách quy trình GPMB

1. Click menu **"Quy trình GPMB"** ở sidebar trái
2. **Kết quả mong đợi:** Hiện bảng 2 quy trình:
   - **Quy trình GPMB chuẩn** — badge xanh "Đang hoạt động", 118 bước
   - **QT 2** — badge xám "Không hoạt động", 1 bước

### Bước 0.3 — Xem chi tiết quy trình

1. Click **"Chi tiết"** bên cạnh "Quy trình GPMB chuẩn"
2. **Kết quả mong đợi:** Trang chi tiết hiển thị:
   - Header: tên quy trình, badge "Đang hoạt động"
   - Cây bước bên trái: có 5 giai đoạn (Giai đoạn 2, 3, 4, v.v.)
   - Mỗi giai đoạn có thể expand để xem bước con (C001, C002, ...)

### Bước 0.4 — Mở node xem tài liệu hướng dẫn

1. Trong cây bên trái, expand **"GIAI ĐOẠN 2: THÔNG BÁO THU HỒI ĐẤT"**
2. Click node **[C001] "Tờ trình đề nghị ban hành Kế hoạch thu hồi đất"**
3. **Kết quả mong đợi:** Form node hiện ở bên phải với mục **"Tài liệu hướng dẫn"** — thấy ít nhất 1 tài liệu đã đính kèm

### Bước 0.5 — Upload thêm tài liệu hướng dẫn cho node

1. Trong mục "Tài liệu hướng dẫn", điền tên: `Mẫu tờ trình 2025`
2. Click **"Upload tài liệu"** → chọn file PDF/Word mẫu từ máy
3. **Kết quả mong đợi:** Tài liệu xuất hiện trong danh sách với nút "Xem"

> 💡 **Điểm nhấn:** Tài liệu hướng dẫn này sẽ hiển thị trong Drawer task khi CBCQ xử lý công việc — giúp cán bộ tra cứu mẫu biểu ngay trong luồng làm việc.

---

## PHẦN 1 — Hồ sơ GPMB

> **Tài khoản:** cbcq / Cbcq@123  
> **Thời gian:** ~5 phút  
> **Mục tiêu:** Giới thiệu danh sách hồ sơ và chi tiết hồ sơ CCN Hữu Bằng

### Bước 1.1 — Đăng nhập với tài khoản CBCQ

1. Đăng xuất admin → đăng nhập `cbcq` / `Cbcq@123`
2. Click menu **"Hồ sơ GPMB"**
3. **Kết quả mong đợi:** Bảng danh sách 4 hồ sơ:
   - HS-202504-001 — CCN Hữu Bằng (454 hộ)
   - HS-202504-002 — KCN Phú Nghĩa mở rộng (35 hộ)
   - HS-202504-003 — Đường vành đai 4 — đoạn Mê Linh (45 hộ)
   - RH-0232323 — TEST CT (0 hộ)

### Bước 1.2 — Mở chi tiết hồ sơ CCN Hữu Bằng

1. Click vào **"CCN Hữu Bằng"** (HS-202504-001)
2. **Kết quả mong đợi:** Trang chi tiết hồ sơ với 5 tabs:
   - Thông tin | Danh sách hộ | Công việc | Kế hoạch tháng | Chi trả

### Bước 1.3 — Tab Thông tin

1. Mặc định ở tab **"Thông tin"**
2. **Kết quả mong đợi:** Hiện thông tin cơ bản:
   - Mã hồ sơ: HS-202504-001
   - Tên dự án: CCN Hữu Bằng
   - Địa chỉ: Thôn Hữu Bằng, Thạch Thất, Hà Nội
   - Trạng thái: Đang thực hiện
   - Quy trình áp dụng: Quy trình GPMB chuẩn

### Bước 1.4 — Tab Danh sách hộ

1. Click tab **"Danh sách hộ"**
2. **Kết quả mong đợi:**
   - Hiện bảng hộ (có phân trang)
   - Có ô tìm kiếm theo mã hộ / tên chủ hộ
   - Có filter theo trạng thái hộ
   - Cột trạng thái hiển thị badge màu: Mới (xám), Đang xử lý (xanh dương), Đã thống nhất (cam), Đã chi trả (xanh lá), Đã bàn giao (tím)

---

## PHẦN 2 — Quản lý hộ và phê duyệt phương án

> **Tài khoản:** cbcq / Cbcq@123  
> **Thời gian:** ~5 phút  
> **Mục tiêu:** Demo state machine hộ: dang_xu_ly → da_thong_nhat và xem ma trận công việc

> ℹ️ **Lưu ý luồng:** Hộ được tạo với trạng thái **"Mới"**. Khi CBCQ bắt đầu lập phương án (nhập liệu hoặc phân công công việc), hệ thống tự động chuyển sang **"Đang xử lý"**. CBCQ chỉ cần thao tác khi **xác nhận đã thống nhất** phương án với chủ hộ.

### Bước 2.1 — Tìm hộ đang xử lý

1. Trong tab "Danh sách hộ", filter **Trạng thái = "Đang xử lý"**
2. Chọn một hộ trong danh sách (ví dụ: HB453)
3. Click **"Xem chi tiết"** hoặc click vào tên hộ

### Bước 2.2 — Xác nhận thống nhất phương án

1. Trong trang chi tiết hộ, click nút **"Đã thống nhất phương án"**
2. Confirm xác nhận
3. **Kết quả mong đợi:**
   - Badge trạng thái chuyển sang **"Đã thống nhất"** (cam)
   - Hộ này sẽ sẵn sàng cho bước tạo chi trả

> 💡 **Điểm nhấn:** Trạng thái tiếp theo ("Đã chi trả" và "Đã bàn giao") sẽ **tự động** chuyển khi kế toán/GDDH xử lý chi trả — không cần CBCQ thao tác thủ công.

### Bước 2.4 — Xem ma trận công việc (Pivot)

1. Quay lại hồ sơ HS-202504-001
2. Click tab **"Ma trận công việc"** (hoặc "Pivot")
3. **Kết quả mong đợi:** Bảng matrix 2D — hàng là hộ, cột là bước quy trình, ô hiển thị trạng thái task

### Bước 2.5 — Xuất Excel pivot

1. Click nút **"Xuất Excel"**
2. **Kết quả mong đợi:** File `.xlsx` được tải về — mở ra thấy bảng pivot đầy đủ

---

## PHẦN 3 — Công việc (Task Management)

> **Tài khoản:** cbcq / Cbcq@123  
> **Thời gian:** ~10 phút  
> **Mục tiêu:** Demo task tree, task detail với tài liệu hướng dẫn, điền trường thông tin, đánh dấu hoàn thành

### Bước 3.1 — Tab Công việc

1. Click tab **"Công việc"**
2. **Kết quả mong đợi:** Cây task 3 giai đoạn:
   - GIAI ĐOẠN 2: THÔNG BÁO THU HỒI ĐẤT (đã có task)
   - GIAI ĐOẠN 3: LẬP PHƯƠNG ÁN BT, HT, TĐC (nhiều task per-hộ)
   - GIAI ĐOẠN 4: CHI TRẢ VÀ BÀN GIAO MẶT BẰNG (nhiều task per-hộ)

### Bước 3.2 — Mở Giai đoạn 2

1. Click expand **"GIAI ĐOẠN 2"**
2. **Kết quả mong đợi:** Thấy các bước C001–C013; badge "Hoàn thành" (xanh) và "Đang thực hiện" (xanh dương)

### Bước 3.3 — Xem task đã hoàn thành + tài liệu hướng dẫn

1. Click vào bước **[C001] "Tờ trình đề nghị ban hành Kế hoạch thu hồi đất"** (đã Hoàn thành)
2. **Kết quả mong đợi:** Drawer mở ra bên phải hiển thị:
   - **Trạng thái:** Hoàn thành (badge xanh)
   - **Tài liệu hướng dẫn:** Mục "Tài liệu hướng dẫn" với file đã upload ở Bước 0.5 — nút "Xem" để tải về
   - Mục "Văn bản đính kèm" (nếu có)

> 💡 **Điểm nhấn:** CBCQ thấy ngay mẫu biểu cần điền mà không cần tìm kiếm bên ngoài hệ thống.

### Bước 3.4 — Mở task chưa hoàn thành (per-hộ)

1. Expand **"GIAI ĐOẠN 3"** → expand **[C064] "Tổ công tác hoàn thiện hồ sơ"**
2. Thấy danh sách task theo từng hộ
3. Click vào task của hộ **HB001** (hoặc hộ bất kỳ)
4. **Kết quả mong đợi:** Drawer mở với:
   - Header: `[C064] Tổ công tác hoàn thiện hồ sơ` + tên hộ HB001
   - Switch trạng thái: "Đang thực hiện"
   - Form các trường thông tin

### Bước 3.5 — Điền thông tin bắt buộc

1. Trong Drawer, điền form:
   - **Số văn bản:** `01/VB-GPMB-2026`
   - **Ngày văn bản:** chọn ngày hôm nay
   - **Loại văn bản:** Quyết định
2. Click **"Lưu"**
3. **Kết quả mong đợi:** Notification "Lưu thành công"

### Bước 3.6 — Upload văn bản đính kèm

1. Trong mục **"Văn bản đính kèm"**, điền tên: `Biên bản kiểm đếm HB001`
2. Click **"Đính kèm văn bản"** → chọn file
3. **Kết quả mong đợi:** File xuất hiện trong danh sách, có thể tải về

### Bước 3.7 — Đánh dấu task hoàn thành

1. Toggle Switch từ **"Đang thực hiện"** → **"Hoàn thành"**
2. **Kết quả mong đợi:** Badge chuyển xanh, timestamp "Hoàn thành" hiển thị
3. Đóng Drawer

### Bước 3.8 — Verify trong tree

1. **Kết quả mong đợi:** Task HB001 trong C064 hiển thị badge **"Hoàn thành"** trong tree

---

## PHẦN 4 — Kế hoạch tháng

> **Tài khoản:** cbcq / Cbcq@123  
> **Thời gian:** ~5 phút  
> **Mục tiêu:** Demo tạo kế hoạch tháng, thêm việc phát sinh, quản lý trạng thái

### Bước 4.1 — Tab Kế hoạch tháng

1. Click tab **"Kế hoạch tháng"**
2. **Kết quả mong đợi:** Chưa có kế hoạch nào — hiện nút **"Tạo kế hoạch"**

### Bước 4.2 — Tạo kế hoạch tháng 5/2026

1. Click **"Tạo kế hoạch"**
2. Chọn tháng: **5/2026**
3. Confirm
4. **Kết quả mong đợi:** Kế hoạch được tạo tự động với danh sách việc từ quy trình GPMB chuẩn — các công việc dự kiến trong tháng 5

### Bước 4.3 — Xem danh sách việc

1. **Kết quả mong đợi:** Bảng danh sách việc gồm:
   - Các việc **auto-gen** từ workflow node: click tên → mở TaskDetail drawer
   - Cột "Loại": auto-gen hoặc phát sinh
   - Cột "Ngày dự kiến", "Ghi chú"

### Bước 4.4 — Thêm việc phát sinh

1. Click **"Thêm việc phát sinh"**
2. Nhập tên: `Họp nội bộ triển khai phương án chi trả`
3. Chọn ngày dự kiến: một ngày trong tháng 5
4. Click **Thêm**
5. **Kết quả mong đợi:** Việc phát sinh xuất hiện cuối danh sách với nhãn "Phát sinh"

### Bước 4.5 — Quản lý trạng thái việc phát sinh

1. Tìm hàng việc phát sinh vừa tạo
2. **Kết quả mong đợi:** Cột "Trạng thái" có Switch **"Đang thực hiện"**

### Bước 4.6 — Toggle hoàn thành

1. Toggle Switch → **"Hoàn thành"**
2. **Kết quả mong đợi:** Switch chuyển sang trạng thái Hoàn thành

### Bước 4.7 — Click vào việc auto-gen để xem task gốc

1. Click vào tên một **việc auto-gen** (ví dụ: "Tờ trình đề nghị ban hành...")
2. **Kết quả mong đợi:** Drawer TaskDetail mở, hiển thị trạng thái task gốc trong quy trình

---

## PHẦN 5 — Chi trả: Full flow tạo → gửi duyệt → phê duyệt → bàn giao

> **Tài khoản:** ketoan → gddh → cbcq  
> **Thời gian:** ~10 phút  
> **Mục tiêu:** Demo full flow chi trả từ kế toán tạo đến GDDH phê duyệt và CBCQ bàn giao mặt bằng

### Bước 5.1 — Đăng nhập Kế toán

1. Đăng xuất cbcq → đăng nhập `ketoan` / `Ketoan@123`
2. Click menu **"Hồ sơ GPMB"** → click **"CCN Hữu Bằng"**
3. Click tab **"Chi trả"**

### Bước 5.2 — Xem danh sách chi trả hiện tại

1. **Kết quả mong đợi:** Bảng chi trả hiển thị các hộ:
   - HB009, HB008, HB007, HB006 — **Đã bàn giao** (tím)
   - HB005 — **Đã phê duyệt** (xanh lá)
   - HB004 — **Bị từ chối** (đỏ) + hiển thị lý do
   - HB003 — **Đã phê duyệt**

### Bước 5.3 — Tạo chi trả mới cho HB453

1. Click nút **"Tạo chi trả"**
2. **Dropdown "Hộ"** → chọn **HB453 — Nguyễn Văn Tám** (hộ đã thống nhất phương án)
3. Điền thông tin bồi thường:
   - **Số tiền BT (Bồi thường):** `50,000,000`
   - **Số tiền HT (Hỗ trợ):** `20,000,000`
   - **Số tiền TĐC (Tái định cư):** `10,000,000`
   - **Tổng đề nghị:** tự tính = `80,000,000đ`
4. Click **"Tạo"**

### Bước 5.4 — Verify chi trả mới tạo + Gửi duyệt

1. **Kết quả mong đợi:** Chi trả HB453 xuất hiện với trạng thái **"Đã tạo"** (xám)
2. Click nút **"Gửi duyệt"** để chuyển cho GDDH phê duyệt
3. **Kết quả mong đợi:** Trạng thái → **"Chờ phê duyệt"** (vàng)

> 💡 **Lưu ý:** Chỉ hộ có trạng thái "Đã thống nhất phương án" mới có thể chọn trong dropdown tạo chi trả.

### Bước 5.5 — Đăng nhập Giám đốc điều hành

1. Đăng xuất ketoan → đăng nhập `gddh` / `Gddh@123`
2. Mở HS-202504-001 → tab **"Chi trả"**

### Bước 5.6 — Phê duyệt chi trả HB453

1. Tìm hàng **HB453** (Chờ phê duyệt)
2. Click nút **"Phê duyệt"**
3. Confirm xác nhận
4. **Kết quả mong đợi:**
   - Chi trả HB453 chuyển trạng thái → **"Đã phê duyệt"** (xanh lá)
   - Timestamp phê duyệt hiển thị

### Bước 5.7 — Verify auto-transition: hộ HB453 → Đã chi trả

1. Chuyển sang tab **"Danh sách hộ"**
2. Tìm **HB453**
3. **Kết quả mong đợi:** Trạng thái hộ **tự động** chuyển → **"Đã chi trả"** (xanh lá)

> 🎯 **Điểm nhấn:** Hệ thống tự động cập nhật trạng thái hộ khi GDDH phê duyệt — không cần CBCQ thao tác thủ công, giảm thiểu sai sót.

### Bước 5.8 — CBCQ đánh dấu bàn giao mặt bằng

1. Đăng xuất gddh → đăng nhập `cbcq` / `Cbcq@123`
2. Mở HS-202504-001 → tab **"Chi trả"**
3. Tìm HB453 (Đã phê duyệt) → click **"Bàn giao mặt bằng"**
4. Nhập ngày bàn giao: ngày hôm nay
5. Confirm
6. **Kết quả mong đợi:** Chi trả HB453 → **"Đã bàn giao"** (tím)

### Bước 5.9 — Verify auto-transition: hộ HB453 → Đã bàn giao

1. Tab "Danh sách hộ" → tìm HB453
2. **Kết quả mong đợi:** Trạng thái hộ **tự động** chuyển → **"Đã bàn giao"** (tím)

---

## PHẦN 6 — Từ chối và tái tạo chi trả (optional)

> **Tài khoản:** ketoan → gddh  
> **Thời gian:** ~3 phút  
> **Mục tiêu:** Demo GDDH từ chối, ketoan xem lý do và tạo lại

### Bước 6.1 — Ketoan tạo chi trả cho HB016

1. Đăng nhập `ketoan` / `Ketoan@123` → tab Chi trả HS-202504-001
2. Click "Tạo chi trả" → chọn **HB016 — NGUYỄN ĐÌNH KHUYÊN** (hộ đã thống nhất)
3. Điền số tiền (BT + HT + TĐC) → Click **"Tạo"**
4. **Kết quả:** Chi trả HB016 trạng thái → **"Đã tạo"**

### Bước 6.2 — Ketoan gửi duyệt

1. Click nút **"Gửi duyệt"** trên hàng HB016
2. **Kết quả mong đợi:** Trạng thái → **"Chờ phê duyệt"** (vàng)

### Bước 6.3 — Gddh từ chối

1. Đăng xuất ketoan → đăng nhập `gddh` / `Gddh@123`
2. Tab Chi trả → tìm HB016 (**Chờ phê duyệt**)
3. Click **"Từ chối"**
4. Nhập lý do: `Hồ sơ thiếu biên bản kiểm đếm, cần bổ sung`
5. Confirm

### Bước 6.4 — Verify trạng thái sau khi từ chối

1. **Kết quả mong đợi:**
   - Chi trả HB016 → **"Bị từ chối"** với lý do hiển thị
   - Hộ HB016 **vẫn giữ** trạng thái "Đã thống nhất" — có thể tạo chi trả mới sau khi bổ sung hồ sơ

---

## Tổng kết tính năng demo

| Tính năng | Người dùng | Kết quả chứng minh |
|-----------|-----------|---------------------|
| Quản lý quy trình mẫu | Admin | Xem cây bước, upload tài liệu hướng dẫn per node |
| Danh sách hồ sơ | CBCQ | 4 hồ sơ, thông tin đầy đủ |
| Quản lý hộ | CBCQ | State machine mới→xử lý→thống nhất |
| Ma trận công việc | CBCQ | Pivot hộ × bước, xuất Excel |
| Task tree + Detail | CBCQ | Cây task 3 giai đoạn, điền trường, upload đính kèm |
| Tài liệu hướng dẫn | CBCQ | Xem mẫu biểu ngay trong task drawer |
| Kế hoạch tháng | CBCQ | Tạo kế hoạch, thêm việc phát sinh |
| Chi trả — Tạo | Kế toán | Chọn hộ da_thong_nhat, điền số tiền |
| Chi trả — Phê duyệt | GDDH | Phê duyệt → hộ auto da_chi_tra |
| Chi trả — Bàn giao | CBCQ | Bàn giao → hộ auto da_ban_giao |
| Chi trả — Từ chối | GDDH | Từ chối với lý do; hộ giữ nguyên trạng thái |

---

## Ghi chú kỹ thuật

- **BE:** FastAPI + PostgreSQL, chạy tại port 8000
- **FE:** Next.js 14 App Router, chạy tại port 3000
- **File uploads:** Lưu tại `/uploads/` trên BE server; FE dùng `NEXT_PUBLIC_API_URL` để truy cập
- **Auto-transition:** Được xử lý trong BE endpoint phê duyệt/bàn giao chi trả — không cần thao tác thêm

---

*Demo chuẩn bị bởi OPC Dev Team — 2026-05-01*
