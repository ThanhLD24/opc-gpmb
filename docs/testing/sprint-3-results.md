# Sprint 3 Test Results

**Sprint:** Sprint 3
**Date:** 2026-04-30
**Tester:** TQE Agent (Playwright MCP + API)
**Verdict:** ✅ GO — All 5 test cases passed (1 backend bug found & fixed pre-test by TL)

---

## Sprint 3 Scope (per `docs/architecture/sprint-3-kickoff.md`)

| Story | Description |
|---|---|
| S3-01 | Báo cáo chi trả BTHTTĐC (UC-07-01) |
| S3-02 | Sửa & Tái gửi chi trả bị từ chối |
| S3-03 | Dashboard tổng quan (UC-08-01 subset) |
| S3-04 | Audit log (append-only) |

---

## Credentials Used

| Role   | Username | Password    |
|--------|----------|-------------|
| Admin  | admin    | Admin@123   |

Test data:
- `ho_so_id = 74bd014c-4abd-419c-b42c-1d62b98ac2ac` (1 hồ sơ in DB, 454 hộ)
- `ho_id (HB002) = e9e85295-545d-46cb-b38e-ba284604735c` (moi)
- Test chi trả created during testing: `164b8e67-c924-4e01-90ad-23747454b81b`

---

## Test Cases

### TC-S3-01: Dashboard tổng quan (UC-08-01)
| Field | Value |
|---|---|
| Story | S3-03 (BE: dashboard.py / FE: /dashboard) |
| Result | ✅ PASS |
| AC | 4 stat cards, hộ-by-status progress bars, recent hồ sơ table, sidebar shows "Tổng quan" |
| Evidence | URL `/dashboard` heading "Tổng quan GPMB", 4 `.ant-statistic` cards with values: `Tổng hồ sơ GPMB=1`, `Hộ đã bàn giao=1/454`, `Tổng chi trả đã duyệt=80 triệu đ`, `Hộ chờ xử lý=453`. 5 progress bars (hộ-by-status). Recent hồ sơ table 1 row. Sidebar: [Tổng quan, Hồ sơ GPMB, Quy trình GPMB, Báo cáo] |

---

### TC-S3-02: Báo cáo chi trả (UC-07-01)
| Field | Value |
|---|---|
| Story | S3-01 (BE: reports.py / FE: /bao-cao) |
| Result | ✅ PASS |
| AC | 9-column table, 3 filters (hồ sơ, trạng thái, RangePicker), summary totals, Excel export |
| Evidence | URL `/bao-cao` heading "Báo cáo chi trả BTHTTĐC". 3 filter controls. Table headers: [Mã HSCT, Hồ sơ GPMB, Hộ/Tên chủ hộ, BT, HT, TĐC, Tổng đề nghị, Trạng thái, Ngày phê duyệt]. Filter `status=da_phe_duyet` → total=1, tong_da_chi_tra=80,000,000; `status=cho_phe_duyet` → total=0. Export endpoint returns HTTP 200, content-type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, 5,194 bytes |

---

### TC-S3-03: Sửa chi trả bị từ chối
| Field | Value |
|---|---|
| Story | S3-02 (BE: chi_tra.PATCH / FE: EditChiTraModal) |
| Result | ✅ PASS |
| AC | PATCH `/chi-tra/{id}` allowed only when `status=bi_tu_choi`; recalculates `tong_de_nghi`; returns 409 for other statuses |
| Evidence | Created chi trả → gửi duyệt → từ chối ("Thiếu hồ sơ đất đai hợp lệ") → status=`bi_tu_choi`. PATCH `{so_tien_bt:2000000, so_tien_ht:800000, so_tien_tdc:300000}` → HTTP 200, `tong_de_nghi=3,100,000` (auto-calc), status remains `bi_tu_choi`. PATCH on `da_phe_duyet` chi trả → HTTP 409. UI: row expanded shows red Alert "Lý do từ chối: Thiếu hồ sơ đất đai hợp lệ" + buttons [Sửa, Tái gửi duyệt] + Timeline. Click Sửa → modal "Sửa hồ sơ chi trả" opens with 3 InputNumber fields [Tiền BT, Tiền HT, Tiền TĐC] |

---

### TC-S3-04: Tái gửi chi trả bị từ chối
| Field | Value |
|---|---|
| Story | S3-02 (BE: chi_tra.tai-gui / FE: button trong expandable row) |
| Result | ✅ PASS |
| AC | POST `/chi-tra/{id}/tai-gui` chỉ chấp nhận `bi_tu_choi`; chuyển status → `cho_phe_duyet`, clear `ly_do_tu_choi`, set `ngay_gui_duyet`; 409 cho status khác |
| Evidence | POST `/tai-gui` on `bi_tu_choi` → HTTP 200, status=`cho_phe_duyet`, `ly_do_tu_choi=null`, `ngay_gui_duyet` updated. POST `/tai-gui` on `da_phe_duyet` → HTTP 409. UI sau reload: status tag chuyển từ "Bị từ chối" → "Chờ phê duyệt"; expanded row no longer shows Sửa/Tái gửi buttons |

---

### TC-S3-05: Audit log appears in chi trả detail
| Field | Value |
|---|---|
| Story | S3-04 (BE: audit_service / FE: AuditTimeline) |
| Result | ✅ PASS |
| AC | Mỗi hành động chi trả ghi 1 dòng audit; GET `/chi-tra/{id}/audit` trả DESC; UI Timeline render đúng thứ tự với labels Vietnamese |
| Evidence | GET `/audit` → 4 entries DESC: [tai_gui, tu_choi, gui_duyet, tao]. UI Timeline 4 items: [`Tái gửi bởi Admin Hệ thống — 29/04/2026 17:54`, `Từ chối bởi Admin Hệ thống — 29/04/2026 17:52` + Alert("Thiếu hồ sơ đất đai hợp lệ"), `Gửi duyệt bởi Admin Hệ thống — 29/04/2026 17:52`, `Tạo hồ sơ bởi Admin Hệ thống — 29/04/2026 17:52`]. DB: `audit_log` table exists, 4 rows match the 4 actions |

---

## Bugs Found & Fixed

### BUG-S3-001 — PostgreSQL enum missing `da_ban_giao` value (FIXED pre-test by TL)
| Field | Value |
|---|---|
| Severity | Critical |
| Root Cause | BE agent added `da_ban_giao = "da_ban_giao"` to Python `ChiTraStatusEnum` in `models.py`, but SQLAlchemy `create_all()` does NOT alter existing PostgreSQL enum types. PostgreSQL `chitrastatusenum` only had: `da_tao`, `cho_phe_duyet`, `da_phe_duyet`, `bi_tu_choi`. |
| Fix | TL ran: `docker exec odin-gpmb-db-1 psql -U opc -d opc_gpmb -c "ALTER TYPE chitrastatusenum ADD VALUE IF NOT EXISTS 'da_ban_giao';"` |
| Status | ✅ Fixed (verified by TQE during pre-test smoke check) |

No bugs found by TQE during Sprint 3 testing.

---

## Coverage Summary

| Story | BE | FE | Result |
|---|---|---|---|
| S3-01 Báo cáo (UC-07-01) | ✅ reports.py (filter + export-excel) | ✅ /bao-cao page | PASS |
| S3-02 Sửa/Tái gửi chi trả | ✅ PATCH + tai-gui + 409 guards | ✅ EditChiTraModal + buttons + invalidation | PASS |
| S3-03 Dashboard (UC-08-01) | ✅ dashboard.py aggregate stats | ✅ /dashboard 4 cards + progress + recent | PASS |
| S3-04 Audit log | ✅ audit_service + GET /audit + hooks (5 actions) | ✅ AuditTimeline expandable row | PASS |

**Total: 5/5 TCs passed. 1 bug found (BUG-S3-001) and fixed pre-test by TL.**

---

## Quality Gate

| Gate | Status |
|---|---|
| All sprint stories implemented | ✅ |
| All acceptance criteria tested | ✅ |
| No open P0/P1 bugs | ✅ (BUG-S3-001 fixed) |
| DB migration applied | ✅ (audit_log table created; chitrastatusenum extended) |
| API contract consistent FE↔BE | ✅ |
| TypeScript compile | ✅ 0 errors |
| Audit log append-only | ✅ (no DELETE/UPDATE endpoints exposed; `audit_log` table writes only) |
| Read-only báo cáo | ✅ (GET-only endpoints, no mutation) |

**Sprint 3 verdict: ✅ GO for demo / Sprint 4 planning**

---

## Recommended Sprint 4 Stories

Based on remaining backlog:

| ID | Story | Priority | Notes |
|---|---|---|---|
| S4-01 | Kế hoạch chi trả theo tháng (UC-05) | High | Was deferred from Sprint 3 — 4 open questions (KH-01..04) need PO clarification first |
| S4-02 | Bàn giao mặt bằng + status `da_ban_giao` (UC-06) | High | Enum value đã sẵn sàng từ Sprint 3 |
| S4-03 | Phân quyền mịn per-project CBCQ | Medium | UC-09 |
| S4-04 | Email/SMS notification cho chi trả approval | Medium | Tích hợp với audit log |
| S4-05 | Refresh/recalculate chi trả tổng hợp toàn dự án | Low | |

---

## Test Artifacts

- Browser session: Playwright MCP, admin logged in
- DB inspection: `docker exec odin-gpmb-db-1 psql -U opc -d opc_gpmb`
- Test chi trả created during session: id=`164b8e67-c924-4e01-90ad-23747454b81b`, currently in `cho_phe_duyet` (after tai-gui)
- Audit log rows: 4 entries on entity_id=`164b8e67-...`
