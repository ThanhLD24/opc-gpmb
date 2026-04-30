# Sprint 5 Kickoff — OPC GPMB

**Date:** 2026-04-30  
**Tech Lead:** BMAD TL Agent  
**Sprint goal:** Implement UC-05 Kế hoạch chi trả tháng — auto-generate từ task_instance, CRUD items + việc phát sinh, xuất Excel — unblocking post-demo workflow reporting  
**Deadline:** Post-demo (Sprint 4 demo May 2 done); Sprint 5 target ~3 ngày  
**Based on:** PO feature brief `docs/features/uc-05-ke-hoach-thang-brief.md` (Entry 008) + TQE Sprint 4 recommendations (Entry 007)

---

## Sprint 5 — Scope

### Lý do chọn stories này

Sprint 4 hoàn tất demo khách hàng (8/8 checklist ✅). Sprint 5 bắt đầu phase post-demo, tập trung vào **UC-05 Kế hoạch chi trả tháng** — tính năng duy nhất còn unblocked sau khi PO đã trả lời 4 open questions (KH-01..04):

- **KH-01:** Auto-generate từ task_instance (không tạo thủ công)
- **KH-02:** 1 kế hoạch / hồ sơ / tháng (UNIQUE constraint)
- **KH-03:** Không lock sau xuất — banner cảnh báo vàng
- **KH-04:** Excel only (PDF → Sprint 6)

### Defer khỏi Sprint 5

| Item | Lý do defer |
|------|-------------|
| UC-09 Phân quyền per-project CBCQ | UC-05 là priority cao hơn theo PO; UC-09 thêm vào Sprint 6 |
| In-app notification chi trả approval | Medium priority; no FE foundation yet for notification system |
| Xuất PDF báo cáo | KH-04 quyết định: Excel only Sprint 5 |
| Đổi mật khẩu | Low priority |

### Stories

| ID | Title | UC | BE | FE | Độ phức tạp |
|----|-------|----|----|-----|------------|
| S5-01 | Kế hoạch tháng — DB + Auto-gen + CRUD API | UC-05-01, UC-05-01a, UC-05-02 | S5-BE-01 | — | M |
| S5-02 | Kế hoạch tháng — Việc phát sinh + Xuất Excel | UC-05-02a, UC-05-03 | S5-BE-02 | — | S |
| S5-03 | Kế hoạch tháng — UI Tab + View + Sửa items | UC-05-01, UC-05-02 | — | S5-FE-01 | M |
| S5-04 | Kế hoạch tháng — UI Việc phát sinh + Export | UC-05-02a, UC-05-03 | — | S5-FE-02 | S |

**Dependency:**
- S5-FE-01 phụ thuộc S5-BE-01 (cần API endpoints để test)
- S5-FE-02 phụ thuộc S5-BE-02 (cần export endpoint + việc phát sinh API)
- S5-BE-01 → S5-BE-02 (migration phải xong trước mới viết logic)

**Critical path:** S5-BE-01 → S5-BE-02 → S5-FE-01 → S5-FE-02  
**Parallel track:** BE thực hiện S5-BE-01 + S5-BE-02 trong khi FE chuẩn bị component scaffolding

---

## ADRs (locked for Sprint 5)

| # | Decision | Rationale |
|---|----------|-----------|
| ADR-S5-01 | **Auto-gen scope:** Pull tất cả `task_instance` với `status != 'hoan_thanh'` cho `ho_so_id` đã cho, sắp xếp theo `node.level ASC, node.order ASC`. Không lọc theo date range. | Đơn giản nhất — task_instance không có `due_date` riêng; CBCQ tự set `ngay_du_kien` sau khi generate. Tránh complex date-range logic. |
| ADR-S5-02 | **DB migration:** Dùng `psql -c "CREATE TABLE IF NOT EXISTS ..."` trực tiếp — KHÔNG dùng `create_all()`, KHÔNG dùng Alembic. | Consistent với Sprint 3 pattern (ALTER TYPE cũng psql direct). Alembic chưa setup; create_all() rủi ro. |
| ADR-S5-03 | **Không lock sau xuất:** Set `da_xuat_bao_cao = True` + `ngay_xuat` khi export, hiển thị banner cảnh báo vàng khi sửa — vẫn cho sửa bình thường. | KH-03 PO decision: GPMB fieldwork thay đổi liên tục; lock cứng gây friction. |
| ADR-S5-04 | **Excel export:** dùng openpyxl (already in requirements.txt). 1 sheet "Kế hoạch tháng", 6 cột: STT, Tên công việc, Mô tả, Ngày dự kiến, Ghi chú, Loại. | Consistent với báo cáo chi trả (openpyxl pattern). Không thêm dependency mới. |
| ADR-S5-05 | **FE placement:** Tab thứ 6 "Kế hoạch tháng" thêm vào `ho-so-gpmb/[id]/page.tsx` (existing 5-tab detail page). Router: `activeTab === 'ke-hoach'`. | Consistent với tab pattern hiện tại. Không cần route mới. |
| ADR-S5-06 | **Granularity:** 1 kế hoạch / hồ sơ / tháng. `UNIQUE(ho_so_id, thang, nam)`. Tạo lại → 409. | KH-02 PO decision. |

---

## Backend Stories

### S5-BE-01 — DB Migration + Auto-gen + CRUD API

**Điều kiện tiên quyết:** DB đang chạy tại `docker exec odin-gpmb-db-1`

**Step 1 — DB Migration**

Chạy migration script trực tiếp qua psql:

```bash
docker exec odin-gpmb-db-1 psql -U opc -d opc_gpmb << 'EOF'
CREATE TABLE IF NOT EXISTS ke_hoach_thang (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ho_so_id        UUID NOT NULL REFERENCES ho_so_gpmb(id) ON DELETE CASCADE,
    thang           INT NOT NULL CHECK (thang BETWEEN 1 AND 12),
    nam             INT NOT NULL CHECK (nam >= 2020),
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    da_xuat_bao_cao BOOLEAN NOT NULL DEFAULT FALSE,
    ngay_xuat       TIMESTAMPTZ,
    ghi_chu         TEXT,
    UNIQUE (ho_so_id, thang, nam)
);

CREATE TABLE IF NOT EXISTS ke_hoach_thang_item (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ke_hoach_thang_id   UUID NOT NULL REFERENCES ke_hoach_thang(id) ON DELETE CASCADE,
    task_instance_id    UUID REFERENCES task_instance(id),
    ten_cong_viec       TEXT NOT NULL,
    mo_ta               TEXT,
    ngay_du_kien        DATE,
    ghi_chu             TEXT,
    la_viec_phat_sinh   BOOLEAN NOT NULL DEFAULT FALSE,
    thu_tu              INT NOT NULL DEFAULT 0
);
EOF
```

**Step 2 — SQLAlchemy Models**

Thêm vào `backend/app/models.py`:

```python
class KeHoachThang(Base):
    __tablename__ = "ke_hoach_thang"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    ho_so_id = Column(UUID(as_uuid=True), ForeignKey("ho_so_gpmb.id"), nullable=False)
    thang = Column(Integer, nullable=False)
    nam = Column(Integer, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    da_xuat_bao_cao = Column(Boolean, default=False, nullable=False)
    ngay_xuat = Column(DateTime(timezone=True), nullable=True)
    ghi_chu = Column(Text, nullable=True)
    # Relationships
    items = relationship("KeHoachThangItem", back_populates="ke_hoach", cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint("ho_so_id", "thang", "nam"),)

class KeHoachThangItem(Base):
    __tablename__ = "ke_hoach_thang_item"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    ke_hoach_thang_id = Column(UUID(as_uuid=True), ForeignKey("ke_hoach_thang.id"), nullable=False)
    task_instance_id = Column(UUID(as_uuid=True), ForeignKey("task_instance.id"), nullable=True)
    ten_cong_viec = Column(Text, nullable=False)
    mo_ta = Column(Text, nullable=True)
    ngay_du_kien = Column(Date, nullable=True)
    ghi_chu = Column(Text, nullable=True)
    la_viec_phat_sinh = Column(Boolean, default=False, nullable=False)
    thu_tu = Column(Integer, default=0, nullable=False)
    # Relationships
    ke_hoach = relationship("KeHoachThang", back_populates="items")
```

**Step 3 — New router file: `backend/app/api/v1/ke_hoach.py`**

Pydantic schemas:

```python
class KeHoachThangCreate(BaseModel):
    thang: int = Field(ge=1, le=12)
    nam: int = Field(ge=2020)
    ghi_chu: Optional[str] = None

class KeHoachThangItemUpdate(BaseModel):
    ngay_du_kien: Optional[str] = None   # "YYYY-MM-DD"
    ghi_chu: Optional[str] = None
```

Endpoints (all under prefix `/ho-so/{ho_so_id}/ke-hoach`):

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Danh sách kế hoạch tháng cho hồ sơ (filter `?thang=&nam=`) |
| `POST` | `/generate` | Auto-gen kế hoạch tháng body `{thang, nam, ghi_chu?}` → 201 hoặc 409 nếu đã tồn tại |
| `GET` | `/{kh_id}` | Chi tiết kế hoạch + items (selectinload) |
| `PATCH` | `/{kh_id}/items/{item_id}` | Sửa `ngay_du_kien`, `ghi_chu` — mọi item (kể cả auto-gen) |

**Auto-gen logic:**

```python
# Pull task_instance với status != 'hoan_thanh' cho hồ sơ này
# JOIN với workflow_node để lấy tên + order
# Tạo ke_hoach_thang record, sau đó bulk insert ke_hoach_thang_item
```

**Auth rules:**
- `GET` endpoints: mọi role authenticated
- `POST /generate` và `PATCH`: chỉ `admin`, `cbcq`

**Register trong router.py:**
```python
from . import ke_hoach
api_router.include_router(ke_hoach.router, prefix="/ho-so", tags=["ke-hoach"])
```

**Acceptance Criteria:**
- [ ] `POST /generate` trả 201 với danh sách items (task_instance status != hoan_thanh)
- [ ] `POST /generate` trả 409 nếu `(ho_so_id, thang, nam)` đã tồn tại
- [ ] `GET /{kh_id}` trả full detail với items sắp xếp theo `node.level ASC, thu_tu ASC`
- [ ] `PATCH /{kh_id}/items/{item_id}` cập nhật `ngay_du_kien` + `ghi_chu`, trả 200
- [ ] `PATCH` trả 403 khi role = ke_toan hoặc gddh
- [ ] Migration chạy thành công; bảng tồn tại trong DB

**DoD:** Code complete, models defined, router registered, migration script verified chạy được.

---

### S5-BE-02 — Việc phát sinh + Xuất Excel

**Điều kiện tiên quyết:** S5-BE-01 hoàn tất (bảng tồn tại, router registered)

**Endpoints thêm vào `ke_hoach.py`:**

| Method | Path | Description |
|---|---|---|
| `POST` | `/{kh_id}/items` | Thêm việc phát sinh; `la_viec_phat_sinh=True`, `task_instance_id=null` |
| `DELETE` | `/{kh_id}/items/{item_id}` | Xóa item; chỉ cho phép xóa `la_viec_phat_sinh=True` → 400 nếu auto-gen |
| `GET` | `/{kh_id}/export` | Xuất Excel; set `da_xuat_bao_cao=True`, `ngay_xuat=now()`; trả file |

**Pydantic schema:**
```python
class ViecPhatSinhCreate(BaseModel):
    ten_cong_viec: str
    mo_ta: Optional[str] = None
    ngay_du_kien: Optional[str] = None   # "YYYY-MM-DD"
    ghi_chu: Optional[str] = None
```

**Excel export format (openpyxl):**

Sheet "Kế hoạch tháng MM/YYYY":

| STT | Tên công việc | Mô tả | Ngày dự kiến | Ghi chú | Loại |
|---|---|---|---|---|---|
| 1 | ... | ... | DD/MM/YYYY | ... | Quy trình |
| N | ... | ... | ... | ... | Phát sinh |

Header row: bold, fill `#9B1B30` (brand color consistent with báo cáo), font white.  
Response header: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`  
`Content-Disposition: attachment; filename=ke-hoach-thang-MM-YYYY.xlsx`

**Acceptance Criteria:**
- [ ] `POST /{kh_id}/items` tạo item với `la_viec_phat_sinh=True`; trả 201 + item
- [ ] `DELETE` thành công trả 204 cho `la_viec_phat_sinh=True`
- [ ] `DELETE` trả 400 "Không thể xóa công việc từ quy trình" cho auto-gen item
- [ ] `GET /export` trả file `.xlsx` với đúng headers; `da_xuat_bao_cao=True` sau khi gọi
- [ ] Excel có đủ 6 cột, phân biệt "Quy trình" vs "Phát sinh" trong cột Loại
- [ ] `POST items` và `DELETE` trả 403 khi role = ke_toan, gddh

**DoD:** Endpoints hoạt động, Excel đúng format, 403 guards.

---

## Frontend Stories

### S5-FE-01 — Tab Kế hoạch tháng + View + Sửa items

**Điều kiện tiên quyết:** S5-BE-01 complete (API responses available)

**File cần sửa:** `frontend/src/app/(dashboard)/ho-so-gpmb/[id]/page.tsx`

**Bước 1 — Thêm Tab 6**

Trong Ant Design `Tabs` items array, thêm:
```tsx
{
  key: 'ke-hoach',
  label: 'Kế hoạch tháng',
  children: <KeHoachThangTab hoSoId={id} />,
}
```

**Bước 2 — Tạo component: `frontend/src/components/ke-hoach/KeHoachThangTab.tsx`**

Layout:
```
[MonthPicker (tháng/năm)] [Nút "Tạo kế hoạch tháng" | "Xuất Excel"]
--
Nếu chưa có kế hoạch: Empty state "Chưa có kế hoạch tháng X/YYYY"
                       + Button "Tạo kế hoạch tháng"
Nếu đã có: Ant Design Table với columns:
  - STT
  - Tên công việc
  - Loại (Tag: "Quy trình" màu blue | "Phát sinh" màu orange)
  - Ngày dự kiến (editable inline DatePicker)
  - Ghi chú (editable inline Input)
  - Thao tác (Delete — chỉ hiện nếu la_viec_phat_sinh=True && canEdit)
```

**State queries (react-query):**
```tsx
const { data: keHoach, isLoading } = useQuery(
  ['ke-hoach', hoSoId, thang, nam],
  () => api.get(`/ho-so/${hoSoId}/ke-hoach?thang=${thang}&nam=${nam}`)
)
```

**Inline edit:** Khi user thay đổi DatePicker hoặc Input trong bảng → debounce 500ms → `PATCH /ke-hoach/{kh_id}/items/{item_id}`.

**Banner cảnh báo (KH-03):**
```tsx
{keHoach?.da_xuat_bao_cao && (
  <Alert
    type="warning"
    message={`Báo cáo tháng ${thang}/${nam} đã xuất ngày ${formatDate(keHoach.ngay_xuat)}. Bạn vẫn có thể chỉnh sửa.`}
    showIcon
  />
)}
```

**Role guard:**
```tsx
const canEdit = ['admin', 'cbcq'].includes(currentUser.role)
```

**Acceptance Criteria:**
- [ ] Tab "Kế hoạch tháng" hiển thị ở hồ sơ GPMB detail page (tab thứ 6)
- [ ] MonthPicker default = tháng hiện tại; thay đổi → reload data
- [ ] Empty state khi chưa có kế hoạch tháng đó
- [ ] Table hiển thị đúng items từ API, phân biệt Quy trình / Phát sinh
- [ ] Inline edit ngay_du_kien và ghi_chu → PATCH API
- [ ] Banner cảnh báo vàng khi `da_xuat_bao_cao = true`
- [ ] ke_toan, gddh: không thấy nút Tạo / Xóa (canEdit = false)

**DoD:** Component render đúng, queries work, inline edit functional, TypeScript 0 errors.

---

### S5-FE-02 — UI Việc phát sinh + Export Excel

**Điều kiện tiên quyết:** S5-BE-02 complete + S5-FE-01 complete

**Thêm vào `KeHoachThangTab.tsx`:**

**Button "Thêm việc phát sinh":**
- Hiển thị chỉ khi `canEdit && keHoach != null`
- Click → mở `ViecPhatSinhModal`

**Tạo component: `frontend/src/components/ke-hoach/ViecPhatSinhModal.tsx`**

Form fields:
- Tên công việc* (Input, required)
- Mô tả (TextArea, optional)
- Ngày dự kiến (DatePicker, optional)
- Ghi chú (Input, optional)

Submit: `POST /ho-so/{hoSoId}/ke-hoach/{khId}/items`  
On success: `message.success("Đã thêm việc phát sinh")`, close modal, invalidate query `['ke-hoach', hoSoId, thang, nam]`

**Button "Xuất Excel":**
- Hiển thị khi `keHoach != null` (mọi role)
- Click → `window.open(/api/v1/ho-so/${hoSoId}/ke-hoach/${khId}/export)` (browser download)
- Sau khi download: invalidate query để reload `da_xuat_bao_cao` + trigger banner

**Xóa việc phát sinh:**
- Trong Table column "Thao tác": nếu `item.la_viec_phat_sinh && canEdit` → hiển thị `Popconfirm` xác nhận xóa
- `DELETE /ke-hoach/{kh_id}/items/{item_id}` → 204 → invalidate query

**Acceptance Criteria:**
- [ ] "Thêm việc phát sinh" button → modal mở, form validate required fields
- [ ] Submit thành công → item xuất hiện trong bảng với Tag "Phát sinh"
- [ ] "Xuất Excel" → file download đúng tên `ke-hoach-thang-MM-YYYY.xlsx`
- [ ] Sau khi xuất: banner cảnh báo vàng xuất hiện (query invalidated → `da_xuat_bao_cao=true`)
- [ ] Xóa việc phát sinh: Popconfirm → DELETE → item biến mất
- [ ] Item auto-gen (la_viec_phat_sinh=false): không có nút xóa
- [ ] TypeScript 0 errors

**DoD:** Full CRUD cho việc phát sinh, Excel download, xóa hoạt động, 0 TS errors.

---

## Dependency Graph

```
S5-BE-01 ──────────────────────► S5-FE-01 (tab + view + edit)
    │                                │
    ▼                                ▼
S5-BE-02 (phát sinh + export) ──► S5-FE-02 (phát sinh modal + export button)
```

BE có thể chạy cả S5-BE-01 + S5-BE-02 tuần tự.  
FE có thể chạy S5-FE-01 khi S5-BE-01 xong, rồi S5-FE-02 khi S5-BE-02 xong.

---

## Security & Compliance

| Story | Tag | Concern |
|---|---|---|
| S5-BE-01 | — | Role check: GET mọi role; POST/PATCH admin/cbcq only |
| S5-BE-02 | — | DELETE: chỉ la_viec_phat_sinh=True; Export: mọi role |
| S5-FE-01 | — | canEdit role guard, không hardcode role string |
| S5-FE-02 | — | Popconfirm trước delete; window.open cho download (không POST sensitive data) |

No `[SECURITY]`-tagged stories in Sprint 5 (no auth changes, no PII operations).

---

## Rollback Plan

| Scenario | Rollback |
|---|---|
| DB migration lỗi | `DROP TABLE IF EXISTS ke_hoach_thang_item; DROP TABLE IF EXISTS ke_hoach_thang;` — không ảnh hưởng existing tables |
| BE router gây lỗi import | Revert `ke_hoach.py` + `router.py` changes; server restart |
| FE tab crash | Remove tab item từ Tabs array; lazy import component |

---

## Definition of Done (Sprint 5)

| Gate | Criteria |
|---|---|
| Migration | `ke_hoach_thang` + `ke_hoach_thang_item` tồn tại trong DB |
| BE API | Tất cả 7 endpoints hoạt động (201/200/409/400/403/204) |
| FE | Tab "Kế hoạch tháng" render, inline edit, việc phát sinh CRUD, Excel download |
| TypeScript | 0 errors (strict mode) |
| Role guard | 403 API + UI buttons ẩn cho ke_toan/gddh |
| Excel | File download đúng format, 6 cột, brand color header |
| Banner | `da_xuat_bao_cao=true` → cảnh báo vàng hiển thị khi sửa |
| No regressions | Existing Tabs 1-5 vẫn hoạt động bình thường |

---

## Files to Create/Modify

**Backend:**
```
backend/app/models.py                 # MODIFY — thêm KeHoachThang + KeHoachThangItem
backend/app/api/v1/ke_hoach.py        # CREATE — new router
backend/app/api/v1/router.py          # MODIFY — register ke_hoach.router
```

**Frontend:**
```
frontend/src/app/(dashboard)/ho-so-gpmb/[id]/page.tsx           # MODIFY — thêm tab 6
frontend/src/components/ke-hoach/KeHoachThangTab.tsx             # CREATE
frontend/src/components/ke-hoach/ViecPhatSinhModal.tsx           # CREATE
```

**Migration (run once):**
```
docker exec odin-gpmb-db-1 psql -U opc -d opc_gpmb -c "CREATE TABLE IF NOT EXISTS ke_hoach_thang ..."
docker exec odin-gpmb-db-1 psql -U opc -d opc_gpmb -c "CREATE TABLE IF NOT EXISTS ke_hoach_thang_item ..."
```

---

## Sprint 5 Signal Protocol

Khi hoàn tất, engineers tạo signal files:
- BE: `.bmad/signals/E2-be-ready` (nội dung: "sprint-5")
- FE: `.bmad/signals/E2-fe-ready` (nội dung: "sprint-5")

TL review → tạo:
- `.bmad/signals/E2-be-done`
- `.bmad/signals/E2-fe-done`

TQE invoke: `.bmad/signals/E3-tqe-invoke`

---

*Sprint 5 kickoff locked. Engineers có thể bắt đầu. BE starts S5-BE-01 ngay, FE scaffolding S5-FE-01 song song.*
