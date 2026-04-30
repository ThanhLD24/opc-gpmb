# BUG-CV-001 — Danh sách công việc không phân biệt được hộ trong per_household node

**Date:** 2026-05-01
**Reporter:** Tech Lead
**Severity:** P2
**Component:** Frontend `/cong-viec` + Backend `GET /tasks`

---

## Symptom

Khi một workflow node có `per_household=True`, hệ thống tạo 1 `task_instance` per hộ. Tuy nhiên, trang `/cong-viec` hiển thị danh sách mà **không có cột "Hộ"**, khiến các dòng cùng hồ sơ + cùng tên công việc trông giống hệt nhau — không phân biệt được task nào thuộc hộ nào.

**Ví dụ:** Hồ sơ HS-001 có node "Đền bù đất" (`per_household=True`) với 5 hộ → 5 dòng giống hệt:

| Hồ sơ | Tên công việc | Trạng thái |
|-------|--------------|------------|
| HS-001 | Đền bù đất | Đang thực hiện |
| HS-001 | Đền bù đất | Đang thực hiện |
| HS-001 | Đền bù đất | Hoàn thành |
| HS-001 | Đền bù đất | Đang thực hiện |
| HS-001 | Đền bù đất | Đang thực hiện |

---

## Root Cause

**Backend** `backend/app/api/v1/global_tasks.py:72-99`:
- JOIN chain: `TaskInstance → HoSoWorkflowNode → HoSoGPMB → User` — **thiếu LEFT JOIN `Ho`**
- SELECT không có `TaskInstance.ho_id`, `Ho.ma_ho`, `Ho.ten_chu_ho`
- Response item không trả `ho_id`, `ma_ho`, `ten_chu_ho`

**Frontend** `frontend/src/app/(dashboard)/cong-viec/page.tsx`:
- `CongViecItem` interface không có `ho_id | ma_ho | ten_chu_ho`
- `buildColumns()` không có cột "Hộ"
