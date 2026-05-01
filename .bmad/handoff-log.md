# BMAD Handoff Log — OPC GPMB

## Entry 020 — 2026-05-01
**From:** Tech Lead (Sprint 8-F1)
**To:** Testing / Done
**Artifacts:** Sprint 8-F1 implemented and committed
**Status:** ✅ COMPLETE

### Summary
- **S8-BE-01** — `global_tasks.py`: xóa `my_tasks` cbcq filter bug, ke_toan/gddh thấy tất cả tasks (48K tasks); thêm 403 guard trên `update_task_status`; phân quyền field-level trên `update_task_fields` (ke_toan chỉ finance fields)
- **S8-FE-01** — `TaskDetail.tsx`: thêm `canFillFinance`/`canSave`, ke_toan thấy finance fields + Upload, không thấy Switch status và admin fields
- TypeScript: 0 errors
- Commits: ba82a7a (BE), 50a390a (FE)

### Open items
- S8-F2 (task attachments) chưa implement
- Sprint 8-F1 kickoff saved tại `docs/architecture/sprint-8-f1-kickoff.md`

---

## Entry 019 — 2026-05-01
**From:** Product Owner
**To:** Tech Lead (Sprint 8 planning)
**Artifacts:** 2 feature briefs cho Sprint 8
**Status:** ✅ COMPLETE — feature briefs saved, ready for TL sprint planning

### Summary
- **S8-F1** — Fix "Công việc của tôi" + phân quyền action buttons theo role (`docs/features/s8-cong-viec-cua-toi-fix-brief.md`)
- **S8-F2** — Đính kèm tài liệu cho công việc — bảng `task_attachments` mới, 4 endpoints, FE section trong TaskDetail (`docs/features/s8-task-attachments-brief.md`)

### Open items
- S8-F1: Cần TL xác nhận bảng phân quyền (ke_toan có quyền gì trên task status/fields)
- S8-F2: Cần TL quyết định storage strategy (local disk giữ nguyên hay S3)

---

## Entry 018 — 2026-05-01
**From:** BMAD Orchestrator (post-demo hotfixes)
**To:** Continuous improvement
**Artifacts:** Multiple bug fixes and UX improvements
**Status:** ✅ COMPLETE — 5 issues resolved, all committed

### Summary
- **BUG-QT-001** (FIXED): `addChildMutation` thiếu `template_id`+`level` → 422; non-admin form guard missing
- **BUG-CV-001** (FIXED): Task list không hiển thị hộ cho per_household nodes — added `Ho` JOIN + "Hộ" column
- **Hydration error** (FIXED): `getCurrentUser()` called in render body → created `useCurrentUser()` hook, applied to 7 components
- **Feature: Task processing in /cong-viec** (ADDED): CBCQ can now click tasks → open TaskDetail drawer
- **Feature: Active workflow display in hồ sơ form** (ADDED): Show active template name before creating hồ sơ
- Git initialized, initial commit made (134 files), all subsequent fixes committed

### Open items
- Vấn đề 2 (workflow selection): design decision confirmed — single active workflow only. No feature request filed yet.
- Post-demo sprint 8 scope: not yet defined

---

## Entry 017 — 2026-05-01
**From:** Tech Lead
**To:** Demo / Product Owner sign-off
**Artifacts:** `docs/testing/release-readiness-sprint-7.md`
**Status:** ✅ APPROVED — Sprint 7 released, demo ready for 2026-05-02
**Branch:** N/A (no git)

### Summary
- Sprint 7 release readiness reviewed against TQE results (35/35 passed)
- [SECURITY] change-password story confirmed: bcrypt, no plaintext log, no password in response
- BUG-S7-001 (phe-duyet redirect) fixed and re-verified
- DEVIATION acknowledged: sidebar badge count (TL-approved gap fix)
- All 12 demo flows confirmed ready
- Risk register documented (CBCQ filter count explanation for demo audience)
- **DECISION: APPROVED FOR DEMO 2026-05-02**
- No Sprint 8 scope defined — project at MVP demo phase, no further sprint needed

---

## Entry 016 — 2026-05-01
**From:** Tester & QE
**To:** Tech Lead (sprint sign-off / demo prep)
**Artifacts:** `docs/testing/sprint-7-results.md`
**Status:** ✅ GO — 35/35 TCs passed, 1 bug found & fixed in-session
**Branch:** N/A (no git)

### Summary
- **35 TCs total** (20 API + 15 Playwright UI) — **35/35 PASSED**
- **BUG-S7-001 (P2, FIXED):** `phe-duyet/page.tsx` used `redirect()` from `next/navigation` in render body of `'use client'` component — fired during SSR because `getCurrentUser()` returns `null` when `typeof window === 'undefined'`. Fixed to `useEffect` + `useRouter` pattern (same as `ho-so-gpmb/page.tsx`).
- **Additional fix (not in kickoff):** Sidebar badge count for `/phe-duyet` added to `layout.tsx` — polls `GET /phe-duyet?tab=cho_phe_duyet&page_size=1` every 60s, shows Badge for gddh+admin.
- **Security verified:** bcrypt via passlib, no plaintext password in logs/responses, cross-user notification access → 404
- **UC-09 verified:** CBCQ auto-filter confirmed at code level (demo data has all ho_so assigned to cbcq, so counts appear same — behavior is correct)
- **PDF verified:** `application/pdf`, valid v1.4, 1 page, correct filename `ke-hoach-04-2026.pdf`
- **TypeScript:** 0 errors
- **Regression:** Dashboard, ho-so-gpmb, sidebar navigation all intact
- **Verdict:** SYSTEM READY FOR 2026-05-02 DEMO

### Open Items
- None — all Sprint 7 ACs verified, quality gate fully passed

---

## Entry 015 — 2026-04-30
**From:** Tech Lead
**To:** Backend Engineer ∥ Frontend Engineer (parallel)
**Artifacts:** `docs/architecture/sprint-7-kickoff.md`
**Status:** ✅ READY — sprint kickoff locked, engineers can proceed
**Branch:** N/A (no git)

### Summary
- Sprint 7 scope: 5 features → 6 stories (3 BE + 3 FE)
- **S7-BE-01:** Đổi mật khẩu [SECURITY] + `notifications` table + GET/PATCH notif endpoints
- **S7-BE-02:** `GET /api/v1/phe-duyet` GDDH Inbox (2 tabs) + chi_tra notification triggers
- **S7-BE-03:** UC-09 CBCQ visibility restriction (3 endpoints) + PDF export ke_hoach (`reportlab==4.2.5`)
- **S7-FE-01:** ChangePasswordModal (header dropdown) + NotificationDropdown (bell icon, polling 60s)
- **S7-FE-02:** `/phe-duyet` page (2 tabs + approve/reject modal) + sidebar badge (gddh+admin)
- **S7-FE-03:** UC-09 FE (hide CBCQ filter for cbcq role, auto-enable tasks tab) + PDF download button
- DB migration: `notifications` table (psql direct, no alembic)
- New dependency: `reportlab==4.2.5` (PDF library, BSD license, no system deps)
- ADRs locked: polling (not WebSocket), reportlab (not weasyprint), UC-09 BE-only (no new table)

---

## Entry 014 — 2026-04-30
**From:** Product Owner
**To:** Tech Lead (Sprint 7 kickoff)
**Artifacts:** `docs/features/sprint-7-brief.md`
**Status:** ✅ UNBLOCKED — Sprint 7 scope locked, 3 features prioritized
**Branch:** N/A (no git)

### Summary
- Sprint 6 fully closed (BUG-S6-001 fixed). Sprint 7 scope defined.
- **S7-01 Đổi mật khẩu (MUST):** Change password form, bcrypt, giữ session, `[SECURITY]`
- **S7-02 GDDH Phê duyệt Inbox (MUST):** `/phe-duyet` page, 2 tabs (Chờ duyệt + Lịch sử), modal duyệt/từ chối, sidebar badge count
- **S7-03 In-app Notifications (SHOULD):** `notifications` table, bell icon polling 60s, dropdown 10 notif, mark-read; triggers: chi trả submitted → GDDH, duyệt/từ chối → Kế toán
- **Deferred:** UC-09 phân quyền, PDF export → Sprint 8
- 3 open questions for TL (OQ-01..03) — see brief

---

## Entry 013 — 2026-04-30
**From:** Tech Lead
**To:** Product Owner / Tester QE
**Artifacts:** `docs/testing/bugs/BUG-S6-001-fix-plan.md`
**Status:** ✅ BUG-S6-001 FIXED — `ho_so.py` le=100 → le=500, filter dropdowns verified working
**Branch:** N/A (no git)

### Summary
- BUG-S6-001 (P2): `GET /ho-so` endpoint `page_size` constraint `le=100` → raised to `le=500`
- Fix: 1 line in `backend/app/api/v1/ho_so.py` line 148
- Before: `page_size=200` → 422; After: `page_size=200` → 200 ✅
- Verified via Playwright screenshot: `/ho-dan` filter dropdown shows all 4 hồ sơ options (RH-0232323, HS-202504-003, HS-202504-002, HS-202504-001)
- 0 console errors after fix (was 2 errors before)
- Sprint 6 verdict upgraded: ✅ GO (all issues resolved)

---

## Entry 012 — 2026-04-30
**From:** Tester QE
**To:** Product Owner / Tech Lead
**Artifacts:** `docs/testing/sprint-6-results.md`
**Status:** ⚠️ GO WITH BUG — Sprint 6, 14/15 TCs passed, BUG-S6-001 (P2) found by user after initial sign-off
**Branch:** N/A (no git)

### Summary
- Sprint 6 tested: UC-02 Quản lý Hộ chung + UC-04 Quản lý Công việc chung — 4 stories (2 BE + 2 FE)
- **BUG-S6-001 (P2):** Filter dropdowns empty trên /ho-dan và /cong-viec — `/ho-so?page_size=200` trả 422 vì BE constraint `le=100`. Fix: `backend/app/api/v1/ho_so.py` line 148 đổi `le=100` → `le=500`
- **API TCs (10/10):** `/ho` + `/tasks` endpoints all correct
- **UI TCs (4/5):** Sidebar ✅, table data ✅, tabs ✅; filter dropdown options ❌ (BUG-S6-001)
- **Regression:** Dashboard (Sprint 4) + Hồ sơ list (Sprint 1) both intact
- **17/18 quality gates GREEN — 1 FAILED**
- Next: Tech Lead apply 1-line BE fix → TQE re-verify → Sprint 7 planning

---

## Entry 011 — 2026-04-30
**From:** Tech Lead (acting as BE + FE — sub-agents hit rate limit)
**To:** Tester QE
**Artifacts:** `docs/architecture/sprint-6-kickoff.md`
**Status:** ✅ READY FOR QE — Sprint 6 implemented, Playwright verified
**Branch:** N/A (no git)

### Summary
- Sprint 6 scope: UC-02 Quản lý Hộ chung + UC-04 Quản lý Công việc chung
- **S6-BE-01:** `backend/app/api/v1/global_ho.py` — `GET /api/v1/ho` cross-hồ-sơ, paginated (534 hộ verified), filters: ho_so_id, trang_thai, cbcq_id
- **S6-BE-02:** `backend/app/api/v1/global_tasks.py` — `GET /api/v1/tasks` flat, paginated, filters: ho_so_id, my_tasks=true; HTTP 400 guard for non-admin no-filter
- **S6-FE-01:** `frontend/src/app/(dashboard)/ho-dan/page.tsx` — /ho-dan page renders 534 hộ, 3 filters, pagination, click row → hồ sơ detail
- **S6-FE-02:** `frontend/src/app/(dashboard)/cong-viec/page.tsx` — /cong-viec page, Tab 1 (filter required + empty state), Tab 2 "Việc của tôi" (my_tasks=true, no filter needed)
- **Sidebar:** layout.tsx updated — TeamOutlined "Quản lý Hộ dân" + CheckSquareOutlined "Quản lý Công việc" (all roles)
- **router.py:** global_ho + global_tasks registered as `/ho` + `/tasks` top-level routes
- TypeScript: 0 errors
- Playwright verified: both pages render, tabs correct, empty state correct, data loads
- No DB migrations — all queries use existing tables via JOIN

---

## Entry 010 — 2026-04-30
**From:** Tester QE
**To:** Product Owner / Tech Lead
**Artifacts:** `docs/testing/sprint-5-results.md`
**Status:** ✅ GO — Sprint 5 complete, 6/6 TCs passed, BUG-S5-001 fixed by TL in-session
**Branch:** N/A (no git)

### Summary
- Sprint 5 tested: UC-05 Kế hoạch chi trả tháng — 4 stories (2 BE + 2 FE), 5 API TCs + 1 UI TC
- 1 bug found: **BUG-S5-001 (P2)** — list endpoint không trả `items` field → FE table shows "No data" mặc dù 10 items tồn tại trong DB
- BUG-S5-001 (list endpoint thiếu `include_items=True`) found by TQE, fixed by TL in-session (3 lines: selectinload + include_items=True). Verified: list trả items ✅
- All ACs ✅: generate 201/409, PATCH 200, DELETE 204/400, export xlsx 5588B, da_xuat_bao_cao=true, banner vàng, ViecPhatSinhModal, role guard API 403 + UI hidden buttons, 0 TS errors, items table renders data
- 18/18 quality gates GREEN
- Recommended Sprint 6: UC-09 phân quyền, notifications, PDF export

---

## Entry 009 — 2026-04-30
**From:** Tech Lead
**To:** Backend Engineer ∥ Frontend Engineer (parallel)
**Artifacts:** `docs/architecture/sprint-5-kickoff.md`
**Status:** ✅ READY — sprint kickoff locked, engineers can proceed
**Branch:** N/A (no git)

### Summary
- Sprint 4 TQE GO (5/5 TCs) + PO unblocked UC-05 (Entry 008) → Sprint 5 planning complete
- Sprint 5 scope: UC-05 Kế hoạch chi trả tháng — 4 stories (2 BE + 2 FE)
- DB migration: 2 new tables (`ke_hoach_thang` + `ke_hoach_thang_item`) via psql CREATE TABLE IF NOT EXISTS — no ALTER TYPE risk
- ADRs locked: auto-gen từ task_instance (status != hoan_thanh), no lock sau xuất (banner only), Excel only (openpyxl), tab 6 trong detail page
- BE critical path: S5-BE-01 (migration + auto-gen + CRUD) → S5-BE-02 (việc phát sinh + export)
- FE critical path: S5-FE-01 (tab + view + inline edit) → S5-FE-02 (phát sinh modal + Excel download)
- No [SECURITY]-tagged stories; no new npm/pip dependencies
- Deferred: UC-09 phân quyền, notifications, PDF export → Sprint 6

---

## Entry 008 — 2026-04-30
**From:** Product Owner
**To:** Tech Lead (Sprint 5 kickoff)
**Artifacts:** `docs/features/uc-05-ke-hoach-thang-brief.md`
**Status:** ✅ UNBLOCKED — KH-01..04 answered, UC-05 ready for Sprint 5 planning
**Branch:** N/A (no git)

### Summary
- UC-05 "Kế hoạch chi trả tháng" unblocked: PO answered all 4 open questions
- **KH-01 (tạo thủ công vs auto):** AUTO-GENERATE từ task_instance + CBCQ thêm "việc phát sinh" thủ công
- **KH-02 (granularity):** 1 kế hoạch / hồ sơ / tháng (UNIQUE ho_so_id + thang + nam)
- **KH-03 (lock sau xuất báo cáo):** Không lock — hiển thị banner cảnh báo vàng, vẫn cho sửa
- **KH-04 (format xuất):** Excel only Sprint 5; PDF defer Sprint 6
- Data model: 2 bảng mới (`ke_hoach_thang` + `ke_hoach_thang_item`), không ALTER TYPE
- API: 7 endpoints, BE critical path: generate + export Excel
- 8 Acceptance Criteria defined, role guards specified
- Recommended Sprint 5 scope: UC-05-01/01a/02/02a/03 (Xem + Auto-gen + Sửa + Việc phát sinh + Xuất Excel)
- Sprint 5 can also include: UC-09 Phân quyền per-project, hoặc notifications (PO defers to TL judgment)

---

## Entry 007 — 2026-04-30
**From:** Tester QE
**To:** Product Owner / Tech Lead (Sprint 5 planning or demo sign-off)
**Artifacts:** `docs/testing/sprint-4-results.md`
**Status:** ✅ GO — Sprint 4 complete, 5/5 TCs passed, 0 bugs found
**Branch:** N/A (no git)

### Summary
- Sprint 4 tested: Dashboard Bar+Pie charts, Bàn giao mặt bằng (UC-06), Demo data seed (idempotent)
- 0 bugs found — cleanest sprint yet
- State machine fully closed: chi trả da_phe_duyet → da_ban_giao + ho → da_ban_giao (atomic transaction)
- Demo data: 3 hồ sơ, 19 chi trả, 8 da_ban_giao, 5 da_phe_duyet — dashboard/báo cáo looks rich
- Demo Readiness Checklist: ALL 8 items ✅ — system READY for May 2 demo
- Recommended Sprint 5: UC-05 Kế hoạch tháng (khi PO trả lời KH-01..04), UC-09 phân quyền, notifications

---

## Entry 006 — 2026-04-30
**From:** Tech Lead
**To:** Backend Engineer ∥ Frontend Engineer (parallel)
**Artifacts:** `docs/architecture/sprint-4-kickoff.md`
**Status:** ✅ READY — sprint kickoff locked, engineers can proceed
**Branch:** N/A (no git)

### Summary
- Sprint 3 TQE GO (5/5 TCs), now planning Sprint 4 — final sprint trước demo May 2
- Sprint 4 scope: 3 stories — UC-06 Bàn giao mặt bằng (đóng state machine), Dashboard Bar+Pie charts, Demo data enrichment
- DEFER UC-05 Kế hoạch tháng tiếp sang Sprint 5 (4 open questions PO chưa trả lời, không đủ thời gian)
- DB migration KHÔNG cần — toàn bộ schema đã sẵn sàng từ Sprint 3 (audit_log, chitrastatusenum.da_ban_giao đã tồn tại)
- ADRs locked: bàn giao 1 chiều + transaction (chi trả + hộ cùng), recharts thay AntV, seed idempotent
- BE critical path: S4-BE-01 (ban-giao) → S4-BE-02 (seed)
- FE critical path: S4-FE-02 (charts độc lập) → S4-FE-01 (đợi BE-01)

---

## Entry 005 — 2026-04-30
**From:** Tester QE
**To:** Product Owner / Tech Lead (Sprint 4 planning)
**Artifacts:** `docs/testing/sprint-3-results.md`
**Status:** ✅ GO — Sprint 3 complete, 5/5 TCs passed
**Branch:** N/A (no git)

### Summary
- Sprint 3 tested: Báo cáo chi trả, Dashboard tổng quan, Sửa & Tái gửi chi trả bị từ chối, Audit log
- 1 bug found pre-test by TL (BUG-S3-001: missing `da_ban_giao` value in PostgreSQL enum) — fixed via `ALTER TYPE`
- All quality gates GREEN — TypeScript 0 errors, all AC verified via Playwright + API
- Audit log verified append-only: 4 entries DESC (tai_gui → tu_choi → gui_duyet → tao) on test chi trả
- Recommended Sprint 4: UC-05 Kế hoạch chi trả tháng (need PO answers KH-01..04 first), UC-06 Bàn giao mặt bằng

---

## Entry 004 — 2026-04-29
**From:** Tech Lead  
**To:** Backend Engineer ∥ Frontend Engineer (parallel)  
**Artifacts:** `docs/architecture/sprint-3-kickoff.md`  
**Status:** ✅ READY — sprint kickoff locked, engineers can proceed  
**Branch:** N/A (no git)

### Summary
- Sprint 2 TQE sign-off (10/10 TCs, 2 bugs fixed)
- Sprint 3 scope: 4 stories — Báo cáo chi trả (UC-07-01), Sửa/tái gửi chi trả bị từ chối, Dashboard tổng quan (UC-08-01 subset), Audit log
- DB migration required: `audit_log` table (S3-BE-04, critical path)
- New routes: `/dashboard`, `/bao-cao`
- UC-05 (Kế hoạch tháng) deferred — too many open questions
- ADRs locked: read-only báo cáo, append-only audit log, DB aggregation dashboard

---

## Entry 003 — 2026-04-29
**From:** Tester QE  
**To:** Product Owner / Tech Lead (Sprint 3 planning)  
**Artifacts:** `docs/testing/sprint-2-results.md`  
**Status:** ✅ GO — Sprint 2 complete, 10/10 TCs passed  
**Branch:** N/A (no git)

### Summary
- Sprint 2 tested: Sửa/Xoá hồ sơ, Sửa/Xoá hộ, Import/Export Excel, Agribank UI redesign
- 2 bugs found & fixed in-session:
  - BUG-S2-001: `deleted_at` column missing (ALTER TABLE applied)
  - BUG-S2-002: Import Excel BE/FE response contract mismatch (backend fixed)
- All quality gates GREEN — TypeScript 0 errors, all AC verified via Playwright
- Recommended Sprint 3: Báo cáo tiến độ (UC-07), Kế hoạch chi trả (UC-05), Audit log

---

## Entry 002 — 2026-04-29
**From:** Tech Lead  
**To:** Backend Engineer ∥ Frontend Engineer (parallel)  
**Artifacts:** `docs/architecture/sprint-2-kickoff.md`  
**Status:** ✅ READY — sprint kickoff locked, engineers can proceed  
**Branch:** N/A (no git)

### Summary
- Sprint 1 MVP (22/22 UC) complete + TQE verified (docs/testing/sprint-1-results.md)
- Sprint 2 scope: 6 stories — Sửa/Xoá hồ sơ GPMB (UC-01-04/05), Sửa/Xoá hộ (UC-02-04/05), Import/Export Excel quy trình (UC-03-02)
- DB migration required: `deleted_at` column on `ho_so_gpmb`
- 1 security-tagged story: S2-BE-05 Import Excel `[SECURITY]`
- ADRs locked: soft-delete hồ sơ, hard-delete hộ (status=moi only), import upsert-by-code

---



## Entry 001 — 2026-04-29
**From:** Product Owner  
**To:** Implementation (pending tech stack confirmation)  
**Artifacts:** `docs/brd.md`, `docs/prd.md`, `.bmad/PROJECT-CONTEXT.md`  
**Status:** ⚠️ BLOCKED — awaiting user answers to Q1 (tech stack) and Q2 (seed Excel file)  
**Branch:** N/A (no git init yet)

### Summary
- BRD và PRD đã tạo từ `OPC_UseCase_Specification.md` + `MVP-scope.md`
- 22 UC MVP đã được capture vào PRD với MoSCoW prioritization
- State machine hộ (5 bước), task rollup logic, chi trả approval flow — tất cả đã document
- **Chờ user confirm tech stack và cung cấp file Excel seed trước khi bắt đầu implement**
