# Release Readiness — Sprint 7 (Demo 2026-05-02)

**Date:** 2026-05-01
**Reviewer:** Tech Lead
**Sprint:** 7 — UX + Security + Phân quyền + PDF
**Context:** MVP Demo Khách hàng — local demo environment (Docker Compose)
**Verdict:** ✅ RELEASE APPROVED — DEMO READY

---

## Quality Gate Results

### 1. Code Quality

| Check | Result |
|-------|--------|
| TypeScript build (`npx tsc --noEmit`) | ✅ 0 errors |
| No hardcoded secrets in committed code | ✅ Verified — JWT secret in env, DB creds in docker-compose only |
| New dependency `reportlab==4.2.5` — license | ✅ BSD license, no system deps, pure Python |
| No SQL injection vectors | ✅ SQLAlchemy ORM parameterized queries throughout |
| [SECURITY] story code review | ✅ bcrypt via passlib, no plaintext password in logs or responses |
| Out-of-scope additions | ⚠️ 1 — sidebar badge count (TL-approved, enhances demo UX) |

**DEVIATION noted:** Sidebar pending approval badge added to `layout.tsx` — not in kickoff spec, approved by TL gap-fix session before TQE run.

### 2. Test Coverage

| Suite | TCs | Passed | Failed |
|-------|-----|--------|--------|
| API tests (curl/httpie) | 20 | 20 | 0 |
| UI tests (Playwright) | 15 | 15 | 0 |
| **Total** | **35** | **35** | **0** |

Regression areas verified: dashboard, ho-so-gpmb list, sidebar navigation, TypeScript build.

### 3. Bugs

| Bug ID | Severity | Status |
|--------|----------|--------|
| BUG-S7-001 — phe-duyet redirect for GDDH | P2 | ✅ Fixed in-session (useEffect + useRouter pattern) |

No open bugs.

### 4. Database

| Item | Status |
|------|--------|
| `notifications` table migration | ✅ Applied (verified via API — GET /notifications returns data) |
| Existing data integrity | ✅ 534 hộ, workflow nodes, 4 demo users unchanged |
| Rollback plan | N/A — local Docker Compose; restore: `docker-compose down -v && docker-compose up` re-seeds from init.sql |

### 5. Demo Environment Readiness

| Item | Status |
|------|--------|
| Backend (`uvicorn`) on port 8000 | ✅ Running |
| Frontend (`next dev`) on port 3000 | ✅ Running |
| PostgreSQL 15 (Docker) | ✅ Running |
| All 4 demo credentials verified | ✅ admin / cbcq / ke_toan / gddh all login correctly |
| Sprint 1-6 features intact (regression) | ✅ Verified |

---

## Demo Flow Sign-Off

| Demo Flow | Status |
|-----------|--------|
| Đăng nhập / Đăng xuất (all 4 roles) | ✅ Ready |
| Hồ sơ GPMB — list, detail, 5 tabs | ✅ Ready |
| Quản lý Hộ dân — list, import Excel, filter | ✅ Ready |
| Quản lý Công việc — task tree, custom field, upload | ✅ Ready |
| Chi trả — tạo → gửi duyệt → phê duyệt → bàn giao | ✅ Ready |
| **[Sprint 7]** Đổi mật khẩu (header dropdown) | ✅ Ready |
| **[Sprint 7]** Bell icon + notification dropdown | ✅ Ready |
| **[Sprint 7]** GDDH Phê duyệt Inbox (2 tabs) | ✅ Ready (BUG-S7-001 fixed) |
| **[Sprint 7]** CBCQ auto-filter (ho-dan + tasks) | ✅ Ready |
| **[Sprint 7]** Xuất PDF Kế hoạch tháng | ✅ Ready |
| Báo cáo / Bảo biểu (charts) | ✅ Ready |

---

## Risk Register (Demo Context)

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Docker containers stop unexpectedly | Low | `docker-compose up -d` to restart |
| Browser CORS issue on demo machine | Low | Use `localhost` not `127.0.0.1` consistently |
| CBCQ filter appears same count as admin | Info | Demo data has all ho_so assigned to cbcq — explain to audience that filter logic is correct, only visible with multi-CBCQ data |
| Notification not appearing immediately | Low | Polling interval 60s — demonstrate by waiting or triggering manually |

---

## Rollback Plan

**Local demo — no CI/CD.** If a critical issue is found during demo:

1. `git stash` or `git checkout` the specific file
2. Restart Next.js: `npm run dev`
3. Restart FastAPI: `uvicorn app.main:app --reload`
4. If DB corrupted: `docker-compose down -v && docker-compose up` (re-seeds from init.sql — loses Sprint 7 session data but restores demo baseline)

---

## Tech Lead Sign-Off

| Item | Verdict |
|------|---------|
| All Sprint 7 ACs implemented and tested | ✅ |
| Security story reviewed | ✅ |
| No P0/P1 open bugs | ✅ |
| TypeScript 0 errors | ✅ |
| Demo environment stable | ✅ |
| Regression suite passed | ✅ |

**DECISION: ✅ APPROVED FOR DEMO 2026-05-02**

_Tech Lead — 2026-05-01_
