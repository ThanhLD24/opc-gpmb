# BRD — Business Requirements Document
## OPC: Phần mềm hỗ trợ điều hành Giải phóng mặt bằng (GPMB)

**Version:** 1.0  
**Date:** 2026-04-29  
**Phase:** MVP Demo  
**Status:** Draft — Pending stakeholder sign-off

---

## 1. Business Context

### 1.1 Problem Statement

Quy trình Giải phóng mặt bằng (GPMB) hiện tại được quản lý phân tán qua Excel, email, và sổ sách. Kết quả:
- Không có cái nhìn tổng thể về tiến độ từng hộ trong một hồ sơ GPMB
- Khó theo dõi hàng trăm hộ qua hàng trăm bước quy trình đồng thời
- Luồng phê duyệt chi trả BTHTTĐC (Bồi thường, Hỗ trợ, Tái định cư) không minh bạch
- Không có audit trail cho quyết định bồi thường

### 1.2 Business Goals

| # | Mục tiêu | Metric thành công |
|---|---|---|
| BG-01 | Số hoá toàn bộ vòng đời hồ sơ GPMB | 100% hồ sơ GPMB được tạo và theo dõi trong hệ thống |
| BG-02 | Theo dõi tiến độ từng hộ theo cây quy trình | Ma trận pivot hộ × node cập nhật real-time |
| BG-03 | Luồng phê duyệt chi trả minh bạch, có dấu thời gian | 100% hồ sơ chi trả đi qua luồng Kế toán → GĐĐH |
| BG-04 | Giảm thời gian báo cáo tiến độ | Export Excel ma trận trong < 30 giây |
| BG-05 | Demo thuyết phục khách hàng để ký hợp đồng | End-to-end demo flow hoàn chỉnh trong 20 phút |

---

## 2. Stakeholders

| Vai trò | Concern chính | Sign-off |
|---|---|---|
| **Admin** | Cấu hình quy trình chuẩn, quản lý danh mục | Required |
| **CBCQ** (Cán bộ chuyên quản) | Nhập liệu hàng ngày: hồ sơ, hộ, tiến độ công việc | Required |
| **Kế toán** | Lập và gửi duyệt hồ sơ chi trả BTHTTĐC | Required |
| **GĐĐH** (Giám đốc điều hành) | Phê duyệt chi trả, xem tổng quan | Required |
| **OPC (Product Team)** | Deliverable cho khách hàng demo | Sponsor |

> **MVP bỏ:** QLPB (Quản lý phòng ban), BLĐ (Ban lãnh đạo) — không tham gia luồng MVP.

---

## 3. High-Level Business Requirements

| Mã | Yêu cầu | Loại | Nguồn |
|---|---|---|---|
| BR-01 | Hệ thống quản lý cây quy trình GPMB chuẩn với N cấp đệ quy | Functional | OPC_UseCase_Specification §II.2 |
| BR-02 | Mỗi node trong cây có thể bật cờ `per_household` để áp dụng riêng từng hộ | Functional | OPC_UseCase_Specification §II.2.2 |
| BR-03 | Khi tạo hồ sơ GPMB, snapshot cây template và sinh task instance theo logic per_household | Functional | OPC_UseCase_Specification §II.2.3 |
| BR-04 | CBCQ nhập danh sách hộ bằng Import Excel (vài trăm hộ) | Functional | MVP-scope UC-02-06 |
| BR-05 | Theo dõi trạng thái từng hộ qua 5 bước: Mới → Đang xử lý → Đã thống nhất → Đã chi trả → Đã bàn giao | Functional | MVP-scope §4.2 |
| BR-06 | Ma trận pivot tiến độ: hàng = hộ, cột = node quy trình, Export Excel | Functional | MVP-scope UC-04-12 |
| BR-07 | Luồng phê duyệt chi trả BTHTTĐC: Kế toán tạo → GĐĐH duyệt/từ chối | Functional | OPC_UseCase_Specification §F4 |
| BR-08 | Phân quyền 4 role: Admin / CBCQ / Kế toán / GĐĐH | Non-functional | MVP-scope §2 |
| BR-09 | Hiệu năng: hệ thống xử lý ≥ 39k task instance (110 node × 354 hộ) với query < 3s | Non-functional | OPC_UseCase_Specification §II.5 |
| BR-10 | File upload: bản scan văn bản GPMB (PDF) | Functional | OPC_UseCase_Specification §II.4 |

---

## 4. Business Constraints

| Loại | Ràng buộc |
|---|---|
| **Timeline** | MVP demo xong trong 3 ngày (deadline: 2026-05-02) |
| **Team** | Ước tính: AI-assisted solo development |
| **Infrastructure** | 1 server demo (local hoặc VPS nhỏ) |
| **Scope** | 22 UC, chỉ happy path, không audit log, không notification |
| **Data sensitivity** | Internal — dữ liệu hộ dân, số tiền bồi thường (confidential) |
| **Regulatory** | Luật Đất đai 2024 (quy trình GPMB theo pháp lý); không có yêu cầu GDPR/HIPAA/PCI |

---

## 5. Data Classification

| Loại dữ liệu | Classification | Ghi chú |
|---|---|---|
| Thông tin hộ dân (tên, địa chỉ, thửa đất) | Confidential | Demo dùng data mẫu, không real PII |
| Số tiền bồi thường / hồ sơ chi trả | Confidential | Chỉ Kế toán + GĐĐH xem detail |
| Cây quy trình GPMB | Internal | Public trong tổ chức |
| Trạng thái công việc / tiến độ | Internal | |
| Credentials (username/password) | Restricted | Bcrypt hash, JWT |

---

## 6. Success Criteria

MVP được coi là DONE khi:
- [ ] Demo 20 phút end-to-end không lỗi 500 / console error trên happy path
- [ ] Login/logout 4 role hoạt động
- [ ] Tạo hồ sơ GPMB → sinh cây task instance
- [ ] Import 354 hộ từ Excel thành công
- [ ] Gán hộ vào node per_household → sinh task instance đệ quy
- [ ] Ma trận pivot 354 hộ × N node hiển thị + Export Excel đúng format
- [ ] Tạo hồ sơ chi trả → gửi duyệt → GĐĐH duyệt → hộ tự chuyển trạng thái "Đã chi trả"
- [ ] Cập nhật ngày bàn giao → hộ "Đã bàn giao mặt bằng"

---

*Stakeholder sign-off pending — xem open questions trong `docs/prd.md §8`*
