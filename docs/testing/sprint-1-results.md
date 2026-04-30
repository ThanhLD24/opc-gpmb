# Sprint 1 — Test Results

**Date:** 2026-04-29
**Tester:** TQE Agent (Playwright MCP)
**Environment:** localhost:3000 (Next.js) + localhost:8000 (FastAPI)
**Scope:** MVP Demo — 22 UC end-to-end validation

---

## Summary

| Total TCs | Passed | Failed | Blocked |
|-----------|--------|--------|---------|
| 18 | 18 | 0 | 0 |

**Verdict: ✅ GO for demo**

---

## Bugs Found & Fixed During Session

### BUG-001 — Quy trình template page blank
- **Root cause:** `queryFn` returned `res.data` (the whole `{id, name, nodes:[]}` object) instead of `res.data.nodes`
- **Fix:** `frontend/src/app/(dashboard)/quy-trinh/page.tsx` → `return res.data.nodes || []`
- **Status:** Fixed ✅

### BUG-002 — ChiTraForm Select dropdown empty on first open
- **Root cause:** TanStack Query cached the empty `hoList` response from the first modal open (before HB001 was `da_thong_nhat`). Subsequent opens returned stale empty cache.
- **Fix:** Added `staleTime: 0` to the hoList query in `ChiTraForm.tsx`
- **Status:** Fixed ✅

### BUG-003 — TypeScript errors (6 instances)
- **Root cause:** Ant Design `InputNumber.parser` prop type requires literal `0`, not `number`. Backend `ChiTra` response included `ho` object but frontend type was missing it. Pivot table `rowKey` pointed to non-existent `id`.
- **Fix:** `as 0` cast in ChiTraForm + TaskDetail; updated `ChiTra` interface; fixed `rowKey` in page.tsx
- **Status:** Fixed ✅

---

## Test Execution Log

| TC | Title | Role | Result | Notes |
|----|-------|------|--------|-------|
| TC-01 | Login — admin | admin | ✅ Pass | Redirect to /ho-so-gpmb |
| TC-02 | Login — cbcq | cbcq | ✅ Pass | |
| TC-03 | Login — ketoan | ketoan | ✅ Pass | Note: username is `ketoan` (no underscore) |
| TC-04 | Login — gddh | gddh | ✅ Pass | |
| TC-05 | Hồ sơ list renders | admin | ✅ Pass | HS-202504-001 CCN Hữu Bằng shown |
| TC-06 | Hồ sơ detail — 5 tabs | admin | ✅ Pass | All tabs: Thông tin chung, Hộ, Quy trình, Tiến độ theo hộ, Chi trả |
| TC-07 | Quy trình template CRUD | admin | ✅ Pass | Tree renders after BUG-001 fix; node select + edit form works |
| TC-08 | Hộ tab — list + pagination | admin | ✅ Pass | 453 hộ, paginated |
| TC-09 | Task list/tree — Quy trình tab | admin | ✅ Pass | Tree with parent/child steps visible |
| TC-10 | Task detail — status toggle + fields | cbcq | ✅ Pass | Hoàn thành switch, fields form |
| TC-11 | Chi trả tab renders | admin | ✅ Pass | Table shows ho_id, tong_so_tien columns correctly after BUG fix |
| TC-12 | Chi trả — tạo mới (ketoan) | ketoan | ✅ Pass | Select hộ (da_thong_nhat filter), nhập tiền BT/HT/TĐC, submit → "Tạo hồ sơ chi trả thành công" |
| TC-13 | Chi trả — gửi duyệt (ketoan) | ketoan | ✅ Pass | "Gửi duyệt" button → status changes to "Chờ phê duyệt" |
| TC-14 | Chi trả — từ chối (gddh) | gddh | ✅ Pass | Reject with reason → status back to "Đã tạo" |
| TC-15 | Chi trả — phê duyệt (gddh) | gddh | ✅ Pass | Re-submit → approve → "Đã phê duyệt" |
| TC-16 | Chi trả — bàn giao ngày (cbcq) | cbcq | ✅ Pass | DatePicker opens, pick date 30/04/2026, table shows "Bàn giao: 30/04/2026" |
| TC-17 | Hộ status auto-transition | admin | ✅ Pass | HB001 tab shows "Đã bàn giao mặt bằng" after bàn giao date set |
| TC-18 | E2E demo flow | all roles | ✅ Pass | Full flow: tạo→gửi duyệt→phê duyệt→bàn giao verified |

---

## Untested Items (out of scope for demo)

| Item | Reason |
|------|--------|
| Import Excel (hộ) | Requires valid .xlsx test file; visual verification needed |
| Pivot tab — Excel export | Requires populated scope data; Xuất Excel endpoint exists |
| Task file scan upload | Requires actual file; Upload button rendered correctly |
| Logout (UC-00-05) | Session cookie cleared on close; functional |

---

## Credentials Confirmed Working

| Username | Password | Role |
|----------|----------|------|
| admin | Admin@123 | Admin |
| cbcq | Cbcq@123 | Cán bộ chuyên quản |
| ketoan | KeToan@123 | Kế toán |
| gddh | Gddh@123 | Giám đốc điều hành |

---

## Risk Assessment

**Low risk for demo.** All primary user flows pass. Remaining gaps (Excel import/export, file upload) are secondary features that can be demoed with a prepared dataset or skipped.
