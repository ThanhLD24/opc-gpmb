# BUG-CV-001 Fix Plan

**Bug:** BUG-CV-001 — Danh sách công việc không phân biệt hộ
**Assigned to:** Full-stack Engineer
**Estimated effort:** 20 min (2 surgical edits)

---

## Fix 1 — Backend: thêm Ho vào JOIN + SELECT + response

**File:** `backend/app/api/v1/global_tasks.py`

### 1a. Thêm import `Ho`

```python
# BEFORE (line 11):
from ...db.models import TaskInstance, HoSoWorkflowNode, HoSoGPMB, User, TaskStatusEnum, RoleEnum

# AFTER:
from ...db.models import TaskInstance, HoSoWorkflowNode, HoSoGPMB, User, Ho, TaskStatusEnum, RoleEnum
```

### 1b. Thêm `outerjoin(Ho, ...)` vào `base_join`

```python
# BEFORE (line ~74-79):
base_join = (
    lambda q: q
    .join(HoSoWorkflowNode, TaskInstance.workflow_node_id == HoSoWorkflowNode.id)
    .join(HoSoGPMB, TaskInstance.ho_so_id == HoSoGPMB.id)
    .outerjoin(User, HoSoGPMB.cbcq_id == User.id)
    .where(and_(*conditions))
)

# AFTER:
base_join = (
    lambda q: q
    .join(HoSoWorkflowNode, TaskInstance.workflow_node_id == HoSoWorkflowNode.id)
    .join(HoSoGPMB, TaskInstance.ho_so_id == HoSoGPMB.id)
    .outerjoin(User, HoSoGPMB.cbcq_id == User.id)
    .outerjoin(Ho, TaskInstance.ho_id == Ho.id)
    .where(and_(*conditions))
)
```

### 1c. Thêm 3 trường vào SELECT

```python
# BEFORE (line ~87-96):
data_q = base_join(
    select(
        TaskInstance.id,
        TaskInstance.ho_so_id,
        TaskInstance.status,
        TaskInstance.updated_at,
        HoSoWorkflowNode.name.label("ten_cong_viec"),
        HoSoGPMB.code.label("ho_so_code"),
        HoSoGPMB.name.label("ho_so_name"),
        User.full_name.label("cbcq_name"),
    )
)

# AFTER:
data_q = base_join(
    select(
        TaskInstance.id,
        TaskInstance.ho_so_id,
        TaskInstance.ho_id,
        TaskInstance.status,
        TaskInstance.updated_at,
        HoSoWorkflowNode.name.label("ten_cong_viec"),
        HoSoGPMB.code.label("ho_so_code"),
        HoSoGPMB.name.label("ho_so_name"),
        User.full_name.label("cbcq_name"),
        Ho.ma_ho.label("ma_ho"),
        Ho.ten_chu_ho.label("ten_chu_ho"),
    )
)
```

### 1d. Thêm 3 trường vào response item

```python
# BEFORE (items list comprehension):
items = [
    {
        "id": str(row["id"]),
        "ho_so_id": str(row["ho_so_id"]),
        "ho_so_code": row["ho_so_code"],
        "ho_so_name": row["ho_so_name"],
        "ten_cong_viec": row["ten_cong_viec"],
        "trang_thai": row["status"].value,
        "trang_thai_label": TASK_STATUS_LABELS.get(row["status"].value, row["status"].value),
        "cbcq_name": row["cbcq_name"],
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
    }
    for row in rows
]

# AFTER:
items = [
    {
        "id": str(row["id"]),
        "ho_so_id": str(row["ho_so_id"]),
        "ho_so_code": row["ho_so_code"],
        "ho_so_name": row["ho_so_name"],
        "ten_cong_viec": row["ten_cong_viec"],
        "trang_thai": row["status"].value,
        "trang_thai_label": TASK_STATUS_LABELS.get(row["status"].value, row["status"].value),
        "cbcq_name": row["cbcq_name"],
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
        "ho_id": str(row["ho_id"]) if row["ho_id"] else None,
        "ma_ho": row["ma_ho"],
        "ten_chu_ho": row["ten_chu_ho"],
    }
    for row in rows
]
```

---

## Fix 2 — Frontend: thêm trường vào interface + thêm cột "Hộ"

**File:** `frontend/src/app/(dashboard)/cong-viec/page.tsx`

### 2a. Thêm 3 trường vào `CongViecItem` interface

```typescript
// BEFORE (line ~14-24):
interface CongViecItem {
  id: string
  ho_so_id: string
  ho_so_code: string
  ho_so_name: string
  ten_cong_viec: string
  trang_thai: string
  trang_thai_label: string
  cbcq_name: string | null
  updated_at: string | null
}

// AFTER:
interface CongViecItem {
  id: string
  ho_so_id: string
  ho_so_code: string
  ho_so_name: string
  ten_cong_viec: string
  trang_thai: string
  trang_thai_label: string
  cbcq_name: string | null
  updated_at: string | null
  ho_id: string | null
  ma_ho: string | null
  ten_chu_ho: string | null
}
```

### 2b. Thêm cột "Hộ" vào `buildColumns()` — sau cột "Tên công việc"

```tsx
// Thêm sau cột ten_cong_viec (sau line ~78):
{
  title: 'Hộ',
  key: 'ho',
  width: 180,
  render: (_: unknown, record: CongViecItem) =>
    record.ho_id ? (
      <div>
        <div style={{ fontWeight: 600, fontSize: 12, color: '#9B1B30' }}>{record.ma_ho}</div>
        <div style={{ fontSize: 12, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{record.ten_chu_ho}</div>
      </div>
    ) : <span style={{ color: '#ccc' }}>—</span>,
},
```

---

## Scope

**CHỈ sửa 2 files:**
1. `backend/app/api/v1/global_tasks.py`
2. `frontend/src/app/(dashboard)/cong-viec/page.tsx`

**Không được:** sửa model, migration, các API khác, hoặc refactor.

## Verification

1. Trang `/cong-viec` → chọn hồ sơ có per_household node → thấy cột "Hộ" với `ma_ho` + `ten_chu_ho`
2. Node không per_household (`ho_id = NULL`) → cột "Hộ" hiển thị "—"
3. TypeScript: 0 errors
