# OPC — PROJECT CONTEXT

**Project Name:** OPC (Odin Project Clearance)
**Subtitle:** Phần mềm hỗ trợ điều hành Giải phóng mặt bằng (GPMB)
**Phase:** Post-Demo — Active Development
**Demo:** ✅ 2026-05-02 COMPLETED | **Last sync:** 2026-05-05

## Tech Stack ✅ CONFIRMED + RUNNING
- **FE:** Next.js 14 (App Router) + TypeScript + Ant Design 5 → port 3000
- **BE:** Python 3.11 + FastAPI + SQLAlchemy 2.0 (async) + asyncpg → port 8000
- **DB:** PostgreSQL 15 (Docker) → opc_gpmb database
- **Auth:** JWT (python-jose + passlib[bcrypt==4.0.1])
- **PDF:** reportlab 4.2.5 (kế hoạch tháng export)
- **Excel:** openpyxl (import hộ, pivot export)
- **Git:** ✅ Initialized (34 commits on `main`)

## Credentials Demo
- admin / Admin@123
- cbcq / Cbcq@123
- ketoan / Ketoan@123
- gddh / Gddh@123

---

## Implementation Status — 2026-05-05 (HEAD: 529ebcd)

### ✅ DONE — Tất cả Sprint 1–8 + UI Polish

#### Sprint 1–6 (BMAD)
| Module | UC | Status |
|---|---|---|
| Auth | UC-00-01 login, UC-00-05 logout, đổi mật khẩu (S7) | ✅ |
| Quy trình template | UC-03-01 CRUD node, UC-03-03 custom field config | ✅ |
| Hồ sơ GPMB | UC-01-01 list, UC-01-02 detail (**6 tabs**), UC-01-03 tạo mới | ✅ |
| Hộ | UC-02-01 list, UC-02-03 add, UC-02-06 import Excel | ✅ |
| Task | UC-04-01 list/tree, UC-04-03 detail, UC-04-04 status, UC-04-07 custom field+upload | ✅ |
| Task scope | UC-04-11 gán hộ vào nhánh, UC-04-12 pivot matrix + export Excel | ✅ |
| Chi trả | UC-06-01–06-06 full flow (tạo→duyệt→bàn giao) | ✅ |
| Kế hoạch tháng | UC-05 tạo/sửa kế hoạch, export Excel + PDF | ✅ |
| Seed | 534 hộ, 114 workflow nodes, 4 users, demo data | ✅ |

#### Sprint 7 (BMAD — 2026-04-30 → 05-01) — TQE: 35/35 PASS
| Feature | Status |
|---|---|
| Đổi mật khẩu (PATCH /auth/change-password, bcrypt) | ✅ |
| In-app Notifications (bell icon, polling 60s, mark-read) | ✅ |
| GDDH Phê duyệt Inbox (`/phe-duyet`, 2 tabs, approve/reject modal) | ✅ |
| UC-09 CBCQ phân quyền (auto-filter 3 endpoints) | ✅ |
| PDF export Kế hoạch tháng (reportlab) | ✅ |

#### Sprint 8-F1 (BMAD — 2026-05-01) + Post-demo Manual Commits
| Feature | Commit | Status |
|---|---|---|
| Fix `my_tasks=true` cho ke_toan/gddh (BE) | ba82a7a | ✅ |
| TaskDetail phân quyền: `canFillFinance` cho ke_toan | 50a390a | ✅ |
| CBCQ click task từ /cong-viec → TaskDetail drawer | 85fdb92 | ✅ |
| Fix reload state sau khi đổi trạng thái task | 7f78dd8 | ✅ |
| Dashboard UI upgrade (recharts, statistic cards, clickable) | 42714f1 | ✅ |
| Active menu highlight, background color, logo height | f97d6e1..d264d32 | ✅ |
| Scroll cho workflow tree | 9436951 | ✅ |
| Fix table color + profile section | 88b8ede | ✅ |
| Workflow tree display fix | fac9ccc | ✅ |
| Workflow detail layout cải thiện | 32fcc5a | ✅ |
| Sort tasks theo workflow order (BE: global_tasks.py) | 74791ee | ✅ |
| **Tab mới: "Tiến độ theo hộ"** (hồ sơ detail tab 4) | 529ebcd | ✅ |
| Search hộ theo tên (BE: global_ho.py `?search=`) | 03036e9 | ✅ |
| Fix /ho-dan + header/layout relayout | 03036e9..36f326b | ✅ |

### 📂 Cấu trúc Tab hồ sơ GPMB (`/ho-so-gpmb/[id]`) — hiện tại
```
Tab 1: Thông tin chung
Tab 2: Hộ ({so_ho})
Tab 3: Quy trình & Tiến độ
Tab 4: Tiến độ theo hộ   ← thêm 2026-05-03
Tab 5: Chi trả
Tab 6: Kế hoạch tháng
```

---

#### Sprint 9 — Logic Ngày Tháng & Tiến Độ (2026-05-05)
| Feature | Commit | Status |
|---|---|---|
| DB migration: `is_parallel`, `planned_start/end_date` (HoSoWorkflowNode), `actual_start/end_date` (TaskInstance) | 95bbdde | ✅ |
| Workflow admin API: `is_parallel` flag on nodes (create/update/serialize + snapshot propagation) | 95bbdde | ✅ |
| New `task_date_service.py`: `calculate_planned_dates` (sequential + parallel group logic), `set_actual_start_for_next`, `set_actual_end` | 95bbdde | ✅ |
| Hook: task status `hoan_thanh` triggers `set_actual_end` + next-task `actual_start` propagation | 95bbdde | ✅ |
| `POST /ho-so/{id}/recalculate-dates` endpoint (admin) + auto-trigger on workflow init | 95bbdde | ✅ |
| Expose `planned_*`, `actual_*`, `tien_do` in `GET /tasks` global list | 95bbdde | ✅ |
| FE: `is_parallel` checkbox + "Song song" badge in `/quy-trinh` node editor | af03a74 | ✅ |
| FE: 4 date columns + Tiến độ column in `/cong-viec` table | af03a74 | ✅ |
| DB reseed after migration (schema+data reset) | manual | ✅ |

## 🔴 Còn pending

| Item | Priority | Artifact |
|---|---|---|
| **TQE Sprint 9** (test date logic, parallel group, progress evaluation) | 🔴 Must test | `docs/testing/sprint-9-results.md` (to be created) |
| **TQE Sprint 8-F1 + manual commits** (no sprint-8-results.md yet) | 🟡 Low priority | — |

---

## BMAD Handoff Log
- Entry 020 (2026-05-01): Sprint 8-F1 COMPLETE
- Entry 021 (2026-05-05): Sync 20 manual commits (2026-05-02 → 05-03) + Sprint 9 kickoff
- Entry 022 (2026-05-05): Sprint 9 COMPLETE (BE 95bbdde + FE af03a74)
- **Next step:** invoke `/tester-qe` to test Sprint 9

## TypeScript Build
- **0 errors** (verified 2026-05-05 trên HEAD `af03a74`)
