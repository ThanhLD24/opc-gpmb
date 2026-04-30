# Sprint 6 Kickoff — Quản lý Hộ chung & Quản lý Công việc chung

**Sprint:** Sprint 6
**Date:** 2026-04-30
**Tech Lead:** TL Agent
**Input:** Sprint 5 TQE GO (Entry 010), User answers Q2/Q3/Q4 (session resume)
**Status:** ✅ READY — engineers can proceed

---

## Sprint 6 Scope

| Story ID | Role | Description | Critical Path |
|---|---|---|---|
| S6-BE-01 | BE | Global Hộ endpoint — `GET /api/v1/ho` cross-hồ-sơ, paginated, filters | ← FE-01 waits |
| S6-BE-02 | BE | Global Công việc endpoint — `GET /api/v1/tasks` flat, paginated, filters + "Việc của tôi" | ← FE-02 waits |
| S6-FE-01 | FE | `/ho-dan` page: sidebar entry + table + filters (hồ sơ, trạng thái, CBCQ) | waits for S6-BE-01 |
| S6-FE-02 | FE | `/cong-viec` page: sidebar entry + 2 tabs (Tất cả / Việc của tôi) | waits for S6-BE-02 |

**Deferred to Sprint 7:** UC-09 phân quyền per-project, PDF export, notifications, GDDH phê duyệt inbox

---

## ADRs (Locked)

### ADR-S6-01: Tách file mới — `global_ho.py` + `global_tasks.py`

- **Decision:** Tạo 2 file mới, không sửa `ho.py` / `task.py` hiện tại
- **Reason:** Tránh side-effect lên logic per-hồ-sơ đang hoạt động; separation of concerns
- **Route prefix:** `global_ho.router` → prefix `/ho` tag `ho-global`; `global_tasks.router` → prefix `/tasks` tag `tasks-global`
- **Register:** thêm 2 dòng vào `router.py`

### ADR-S6-02: Không cần migration DB

- **Decision:** Không tạo bảng mới — query JOIN qua `ho_so_gpmb`, `ho`, `task_instance`, `users`
- **Reason:** Tất cả schema đã có từ Sprint 1–5
- **Indexes:** kiểm tra performance, thêm GIN index nếu query chậm (>500ms on 48k rows)

### ADR-S6-03: Pagination chuẩn — page + page_size

- **Decision:** `?page=1&page_size=20` (default page_size=20, max=100)
- **Response:** `{ "total": N, "page": 1, "page_size": 20, "items": [...] }`
- **Reason:** Nhất quán với pattern reports.py; tránh cursor-based complexity

### ADR-S6-04: Tasks endpoint — ho_so_id filter BẮT BUỘC cho non-admin

- **Decision:** `GET /api/v1/tasks` yêu cầu `ho_so_id` **HOẶC** `my_tasks=true` filter. Admin có thể bỏ qua (full scan capped at page_size=20).
- **Exception:** `my_tasks=true` → tasks WHERE ho_so.cbcq_id = current_user.id (safe — indexed join)
- **Reason:** task_instance có ~48k rows; unfiltered full scan không chấp nhận được; cần ít nhất 1 filter để hit index
- **HTTP 400:** nếu non-admin gọi không có filter

### ADR-S6-05: "Việc của tôi" — UC-04-02

- **Decision:** `my_tasks=true` query param → JOIN task_instance → ho_so_gpmb WHERE cbcq_id = current_user.id
- **Display:** flat table (không phải tree), cùng columns như Tất cả công việc
- **Note:** CBCQ thấy tasks của tất cả hồ sơ họ phụ trách; admin thấy tất cả khi my_tasks=true

### ADR-S6-06: Sidebar — 2 mục mới

- **Decision:** Thêm "Quản lý Hộ dân" + "Quản lý Công việc" vào `layout.tsx` sidebar
- **Icons:** `TeamOutlined` (Hộ dân) + `CheckSquareOutlined` (Công việc)
- **Routes:** `/ho-dan` + `/cong-viec`
- **Visibility:** All roles (không giới hạn role)

---

## Story Details

---

### S6-BE-01 — Global Hộ Endpoint

**Assignee:** Backend Engineer
**File:** `backend/app/api/v1/global_ho.py` (NEW)
**Register in:** `backend/app/api/v1/router.py`

#### Endpoint

```
GET /api/v1/ho
Query params:
  ho_so_id: Optional[str] — UUID filter
  trang_thai: Optional[str] — HoStatusEnum filter (moi/dang_xu_ly/da_thong_nhat/da_chi_tra/da_ban_giao)
  cbcq_id: Optional[str] — UUID filter (CBCQ của HoSo)
  page: int = 1
  page_size: int = 20 (max 100)

Auth: get_current_user (any role)
```

#### Response

```json
{
  "total": 150,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": "uuid",
      "ho_so_id": "uuid",
      "ho_so_code": "RH-001",
      "ho_so_name": "Dự án A",
      "ten_chu_ho": "Nguyễn Văn A",
      "dia_chi": "123 Đường X",
      "dien_tich": 120.5,
      "trang_thai": "dang_xu_ly",
      "trang_thai_label": "Đang xử lý",
      "cbcq_name": "Trần Thị B"
    }
  ]
}
```

#### Implementation

```python
# Imports: select, func, and_, or_, UUID, asyncio
# JOIN: Ho → HoSoGPMB → User (cbcq)
# WHERE: deleted_at IS NULL on ho_so_gpmb; apply filters
# COUNT: SELECT count(*) with same WHERE
# OFFSET: (page-1) * page_size
# ORDER: ho_so_gpmb.code ASC, ho.ten_chu_ho ASC
```

#### HoStatusEnum labels (dùng trong response):

```
moi → "Mới"
dang_xu_ly → "Đang xử lý"
da_thong_nhat → "Đã thống nhất"
da_chi_tra → "Đã chi trả"
da_ban_giao → "Đã bàn giao"
```

#### DoD:
- [ ] `GET /api/v1/ho` trả 200 với paginated response
- [ ] Filter `ho_so_id` hoạt động
- [ ] Filter `trang_thai` hoạt động
- [ ] Filter `cbcq_id` hoạt động
- [ ] Filters kết hợp hoạt động
- [ ] `total` field đúng (không phải count items trả về)
- [ ] `ho_so_code` + `ho_so_name` + `cbcq_name` included trong mỗi item
- [ ] Endpoint yêu cầu auth (401 nếu không có token)

---

### S6-BE-02 — Global Công việc Endpoint

**Assignee:** Backend Engineer
**File:** `backend/app/api/v1/global_tasks.py` (NEW)
**Register in:** `backend/app/api/v1/router.py`

#### Endpoint

```
GET /api/v1/tasks
Query params:
  ho_so_id: Optional[str] — UUID filter (REQUIRED cho non-admin nếu my_tasks=false)
  trang_thai: Optional[str] — TaskStatusEnum filter (dang_thuc_hien/hoan_thanh)
  my_tasks: bool = False — nếu True: tasks WHERE ho_so.cbcq_id = current_user.id
  page: int = 1
  page_size: int = 20 (max 100)

Auth: get_current_user (any role)
HTTP 400: nếu non-admin, my_tasks=False, ho_so_id=None
```

#### Response

```json
{
  "total": 500,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": "uuid",
      "ho_so_id": "uuid",
      "ho_so_code": "RH-001",
      "ho_so_name": "Dự án A",
      "ten_cong_viec": "Đo đạc thực địa",
      "trang_thai": "dang_thuc_hien",
      "trang_thai_label": "Đang thực hiện",
      "cbcq_name": "Trần Thị B",
      "updated_at": "2026-04-30T10:00:00+00:00"
    }
  ]
}
```

#### Implementation

```python
# JOIN: TaskInstance → HoSoWorkflowNode (for ten_cong_viec = node.name) → HoSoGPMB → User (cbcq)
# Note: TaskInstance.ho_so_id exists directly; workflow_node.name = ten_cong_viec
# WHERE: ho_so.deleted_at IS NULL
# my_tasks=True: WHERE ho_so.cbcq_id = current_user.id
# ho_so_id filter: WHERE task_instance.ho_so_id = ho_so_id
# trang_thai filter: WHERE task_instance.status = trang_thai
# ORDER: ho_so.code ASC, task_instance.updated_at DESC (or thu_tu if available)
# COUNT: same WHERE clause for total
```

#### Task model note:
- `TaskInstance.status` is `TaskStatusEnum` (dang_thuc_hien/hoan_thanh)
- `TaskInstance.workflow_node` → `HoSoWorkflowNode.name` = tên công việc
- Need `selectinload(TaskInstance.workflow_node)` hoặc JOIN trực tiếp với `HoSoWorkflowNode`

#### DoD:
- [ ] `GET /api/v1/tasks` với `ho_so_id` filter → 200 + paginated
- [ ] `GET /api/v1/tasks` không có filter + non-admin → 400 với message rõ ràng
- [ ] `GET /api/v1/tasks?my_tasks=true` → trả tasks của CBCQ hiện tại
- [ ] admin có thể gọi không có filter (capped at page_size)
- [ ] `ten_cong_viec` lấy từ workflow_node.name
- [ ] `ho_so_code` + `ho_so_name` + `cbcq_name` included

---

### S6-FE-01 — `/ho-dan` Page

**Assignee:** Frontend Engineer
**New files:**
- `frontend/src/app/(dashboard)/ho-dan/page.tsx` (NEW)
**Modified files:**
- `frontend/src/app/(dashboard)/layout.tsx` (add sidebar entry)

#### Page spec

```
Route: /ho-dan
Title: "Quản lý Hộ dân"
Sidebar icon: TeamOutlined
Visible: all roles

Layout:
  - Header: "Quản lý Hộ dân" + badge total count
  - Filter bar (horizontal, collapsible trên mobile):
      - Select "Hồ sơ GPMB": load từ GET /ho-so?page_size=200 (existing endpoint)
      - Select "Trạng thái": options từ HoStatusEnum labels
      - Select "CBCQ phụ trách": load users WHERE role=cbcq từ GET /auth/users (nếu có) HOẶC hardcode từ ho-so list
  - Table (Ant Design Table, pagination server-side):
      columns: STT | Hồ sơ (code+name) | Tên chủ hộ | Địa chỉ | Diện tích (m²) | Trạng thái (Tag màu) | CBCQ
      rowKey: id
      pagination: { current: page, pageSize: 20, total, showSizeChanger: false }
      onRow: click → router.push(`/ho-so-gpmb/${record.ho_so_id}?tab=ho`)
```

#### Filter Select options (trang_thai):

```typescript
const TRANG_THAI_OPTIONS = [
  { value: 'moi', label: 'Mới' },
  { value: 'dang_xu_ly', label: 'Đang xử lý' },
  { value: 'da_thong_nhat', label: 'Đã thống nhất' },
  { value: 'da_chi_tra', label: 'Đã chi trả' },
  { value: 'da_ban_giao', label: 'Đã bàn giao' },
]
```

#### Tag colors (trang_thai):

```typescript
const TAG_COLORS: Record<string, string> = {
  moi: 'default',
  dang_xu_ly: 'processing',
  da_thong_nhat: 'success',
  da_chi_tra: 'warning',
  da_ban_giao: 'green',
}
```

#### Data fetching:

```typescript
// useQuery key: ['ho-global', page, hoSoId, trangThai, cbcqId]
// queryFn: GET /api/v1/ho?page=&page_size=20&ho_so_id=&trang_thai=&cbcq_id=
// Filter for cbcq_id: load cbcq users list từ GET /ho-so (group by cbcq)
//   → extract unique cbcq_name from ho-so list as options
```

#### CBCQ filter — implementation note:

Không có `GET /users` endpoint riêng. Lấy danh sách CBCQ từ response của `GET /ho-so` (field `cbcq_id` + `cbcq_name`). Build unique list. Cache với `staleTime: 60000`.

#### DoD:
- [ ] Route `/ho-dan` accessible từ sidebar (TeamOutlined icon)
- [ ] Table renders với data từ `GET /api/v1/ho`
- [ ] Filter hồ sơ hoạt động → re-fetch + reset page=1
- [ ] Filter trạng thái hoạt động
- [ ] Filter CBCQ hoạt động (Select với unique CBCQ từ ho-so list)
- [ ] Server-side pagination: page, total hiển thị đúng
- [ ] Click row → navigate `/ho-so-gpmb/${ho_so_id}` (không cần tab param)
- [ ] Sidebar active state đúng khi ở `/ho-dan`
- [ ] TypeScript 0 errors

---

### S6-FE-02 — `/cong-viec` Page

**Assignee:** Frontend Engineer
**New files:**
- `frontend/src/app/(dashboard)/cong-viec/page.tsx` (NEW)
**Modified files:**
- `frontend/src/app/(dashboard)/layout.tsx` (add sidebar entry — cùng commit với S6-FE-01)

#### Page spec

```
Route: /cong-viec
Title: "Quản lý Công việc"
Sidebar icon: CheckSquareOutlined
Visible: all roles

Layout:
  Tab 1: "Tất cả công việc"
    - Filter bar: Select "Hồ sơ GPMB" (REQUIRED — hiện placeholder "Chọn hồ sơ để xem")
    - Khi chưa chọn hồ sơ: hiện Empty "Vui lòng chọn hồ sơ GPMB để xem công việc"
    - Khi đã chọn: Table + pagination
    - Columns: STT | Hồ sơ | Tên công việc | Trạng thái (Tag) | CBCQ | Cập nhật lúc
    - Filter thêm (tùy chọn): Trạng thái

  Tab 2: "Việc của tôi" (UC-04-02)
    - Không cần filter hồ sơ — tự động query my_tasks=true
    - Hiện ngay khi load (không cần user chọn filter)
    - Cùng Table columns, cùng pagination
    - CBCQ: thấy tasks của các hồ sơ mình phụ trách
    - admin: thấy tất cả (my_tasks=true → toàn bộ tasks của admin... hoặc empty nếu admin không có hồ sơ)
```

#### Tag colors (trang_thai công việc):

```typescript
const TASK_STATUS_COLORS: Record<string, string> = {
  dang_thuc_hien: 'processing',
  hoan_thanh: 'success',
}
const TASK_STATUS_LABELS: Record<string, string> = {
  dang_thuc_hien: 'Đang thực hiện',
  hoan_thanh: 'Hoàn thành',
}
```

#### Data fetching:

```typescript
// Tab 1:
// useQuery key: ['tasks-global', page, hoSoId, trangThai]
// disabled: !hoSoId (show empty state instead)
// queryFn: GET /api/v1/tasks?page=&page_size=20&ho_so_id={hoSoId}&trang_thai={...}

// Tab 2:
// useQuery key: ['tasks-my', page]
// queryFn: GET /api/v1/tasks?my_tasks=true&page=&page_size=20
// Always enabled (no filter required)
```

#### DoD:
- [ ] Route `/cong-viec` accessible từ sidebar (CheckSquareOutlined icon)
- [ ] Tab 1 "Tất cả công việc": Empty state khi chưa chọn hồ sơ
- [ ] Tab 1: Table renders sau khi chọn hồ sơ
- [ ] Tab 1: Server-side pagination
- [ ] Tab 1: Filter trạng thái hoạt động (optional filter)
- [ ] Tab 2 "Việc của tôi": load ngay không cần filter
- [ ] Tab 2: hiển thị tasks của CBCQ đang đăng nhập
- [ ] Sidebar active state đúng khi ở `/cong-viec`
- [ ] TypeScript 0 errors

---

## Rollback Strategy

No DB migrations → rollback = chỉ cần xóa 2 file mới + revert layout.tsx + revert router.py.
Risk: THẤP — không chạm schema, không chạm logic hiện tại.

---

## Parallel Assignment

```
BE Engineer → S6-BE-01 + S6-BE-02 (độc lập, có thể làm tuần tự hoặc song song)
FE Engineer → S6-FE-01 + S6-FE-02 (layout.tsx commit 1 lần cho cả 2 sidebar entries)
```

**Critical dependency:** FE-01 cần BE-01 done; FE-02 cần BE-02 done. Nhưng BE-01 và BE-02 độc lập. FE engineer viết page skeleton trước, hook API sau khi BE xong.

---

## API Contracts (Summary)

```
# BE-01 output:
GET /api/v1/ho
→ { total, page, page_size, items: [{id, ho_so_id, ho_so_code, ho_so_name, ten_chu_ho, dia_chi, dien_tich, trang_thai, trang_thai_label, cbcq_name}] }

# BE-02 output:
GET /api/v1/tasks
→ { total, page, page_size, items: [{id, ho_so_id, ho_so_code, ho_so_name, ten_cong_viec, trang_thai, trang_thai_label, cbcq_name, updated_at}] }
```

---

## Security

- Không có story `[SECURITY]`-tagged trong sprint này
- Cả 2 endpoint dùng `get_current_user` → JWT required; role-based filtering cho `my_tasks`
- No new npm/pip dependencies

---

## Quality Gates (Sprint 6)

| Gate | Owner |
|---|---|
| `GET /api/v1/ho` paginated + filtered → 200 | BE |
| `GET /api/v1/tasks?my_tasks=true` → tasks của current user | BE |
| `GET /api/v1/tasks` non-admin không filter → 400 | BE |
| `/ho-dan` route renders, table shows data | FE |
| `/ho-dan` sidebar link active | FE |
| `/cong-viec` Tab 1 empty state khi chưa chọn hồ sơ | FE |
| `/cong-viec` Tab 2 Việc của tôi loads without filter | FE |
| TypeScript 0 errors | FE |
| No regressions trên Sprint 1–5 features | TQE |
