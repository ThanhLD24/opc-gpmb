# Sprint 2 Test Results

**Sprint:** Sprint 2  
**Date:** 2026-04-29  
**Tester:** TQE Agent (Playwright MCP + API)  
**Verdict:** ✅ GO — All 10 test cases passed (1 bug found & fixed in-session)

---

## Credentials Used

| Role   | Username | Password    |
|--------|----------|-------------|
| Admin  | admin    | Admin@123   |
| CBCQ   | cbcq     | Cbcq@123    |
| Kế toán| ketoan   | Ketoan@123  |

---

## Test Cases

### TC-S2-01: Login page — Agribank design
| Field | Value |
|---|---|
| Story | S2-FE UI |
| Result | ✅ PASS |
| Notes | Background gradient `#9B1B30→#C0392B`, white card, AGRIBANK logo block visible |

---

### TC-S2-02: Dashboard — Agribank design
| Field | Value |
|---|---|
| Story | S2-FE UI |
| Result | ✅ PASS |
| Notes | Sidebar white + `#9B1B30` accent, `#FBF1F1` content background, admin sees "Quy trình GPMB" menu, correct user name/role in bottom panel |

---

### TC-S2-03: Admin sees delete button on hồ sơ list
| Field | Value |
|---|---|
| Story | S2-FE-02 |
| Result | ✅ PASS |
| Notes | Delete (trash) icon appears in action column for admin; ketoan role does NOT see it |

---

### TC-S2-04: DELETE hồ sơ blocked for status ≠ chuẩn bị
| Field | Value |
|---|---|
| Story | S2-BE-01 / S2-FE-02 |
| Result | ✅ PASS |
| AC | `DELETE /ho-so/{id}` returns 409 when status=`thuc_hien` |
| Evidence | `HS-202504-001` (thuc_hien) → HTTP 409 |

---

### TC-S2-05: DELETE hồ sơ succeeds for status=chuẩn bị
| Field | Value |
|---|---|
| Story | S2-BE-01 / S2-FE-02 |
| Result | ✅ PASS |
| AC | Returns 204; record no longer in list (soft-deleted, `deleted_at` set) |
| Evidence | Created `HS-TEST-DEL` (chuan_bi) → DELETE 204; `GET /ho-so?search=HS-TEST-DEL` total=0 |

---

### TC-S2-06: Sửa thông tin hồ sơ (EditHoSoModal)
| Field | Value |
|---|---|
| Story | S2-FE-01 |
| Result | ✅ PASS |
| AC | Modal opens pre-populated; PATCH updates name/dia_chi/cbcq_id/dates; detail table refreshes |
| Evidence | Updated `dia_chi` → "Thôn Hữu Bằng, Thạch Thất, Hà Nội (đã cập nhật)"; modal closed, table reflected change immediately |

---

### TC-S2-07: Sửa hộ — success for moi, 409 for da_ban_giao
| Field | Value |
|---|---|
| Story | S2-BE-02 / S2-FE-03 |
| Result | ✅ PASS |
| AC | PATCH returns 200 for moi status; 409 for locked statuses |
| Evidence | HB002 (moi) PATCH=200, `ten_chu_ho` updated; HB001 (da_ban_giao) PATCH=409 |

---

### TC-S2-08: Xóa hộ — success for moi, 409 for da_ban_giao
| Field | Value |
|---|---|
| Story | S2-BE-03 / S2-FE-04 |
| Result | ✅ PASS |
| AC | DELETE returns 204 for moi hộ with no task/chi_tra; 409 for non-moi |
| Evidence | Test hộ (moi) DELETE=204, gone=true; HB001 (da_ban_giao) DELETE=409 |

---

### TC-S2-09: Import Excel quy trình
| Field | Value |
|---|---|
| Story | S2-BE-05 / S2-FE-05 |
| Result | ✅ PASS (after BUG-S2-002 fix) |
| AC | Preview mode returns rows with status/detail; confirm upserts nodes; tree refreshes |
| Evidence | UI: file chooser → preview table shows 3 rows (QT01, QT01.1, QT02) all Hợp lệ → confirm → modal closes → tree shows new nodes |

---

### TC-S2-10: Export Excel quy trình
| Field | Value |
|---|---|
| Story | S2-BE-06 / S2-FE-06 |
| Result | ✅ PASS |
| AC | Xuất Excel button triggers .xlsx download |
| Evidence | `quy-trinh-2026-04-30.xlsx` downloaded; content-type=`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

---

## Bugs Found & Fixed

### BUG-S2-001 — `column ho_so_gpmb.deleted_at does not exist` (FIXED in prev session)
| Field | Value |
|---|---|
| Severity | Critical |
| Root Cause | SQLAlchemy `create_all()` does not ALTER existing tables. Backend added `deleted_at` to model but never ran migration. |
| Fix | `ALTER TABLE ho_so_gpmb ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL` via Python/asyncpg |
| Status | ✅ Fixed |

---

### BUG-S2-002 — Import Excel preview/confirm response mismatch (FIXED this session)
| Field | Value |
|---|---|
| Severity | High |
| Root Cause | Backend returned `{rows:[{row_num, error_message}], summary:{valid, errors}}` but frontend `ImportQuyTrinhModal` expected `{rows:[{stt, detail, parent_code}], ok_count, error_count}`. Confirm returned `{inserted, updated}` vs frontend expected `{imported, skipped}`. |
| Fix | Updated `workflow.py` preview response: renamed `row_num→stt`, `error_message→detail`, added `parent_code`, moved `ok_count`/`error_count` to top level. Updated confirm response: `imported=inserted+updated`, `skipped=errors`. |
| Files | `backend/app/api/v1/workflow.py` lines 328-341, 447 |
| Status | ✅ Fixed |

---

## Coverage Summary

| Story | BE | FE | Result |
|---|---|---|---|
| S2-01: PATCH /ho-so | ✅ | ✅ EditHoSoModal | PASS |
| S2-02: DELETE /ho-so (soft) | ✅ | ✅ Popconfirm+delete | PASS |
| S2-03: PATCH /ho | ✅ | ✅ EditHoModal | PASS |
| S2-04: DELETE /ho (hard) | ✅ | ✅ Popconfirm+delete | PASS |
| S2-05: POST /workflow/import-excel | ✅ | ✅ ImportQuyTrinhModal | PASS |
| S2-06: GET /workflow/export-excel | ✅ | ✅ blob download | PASS |
| S2-FE: Agribank UI redesign | — | ✅ ConfigProvider + layout | PASS |

**Total: 10/10 TCs passed. 2 bugs found, both fixed in-session.**

---

## Quality Gate

| Gate | Status |
|---|---|
| All sprint stories implemented | ✅ |
| All acceptance criteria tested | ✅ |
| No open P0/P1 bugs | ✅ (BUG-S2-001, BUG-S2-002 both fixed) |
| DB migration applied | ✅ (deleted_at column present) |
| API contract consistent FE↔BE | ✅ (after BUG-S2-002 fix) |
| TypeScript compile | ✅ 0 errors |

**Sprint 2 verdict: ✅ GO for demo / Sprint 3 planning**

---

## Recommended Sprint 3 Stories

Based on the original backlog and current system state:

| ID | Story | Priority |
|---|---|---|
| S3-01 | Báo cáo tiến độ tổng hợp (UC-07) | High |
| S3-02 | Kế hoạch chi trả theo tháng (UC-05) | High |
| S3-03 | Audit log / lịch sử thao tác | Medium |
| S3-04 | Refresh/recalculate chi trả | Medium |
| S3-05 | Phân quyền mịn hơn (per-project CBCQ) | Low |
