# Sprint 7 Feature Brief — OPC GPMB

**Author:** Product Owner  
**Date:** 2026-04-30  
**Input:** Sprint 6 closed ✅ GO, handoff-log Entry 013  
**Status:** ✅ READY FOR TECH LEAD

---

## 1. Context

Sprint 6 đã hoàn thành UC-02 Quản lý Hộ chung + UC-04 Quản lý Công việc chung. Hệ thống có đủ core MVP. Sprint 7 tập trung vào **UX improvements cho stakeholder chính** (GDDH + tất cả users) và bảo mật cơ bản trước khi đưa vào vận hành chính thức.

---

## 2. Sprint 7 Scope — Confirmed IN

### S7-01 — Đổi mật khẩu (Change Password)
**Priority:** MUST (P0 — security baseline)  
**Persona:** Tất cả 4 roles  
**Problem:** Users không thể tự đổi mật khẩu. Admin phải reset trực tiếp trong DB. Không chấp nhận được khi đưa vào production.

**Acceptance Criteria:**
- AC-1: Mỗi user có menu "Đổi mật khẩu" trên header hoặc profile section
- AC-2: Form yêu cầu: mật khẩu hiện tại, mật khẩu mới (min 8 ký tự), xác nhận mật khẩu mới
- AC-3: Sai mật khẩu hiện tại → lỗi "Mật khẩu hiện tại không đúng" (HTTP 400)
- AC-4: Mật khẩu mới ≠ xác nhận → lỗi validation phía FE (không gửi API)
- AC-5: Đổi thành công → toast "Đổi mật khẩu thành công" + giữ session (không logout)
- AC-6: `[SECURITY]` Password hash dùng bcrypt (đã có trong passlib stack) — không lưu plaintext

**Success metric:** 100% users có thể tự đổi mật khẩu mà không cần admin can thiệp DB.

---

### S7-02 — GDDH Phê duyệt Inbox (Approval Inbox)
**Priority:** MUST (P0 — core GDDH workflow)  
**Persona:** GDDH (Giám đốc điều hành)  
**Problem:** GDDH hiện phải vào từng hồ sơ → tab Chi trả → tìm chi trả "chờ duyệt". Với nhiều hồ sơ (4 hiện tại, sẽ tăng), GDDH không có view tổng hợp để phê duyệt. Luồng phê duyệt bị tắc nghẽn.

**Acceptance Criteria:**
- AC-1: Trang `/phe-duyet` (sidebar: "Phê duyệt", icon CheckCircleOutlined) — chỉ hiển thị với role GDDH + Admin
- AC-2: Tab 1 "Chờ duyệt": list tất cả chi trả có `trang_thai = cho_duyet` cross-hồ-sơ, paginated 20/trang
- AC-3: Tab 2 "Lịch sử": list chi trả đã xử lý (da_phe_duyet + tu_choi) cross-hồ-sơ, paginated
- AC-4: Mỗi row hiển thị: Hồ sơ code/name | Tên hộ | Số tiền tổng | Ngày tạo | Trạng thái
- AC-5: Click row → mở modal chi tiết chi trả (đọc thông tin + 2 nút: Phê duyệt / Từ chối)
- AC-6: Phê duyệt/Từ chối từ modal → cập nhật ngay list (invalidate query) — không cần refresh
- AC-7: Badge count trên sidebar item hiển thị số lượng chi trả "chờ duyệt" (real-time khi vào trang)
- AC-8: Khi list "Chờ duyệt" rỗng → Empty "Không có chi trả nào chờ phê duyệt"

**Success metric:** GDDH xử lý toàn bộ queue phê duyệt từ 1 màn, không cần điều hướng qua hồ sơ.

---

### S7-03 — In-app Notifications (Basic)
**Priority:** SHOULD (P1)  
**Persona:** CBCQ, Kế toán, GDDH  
**Problem:** Bell icon hiện tại luôn count=0. Không có thông báo khi có sự kiện quan trọng. Users phải tự check.

**Acceptance Criteria:**
- AC-1: Bảng `notifications` trong DB: id, user_id, title, body, is_read, created_at, link_url
- AC-2: Notification tạo tự động khi: chi trả được gửi duyệt (→ GDDH), chi trả được duyệt/từ chối (→ Kế toán)
- AC-3: Bell icon header hiển thị count số notif chưa đọc (polling mỗi 60s hoặc khi focus tab)
- AC-4: Click bell → dropdown danh sách 10 notif gần nhất (title + thời gian + is_read)
- AC-5: Click notif → navigate đến link_url + đánh dấu đã đọc (PATCH /notifications/{id}/read)
- AC-6: "Đánh dấu tất cả đã đọc" button trong dropdown
- AC-7: Count trên badge tự cập nhật sau khi đọc

**Success metric:** Không còn bell icon count=0 tĩnh. Kế toán và GDDH nhận thông báo khi cần xử lý.

---

## 3. Sprint 7 Scope — Deferred OUT

| Feature | Lý do defer |
|---------|-------------|
| UC-09 Phân quyền per-project | Phức tạp (schema thay đổi, UI per-hồ-sơ). Defer Sprint 8. |
| PDF export Kế hoạch tháng | Low demand ngay lúc này. Excel đang đủ dùng. Defer Sprint 8. |
| 6 role đầy đủ | Scope creep — 4 role hiện tại đáp ứng đủ. Review lại sau. |

---

## 4. Business Justification

| Story | Business Impact | Effort est. |
|-------|----------------|-------------|
| S7-01 Đổi mật khẩu | Production-required security | Low (2 endpoints + form) |
| S7-02 GDDH Inbox | Unblocks GDDH workflow — high-impact user | Medium (2 tabs + modal + sidebar badge) |
| S7-03 Notifications | Proactive workflow — reduces missed actions | Medium (1 new table + polling + dropdown) |

**Sprint 7 total:** 3 features, 2 MUST + 1 SHOULD. Khả thi trong 1 sprint.

---

## 5. Out of Scope (Sprint 7)

- Real-time notifications via WebSocket (polling đủ cho Sprint 7)
- Push notifications (mobile/browser)
- Notification preferences per user
- Admin notification management

---

## 6. Open Questions for Tech Lead

- **OQ-01:** S7-02 GDDH Inbox — dùng lại API hiện có của chi_tra.py hay cần endpoint riêng `GET /phe-duyet`?
  → TL quyết định (cả 2 đều feasible, endpoint riêng clean hơn)
- **OQ-02:** S7-03 Notifications — polling 60s hay Server-Sent Events?
  → Recommendation: polling (đơn giản, đủ dùng Sprint 7)
- **OQ-03:** S7-03 Notification triggers — chỉ cho chi trả hay cả task status changes?
  → PO recommendation: chỉ chi trả trong Sprint 7; task notifications Sprint 8
