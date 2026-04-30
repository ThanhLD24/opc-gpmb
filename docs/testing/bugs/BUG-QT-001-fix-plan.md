# BUG-QT-001 Fix Plan

**Bug:** BUG-QT-001 — Quy Trình: Thêm bước con thất bại + Form sửa bỏ qua phân quyền
**Assigned to:** Frontend Engineer
**File:** `frontend/src/app/(dashboard)/quy-trinh/page.tsx`
**Estimated effort:** 30 min (surgical changes only)

---

## Fix 1 — Thêm `template_id` và `level` vào addChildMutation

**Problem:** `POST /workflow/nodes` thiếu `template_id` và `level` → 422.

**Fix:**

1. Thay đổi `useQuery` để expose cả `templateId` cùng với `nodes`:

```typescript
// BEFORE:
const { data: template, isLoading } = useQuery<WorkflowNode[]>({
  queryKey: ['workflow-template'],
  queryFn: async () => {
    const res = await api.get('/workflow/template')
    return res.data.nodes || []
  },
})

// AFTER:
const { data: templateData, isLoading } = useQuery<{ id: string; nodes: WorkflowNode[] }>({
  queryKey: ['workflow-template'],
  queryFn: async () => {
    const res = await api.get('/workflow/template')
    return { id: res.data.id as string, nodes: res.data.nodes || [] }
  },
})
const template = templateData?.nodes
```

2. Fix `addChildMutation` để thêm `template_id` và `level`:

```typescript
// BEFORE:
const addChildMutation = useMutation({
  mutationFn: async () => {
    const res = await api.post('/workflow/nodes', {
      parent_id: selectedNode!.id,
      name: 'Bước mới',
      per_household: selectedNode?.per_household || false,
    })
    return res.data
  },
  ...
})

// AFTER:
const addChildMutation = useMutation({
  mutationFn: async () => {
    const res = await api.post('/workflow/nodes', {
      template_id: templateData!.id,
      parent_id: selectedNode!.id,
      name: 'Bước mới',
      level: (selectedNode!.level ?? 0) + 1,
      per_household: selectedNode?.per_household || false,
    })
    return res.data
  },
  ...
})
```

---

## Fix 2 — Ẩn form edit và action buttons với non-admin

**Problem:** Form sửa và "Thêm bước con" hiển thị với mọi role nhưng API yêu cầu admin.

**Fix:** Wrap các action buttons và form submit với `isAdmin` guard. Cách đơn giản nhất:

- Nút "Thêm bước con": thêm điều kiện `isAdmin &&` trước `<Button>`
- Form `onFinish`: disable nếu không phải admin  
- Nút "Lưu thay đổi": disable với `disabled={!isAdmin}`

```tsx
// "Thêm bước con" button:
{isAdmin && (
  <Button
    size="small"
    icon={<PlusOutlined />}
    onClick={() => addChildMutation.mutate()}
    loading={addChildMutation.isPending}
  >
    Thêm bước con
  </Button>
)}

// "Lưu thay đổi" button:
<Button type="primary" htmlType="submit" loading={updateMutation.isPending} disabled={!isAdmin}>
  Lưu thay đổi
</Button>
```

---

## Scope

**CHỈ sửa file:** `frontend/src/app/(dashboard)/quy-trinh/page.tsx`

**Không được:**
- Sửa backend
- Refactor các phần khác
- Thêm tính năng ngoài scope

## Verification

Sau khi fix:
1. Login admin → chọn 1 node → nhấn "Thêm bước con" → node mới xuất hiện trong tree ✅
2. Login admin → sửa tên node → nhấn "Lưu thay đổi" → toast "Cập nhật thành công" ✅
3. Login cbcq/gddh/ke_toan → vào /quy-trinh → KHÔNG thấy nút "Thêm bước con", nút "Lưu thay đổi" disabled ✅
4. TypeScript: 0 errors (`npx tsc --noEmit`)
