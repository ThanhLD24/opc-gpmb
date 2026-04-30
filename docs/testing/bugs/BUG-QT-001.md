# BUG-QT-001 — Quy Trình: Thêm bước con thất bại + Form sửa bỏ qua phân quyền ✅ FIXED 2026-05-01

**Date:** 2026-05-01
**Reporter:** Tech Lead
**Severity:** P2
**Component:** Frontend — `/quy-trinh` page
**Sprint:** Post-Sprint 7 hotfix (pre-demo)

---

## Symptom 1: Không thể thêm bước con

Nhấn "Thêm bước con" → toast "Thêm bước thất bại" xuất hiện. Backend trả 422.

**Root cause:**
`addChildMutation` trong `quy-trinh/page.tsx:111-124` gửi POST `/workflow/nodes` thiếu 2 trường **required** trong `WorkflowNodeCreate`:
- `template_id: str` — required, không có default
- `level: int` — required, không có default

FE hiện gửi: `{ parent_id, name, per_household }` — thiếu `template_id` + `level`.

---

## Symptom 2: Form sửa hiển thị cho tất cả user nhưng chỉ admin mới lưu được

Form chỉnh sửa node và nút "Lưu thay đổi" hiển thị với cả non-admin user. Backend `PUT /workflow/nodes/{id}` yêu cầu `require_roles(RoleEnum.admin)` → non-admin nhận 403 nhưng FE chỉ hiện toast "Cập nhật thất bại" — không rõ lý do.

Tương tự: nút "Thêm bước con" cũng hiển thị với non-admin nhưng sẽ fail (403 sau khi fix bug 1).

**Root cause:** `isAdmin` guard chỉ áp dụng cho nút Import/Export (line 159), không áp dụng cho form edit và action buttons.

---

## Symptom 3: Chỉ thấy 1 quy trình — NOT A BUG

By design: endpoint `GET /workflow/template` chỉ trả active template. Không cần fix.
