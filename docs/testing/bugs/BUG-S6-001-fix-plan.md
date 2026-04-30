# Fix Plan — BUG-S6-001

**Bug:** Filter dropdowns empty on /ho-dan và /cong-viec  
**Severity:** P2  
**Fix owner:** Tech Lead (acting as BE — trivial 1-line change)  
**Date:** 2026-04-30  
**Status:** ✅ APPLIED + VERIFIED by TL

---

## Root Cause (from TQE)

`GET /ho-so` có validation constraint `page_size: int = Query(20, ge=1, le=100)`.  
Frontend gọi `/ho-so?page_size=200` → 422 Unprocessable Entity → `hoSoList` undefined → filter dropdowns rỗng.

---

## Fix

**File:** `backend/app/api/v1/ho_so.py`, line 148

```python
# Before (buggy):
page_size: int = Query(20, ge=1, le=100)

# After (fixed):
page_size: int = Query(20, ge=1, le=500)
```

**Rationale:** Tăng upper limit lên 500 để cho phép FE load tối đa 200 hồ sơ cho filter dropdown. Không cần thay đổi FE. Limit 500 là đủ cho quy mô dự án hiện tại (4 hồ sơ) và tương lai gần.

---

## Verification Steps (TQE)

1. `GET /ho-so?page_size=200` phải trả 200 OK (không còn 422)
2. `/ho-dan` filter dropdowns: dropdown "Tất cả hồ sơ" phải hiển thị ≥ 4 hồ sơ khi click
3. `/ho-dan` filter dropdown "Tất cả CBCQ" phải hiển thị ≥ 1 CBCQ
4. `/cong-viec` Tab 1: dropdown "Chọn hồ sơ GPMB" phải hiển thị ≥ 4 hồ sơ

---

## Risk Assessment

**Low.** Tăng page_size limit không thay đổi API contract. Existing callers với `page_size <= 100` không bị ảnh hưởng. Không có DB migration, không có schema change.

---

## Rollback

Nếu cần revert: đổi `le=500` về `le=100` và restart backend. Không cần migration.
