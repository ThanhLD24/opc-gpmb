# Sprint 9 Kickoff — Logic Ngày Tháng & Tiến Độ Công Việc

**Date:** 2026-05-05
**Feature:** Logic tính toán ngày tháng dự kiến/thực tế và đánh giá tiến độ công việc
**Spec:** `docs/logic_phancap.md`
**Base commit:** HEAD on `main` (529ebcd and 20 manual commits after)

---

## Clarifications Confirmed (Q&A với Product Owner)

| # | Câu hỏi | Câu trả lời |
|---|---------|-------------|
| Q1 | Cấu hình song song ở đâu? | Admin config trong `/quy-trinh` (tạo + update node) |
| Q2 | Tính ngày như thế nào? | Tự động tính `planned_start/end`; cập nhật `actual_start` khi task trước hoàn thành, `actual_end` khi task hoàn thành |
| Q3 | Tự động hay thủ công? | Hoàn toàn tự động (system-driven) |
| Q4 | Task per_household? | Mặc định song song, cùng thời gian start/end (tất cả instances của 1 node chia sẻ ngày dự kiến) |
| Q5 | Hiển thị tiến độ ở đâu? | Quản lý công việc (`/cong-viec`) |

---

## Architectural Decisions (Locked)

### ADR-S9-01: Date Storage Split
- **`HoSoWorkflowNode`** lưu `planned_start_date` + `planned_end_date` (tính 1 lần, dùng chung cho mọi instance của node đó)
- **`TaskInstance`** lưu `actual_start_date` + `actual_end_date` (thực tế, cập nhật từng instance)
- **Lý do:** Planned dates là thuộc tính của node trong quy trình; actual dates là trạng thái thực tế của từng lần thực hiện

### ADR-S9-02: is_parallel Flag
- Thêm `is_parallel: bool DEFAULT FALSE` vào **cả hai** `WorkflowNode` (template) và `HoSoWorkflowNode` (snapshot)
- Khi tạo snapshot HoSo, copy `is_parallel` từ WorkflowNode sang HoSoWorkflowNode
- per_household nodes KHÔNG đánh dấu `is_parallel` ở node level — chúng tự parallel bởi vì nhiều TaskInstance cùng node_id

### ADR-S9-03: Date Calculation Trigger
- Tính `planned_start/end`: khi HoSo workflow snapshot được tạo (`POST /ho-so/{id}/workflow`)
- Endpoint manual: `POST /ho-so/{id}/recalculate-dates` (dùng khi admin thay `ngay_bat_dau`)
- Cập nhật `actual_start`: khi task trước chuyển sang `hoan_thanh` (hook trong `PATCH /ho-so/{id}/tasks/{task_id}/status`)
- Cập nhật `actual_end`: khi task chính nó chuyển sang `hoan_thanh`

### ADR-S9-04: Parallel Group Logic
- Một "parallel group" = tập hợp các HoSoWorkflowNodes có cùng `parent_id`, cùng level, và đều có `is_parallel = True`
- Node đứng trước group (last sequential node trước group) → planned_start của group = planned_end của nó
- Node đứng sau group → planned_start = MAX(planned_end của tất cả nodes trong group)
- **EXCEPTION:** Nếu tất cả nodes cùng cấp đều có `is_parallel = True` thì nhóm đầu tiên theo `order` có cùng mốc với node cha

### ADR-S9-05: Progress Evaluation
```
actual_end_date IS NOT NULL:
  actual_end_date <= planned_end_date  → "dung_tien_do"
  actual_end_date > planned_end_date   → "cham_tien_do"
actual_end_date IS NULL + actual_start_date IS NOT NULL:
  today <= planned_end_date  → "dung_tien_do"
  today > planned_end_date   → "cham_tien_do"
actual_start_date IS NULL:
  → null  (chưa bắt đầu, không đánh giá)
```

---

## Stories

### BE Stories

---

#### S9-BE-01: Schema + Alembic Migration

**Assigned to:** Backend Engineer
**Priority:** 🔴 Critical (block all other stories)

**Changes to `backend/app/db/models.py`:**

1. **`WorkflowNode`** — thêm sau `per_household`:
```python
is_parallel: Mapped[bool] = mapped_column(Boolean, default=False)
```

2. **`HoSoWorkflowNode`** — thêm sau `per_household`:
```python
is_parallel: Mapped[bool] = mapped_column(Boolean, default=False)
planned_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
planned_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
```

3. **`TaskInstance`** — thêm sau `completed_at`:
```python
actual_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
actual_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
```

**Migration:**
```bash
cd backend
alembic revision --autogenerate -m "add_parallel_date_fields_s9"
alembic upgrade head
```

**Acceptance Criteria:**
- [ ] 4 columns mới xuất hiện trong DB sau `alembic upgrade head`
- [ ] Default values đúng: `is_parallel = False`, date fields = NULL
- [ ] Existing data không bị ảnh hưởng
- [ ] `alembic downgrade -1` rollback thành công

---

#### S9-BE-02: Workflow Admin API — is_parallel Support

**Assigned to:** Backend Engineer
**File:** `backend/app/api/v1/workflow.py`
**Depends on:** S9-BE-01

**Changes:**

1. **`WorkflowNodeCreate`** schema — thêm field:
```python
is_parallel: bool = False
```

2. **`WorkflowNodeUpdate`** schema — thêm field:
```python
is_parallel: Optional[bool] = None
```

3. **`node_to_dict()`** — thêm vào dict output:
```python
"is_parallel": node.is_parallel,
```

4. **`POST /nodes`** handler — thêm `is_parallel=body.is_parallel` vào constructor `WorkflowNode()`

5. **`PUT /nodes/{node_id}`** handler — đã dùng `model_dump(exclude_none=True)` nên tự động handle `is_parallel`

**Snapshot propagation** (`backend/app/api/v1/ho_so.py`):
- Tìm endpoint/function tạo `HoSoWorkflowNode` snapshot từ `WorkflowNode` template
- Thêm `is_parallel=source_node.is_parallel` khi copy field

**Acceptance Criteria:**
- [ ] `POST /workflow/nodes` body có thể nhận `is_parallel: true`
- [ ] `PUT /workflow/nodes/{id}` có thể toggle `is_parallel`
- [ ] `GET /workflow/templates/{id}` trả về `is_parallel` trong mỗi node
- [ ] Khi tạo HoSo với template, snapshot HoSoWorkflowNode có `is_parallel` đúng với template

---

#### S9-BE-03: Date Calculation Service

**Assigned to:** Backend Engineer
**New file:** `backend/app/services/task_date_service.py`
**Depends on:** S9-BE-01

**Function 1:** `calculate_planned_dates(ho_so_id: uuid.UUID, db: AsyncSession) -> None`

Logic:
1. Load `HoSoGPMB` → lấy `ngay_bat_dau` (anchor date). Nếu NULL → return (không tính)
2. Load tất cả `HoSoWorkflowNode` của ho_so, sorted theo level và order
3. Build tree structure (parent_id → children)
4. Gọi `_calc_planned_for_children(parent_id=None, start_date=ngay_bat_dau)` recursive

**Function `_calc_planned_for_children(parent_id, start_date, nodes_by_parent)`:**
```
children = nodes_by_parent[parent_id], sorted by order
cursor_date = start_date

Process children sequentially, EXCEPT when consecutive nodes have is_parallel=True:
  - Identify parallel groups: consecutive runs of nodes with is_parallel=True
  - For a sequential node:
      node.planned_start_date = cursor_date
      node.planned_end_date = cursor_date + timedelta(days=node.planned_days or 0)
      cursor_date = node.planned_end_date
      recurse: _calc_planned_for_children(node.id, node.planned_start_date)
  - For a parallel group [n1, n2, n3, ...]:
      group_start = cursor_date
      group_ends = []
      for each node in group:
          node.planned_start_date = group_start
          node.planned_end_date = group_start + timedelta(days=node.planned_days or 0)
          group_ends.append(node.planned_end_date)
          recurse: _calc_planned_for_children(node.id, node.planned_start_date)
      cursor_date = max(group_ends)
```

**Parallel group detection rule:**
- A "parallel group" is a maximal consecutive sequence of sibling nodes where `is_parallel=True`
- Example: [sequential, parallel, parallel, sequential] → one parallel group of 2 in the middle
- Example: [parallel, parallel, parallel] → one group of 3 starting at `start_date`

**per_household note:** per_household nodes are NOT marked `is_parallel` at node level. Their multiple TaskInstances all share the same `planned_start_date` / `planned_end_date` from the HoSoWorkflowNode. No special handling needed here.

**Function 2:** `set_actual_start_for_next(completed_node_id: uuid.UUID, ho_so_id: uuid.UUID, db: AsyncSession) -> None`

Logic:
1. Load completed `HoSoWorkflowNode` → get `parent_id`, `order`, `is_parallel`
2. Load all siblings (same parent_id, same ho_so_id), sorted by order
3. Determine what to unlock next:
   - If completed node is **sequential** (not in a parallel group): next sibling by order
   - If completed node is **part of a parallel group**: check if ALL nodes in the group are done (all their TaskInstances have `actual_end_date IS NOT NULL`). If yes → next sequential node after the group.
4. For the "next" node(s) to unlock:
   - Load all `TaskInstance` records for that node
   - Set `actual_start_date = date.today()` on each (if currently NULL)
5. Also handle: if completed node is the LAST child of its parent and parent is non-per_household → call `set_actual_start_for_next(parent_node_id, ho_so_id, db)` to propagate up

**Function 3:** `set_actual_end(task_instance_id: uuid.UUID, db: AsyncSession) -> None`
1. Load `TaskInstance`
2. Set `actual_end_date = date.today()`
3. Call `set_actual_start_for_next(task.workflow_node_id, task.ho_so_id, db)`

**Acceptance Criteria:**
- [ ] `calculate_planned_dates` computes correct sequential dates given `ngay_bat_dau`
- [ ] `calculate_planned_dates` handles parallel groups: sibling nodes with `is_parallel=True` share same `planned_start_date`
- [ ] `calculate_planned_dates` computes `planned_start_date` of post-parallel node = MAX(parallel group ends)
- [ ] `calculate_planned_dates` handles NULL `ngay_bat_dau` gracefully (no-op)
- [ ] `set_actual_start_for_next` sets `actual_start_date` on next node's TaskInstances when predecessor completes
- [ ] `set_actual_end` sets `actual_end_date` and triggers next-start propagation

---

#### S9-BE-04: Hook Date Logic into Task Status Change

**Assigned to:** Backend Engineer
**File:** `backend/app/api/v1/task.py`
**Depends on:** S9-BE-03

Find the endpoint `PATCH /ho-so/{id}/tasks/{task_id}/status` (or equivalent status update).

**Change:** When `new_status == TaskStatusEnum.hoan_thanh`:
```python
from ...services.task_date_service import set_actual_end
# After setting task.status = hoan_thanh, task.completed_at = datetime.utcnow():
await set_actual_end(task.id, db)
```

Also in the endpoint that **opens/creates TaskInstances** for a node (when a hồ sơ gets its workflow assigned):
- After creating all TaskInstances for the FIRST node in the workflow (order=0 root nodes):
  - Set `actual_start_date = ngay_bat_dau` (or today if ngay_bat_dau is NULL)

**Acceptance Criteria:**
- [ ] Completing a task sets `actual_end_date` on that TaskInstance (DB)
- [ ] Completing a task causes next sequential task's `actual_start_date` to be set
- [ ] Completing the last node in a parallel group opens next sequential node
- [ ] Completing a non-parallel task mid-workflow doesn't open unrelated tasks
- [ ] First workflow node gets `actual_start_date` when HoSo workflow is initialized

---

#### S9-BE-05: Recalculate Dates Endpoint + Planned Date Trigger

**Assigned to:** Backend Engineer
**Files:** `backend/app/api/v1/ho_so.py`, `backend/app/api/v1/task.py`
**Depends on:** S9-BE-03

**1. Trigger planned dates calculation on workflow init**

In `ho_so.py`, find the endpoint that creates HoSoWorkflowNode snapshot (likely `POST /ho-so/{id}/workflow` or inline in ho_so creation). After snapshot is created:
```python
from ...services.task_date_service import calculate_planned_dates
await calculate_planned_dates(ho_so.id, db)
```

**2. New endpoint `POST /ho-so/{id}/recalculate-dates`**

```python
@router.post("/{ho_so_id}/recalculate-dates")
async def recalculate_dates(
    ho_so_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin)),
):
    """Recalculate all planned dates for a hồ sơ (e.g., after ngay_bat_dau change)."""
    from ...services.task_date_service import calculate_planned_dates
    await calculate_planned_dates(uuid.UUID(ho_so_id), db)
    return {"message": "Dates recalculated"}
```

**Acceptance Criteria:**
- [ ] `POST /ho-so/{id}/recalculate-dates` returns 200 and triggers recalculation (admin only)
- [ ] After calling recalculate-dates, `planned_start_date` / `planned_end_date` updated on all HoSoWorkflowNodes
- [ ] Workflow snapshot creation automatically triggers planned date calculation

---

#### S9-BE-06: Expose Dates in API Responses

**Assigned to:** Backend Engineer
**Files:** `backend/app/api/v1/global_tasks.py`, `backend/app/api/v1/task.py`
**Depends on:** S9-BE-01

**Progress evaluation helper** (can be a module-level function):
```python
from datetime import date as date_type
def compute_tien_do(
    planned_end: date_type | None,
    actual_start: date_type | None,
    actual_end: date_type | None,
) -> str | None:
    if actual_end:
        return "dung_tien_do" if actual_end <= planned_end else "cham_tien_do"
    if actual_start and planned_end:
        today = date_type.today()
        return "dung_tien_do" if today <= planned_end else "cham_tien_do"
    return None
```

**`global_tasks.py` changes:**
1. In `SELECT` statement, add columns from `HoSoWorkflowNode`:
   - `HoSoWorkflowNode.planned_start_date`
   - `HoSoWorkflowNode.planned_end_date`
   And from `TaskInstance`:
   - `TaskInstance.actual_start_date`
   - `TaskInstance.actual_end_date`
2. In output dict, add:
```python
"planned_start_date": row["planned_start_date"].isoformat() if row["planned_start_date"] else None,
"planned_end_date": row["planned_end_date"].isoformat() if row["planned_end_date"] else None,
"actual_start_date": row["actual_start_date"].isoformat() if row["actual_start_date"] else None,
"actual_end_date": row["actual_end_date"].isoformat() if row["actual_end_date"] else None,
"tien_do": compute_tien_do(row["planned_end_date"], row["actual_start_date"], row["actual_end_date"]),
```

**`task.py` — `task_to_dict()` changes:**
Add to returned dict (these fields come from the TaskInstance model + joined HoSoWorkflowNode):
```python
"planned_start_date": node.planned_start_date.isoformat() if node.planned_start_date else None,
"planned_end_date": node.planned_end_date.isoformat() if node.planned_end_date else None,
"actual_start_date": task.actual_start_date.isoformat() if task.actual_start_date else None,
"actual_end_date": task.actual_end_date.isoformat() if task.actual_end_date else None,
"tien_do": compute_tien_do(node.planned_end_date, task.actual_start_date, task.actual_end_date),
```
(Note: `task_to_dict` receives the task but may need a separate `node` param for planned dates. Adjust as needed.)

**Acceptance Criteria:**
- [ ] `GET /tasks` (global) returns `planned_start_date`, `planned_end_date`, `actual_start_date`, `actual_end_date`, `tien_do`
- [ ] `tien_do` = `"dung_tien_do"` or `"cham_tien_do"` or `null` (never raises on NULL dates)
- [ ] Tasks with no `actual_start_date` return `tien_do = null`

---

### FE Stories

---

#### S9-FE-01: Admin — is_parallel Toggle in Quản lý Quy Trình

**Assigned to:** Frontend Engineer
**File:** `frontend/src/app/(dashboard)/quy-trinh/[templateId]/page.tsx`
**Depends on:** S9-BE-02 (API must return `is_parallel`)

**Node edit form changes:**
1. Thêm `Checkbox` "Song song với các bước cùng cấp" (`is_parallel`) vào form chỉnh sửa/tạo node
2. Gửi `is_parallel` trong `PATCH /workflow/nodes/{id}` request body khi save

**Tree display:**
3. Hiển thị badge/tag "Song song" (màu cyan) bên cạnh tên node nếu `is_parallel === true`

**Type update** (wherever WorkflowNode type is defined — likely inline or in `/types/index.ts`):
```typescript
is_parallel: boolean
```

**API calls:**
- Node create: `POST /workflow/nodes` → add `is_parallel` to body
- Node update: `PATCH /workflow/nodes/{id}` → add `is_parallel` to body

**Acceptance Criteria:**
- [ ] Node edit modal/drawer có checkbox "Song song" cho `is_parallel`
- [ ] Khi save, `is_parallel` được gửi lên BE và persist
- [ ] Tree hiển thị badge "Song song" trên node có `is_parallel = true`
- [ ] Default: unchecked khi tạo mới

---

#### S9-FE-02: /cong-viec — Hiển thị Ngày và Tiến Độ

**Assigned to:** Frontend Engineer
**File:** `frontend/src/app/(dashboard)/cong-viec/page.tsx`
**Depends on:** S9-BE-06 (API must return date fields)

**Type update:**
```typescript
interface CongViecItem {
  // ... existing fields ...
  planned_start_date: string | null
  planned_end_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  tien_do: 'dung_tien_do' | 'cham_tien_do' | null
}
```

**New columns** (add to `buildColumns()` after `ten_cong_viec`):
```
| Ngày BĐ DK  | Ngày KT DK  | Ngày BĐ TT  | Ngày KT TT  | Tiến độ     |
```
- Date columns: use `formatDate()` utility; show `—` if null
- `Tiến độ` column:
  ```tsx
  {record.tien_do === 'dung_tien_do' && <Tag color="success">Đúng tiến độ</Tag>}
  {record.tien_do === 'cham_tien_do' && <Tag color="error">Chậm tiến độ</Tag>}
  {!record.tien_do && <span style={{ color: '#bbb' }}>—</span>}
  ```

**Column widths:**
- Date columns: `width: 120`
- Tiến độ: `width: 130`

**Note:** Existing columns should maintain their widths. Consider adding a horizontal scroll to the table (`scroll={{ x: 'max-content' }}`) if not already present.

**Acceptance Criteria:**
- [ ] Bảng công việc hiển thị 5 cột mới: 4 cột ngày + 1 cột tiến độ
- [ ] Ngày null hiển thị "—"
- [ ] Tag "Đúng tiến độ" (xanh) khi `tien_do = "dung_tien_do"`
- [ ] Tag "Chậm tiến độ" (đỏ) khi `tien_do = "cham_tien_do"`
- [ ] Dash khi `tien_do = null`
- [ ] Table có horizontal scroll khi quá rộng

---

## Definition of Done (Sprint 9)

Tất cả stories đạt khi:
- [ ] Code complete, TypeScript 0 errors
- [ ] BE: server khởi động không lỗi sau migration
- [ ] FE: `npm run build` 0 errors
- [ ] Reviewed by Tech Lead

---

## Rollback Strategy

Nếu cần rollback:
1. `alembic downgrade -1` → xóa 4 columns mới
2. Revert commits liên quan đến sprint-9
3. Restart BE server

---

## Parallel Execution Notes

BE và FE làm **song song**:
- **FE** có thể bắt đầu S9-FE-01 ngay (admin UI changes không phụ thuộc BE)
- **FE** S9-FE-02 phụ thuộc S9-BE-06; FE engineer có thể mock data trong `CongViecItem` để dev trước khi BE ready
- **BE** làm theo thứ tự: S9-BE-01 → S9-BE-02 ∥ S9-BE-03 → S9-BE-04 → S9-BE-05 → S9-BE-06
