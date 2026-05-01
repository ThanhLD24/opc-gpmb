# OPC — PROJECT CONTEXT

**Project Name:** OPC (Odin Project Clearance)
**Subtitle:** Phần mềm hỗ trợ điều hành Giải phóng mặt bằng (GPMB)
**Phase:** MVP — Demo Khách hàng
**Target Deadline:** 2026-05-02 (còn ~3 ngày từ 2026-04-29)

## Tech Stack ✅ CONFIRMED + RUNNING
- **FE:** Next.js 14 (App Router) + TypeScript + Ant Design 5 → port 3000
- **BE:** Python 3.11 + FastAPI + SQLAlchemy 2.0 (async) + asyncpg → port 8000
- **DB:** PostgreSQL 15 (Docker) → opc_gpmb database
- **Auth:** JWT (python-jose + passlib[bcrypt==4.0.1])
- **Excel:** openpyxl (import hộ, pivot export)

## Credentials Demo
- admin / Admin@123
- cbcq / Cbcq@123
- ketoan / Ketoan@123
- gddh / Gddh@123

## Implementation Status (2026-04-29)

### ✅ DONE — 22/22 UC MVP implemented + backend running
| Module | UC | Status |
|---|---|---|
| Auth | UC-00-01 login, UC-00-05 logout | ✅ |
| Quy trình template | UC-03-01 CRUD node, UC-03-03 custom field config | ✅ |
| Hồ sơ GPMB | UC-01-01 list, UC-01-02 detail (5 tabs), UC-01-03 tạo mới | ✅ |
| Hộ | UC-02-01 list, UC-02-03 add, UC-02-06 import Excel | ✅ |
| Task | UC-04-01 list/tree, UC-04-03 detail, UC-04-04 status, UC-04-07 custom field+upload | ✅ |
| Task scope | UC-04-11 gán hộ vào nhánh, UC-04-12 pivot matrix + export | ✅ |
| Chi trả | UC-06-01–06-06 full flow (tạo→duyệt→bàn giao) | ✅ |
| Seed | 453 hộ, 114 workflow nodes, 4 users, demo data HB001 | ✅ |

### ⚠️ KNOWN BUGS FIXED TODAY
- Chi trả tab: `rawData.some is not a function` → fixed (paginated → items[])
- Chi trả API: no Ho object in response → fixed (selectinload + ho dict)
- ChiTraForm: multipart instead of JSON → fixed
- TypeScript: 6 errors → fixed (0 errors now)
- ngay_ban_giao field name mismatch → fixed

### 🔴 UNTESTED / NEEDS MANUAL VERIFICATION
1. **Quy trình template page** (`/quy-trinh`) — CRUD node, custom field toggle
2. **Task detail + file upload** — custom field entry, scan file upload
3. **Pivot tab** — scope assignment, matrix render, Excel export
4. **End-to-end demo flow**: tạo hồ sơ → thêm hộ → gán quy trình → hoàn thành task → chi trả → bàn giao
5. **Hộ status transitions**: moi→dang_xu_ly→da_thong_nhat (manual) → da_chi_tra (auto) → da_ban_giao (auto)
