# Sprint 8-F1 Kickoff — Sửa "Công việc của tôi" + Phân quyền Action Buttons

**Ngày:** 2026-05-01  
**Tech Lead:** TL  
**Source:** `docs/features/s8-cong-viec-cua-toi-fix-brief.md`  
**Stories:** S8-BE-01 (Backend) ∥ S8-FE-01 (Frontend)  
**Rollback:** Revert 2 files (global_tasks.py, task.py); revert TaskDetail.tsx — không thay đổi schema DB

---

## Tóm tắt kỹ thuật

**Root cause xác định:**
1. `GET /tasks?my_tasks=true` filter bằng `cbcq_id == current_user.id` → ke_toan/gddh trả empty
2. Validation guard ném 400 cho ke_toan/gddh khi không có `ho_so_id`
3. `TaskDetail.tsx` `canEdit = admin || cbcq` — ke_toan không thấy form + nút Lưu

**Giải pháp:**
- BE: role-aware filter — ke_toan/gddh/admin không bị giới hạn bởi `cbcq_id`
- BE: role guard trên status PATCH — chỉ admin/cbcq đổi trạng thái; ke_toan chỉ sửa trường tài chính
- FE: thêm `canFillFinance` logic vào `TaskDetail`

---

## S8-BE-01 — Backend: Fix my_tasks filter + role guards [SECURITY]

**Engineer:** Backend  
**Files:**
- `backend/app/api/v1/global_tasks.py`
- `backend/app/api/v1/task.py`

### global_tasks.py — Fix list_tasks_global

Sửa hàm `list_tasks_global` tại `backend/app/api/v1/global_tasks.py`:

```python
@router.get("")
async def list_tasks_global(
    ho_so_id: Optional[str] = Query(None),
    trang_thai: Optional[str] = Query(None),
    my_tasks: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_admin = current_user.role == RoleEnum.admin
    is_cbcq = current_user.role == RoleEnum.cbcq
    is_ke_toan = current_user.role == RoleEnum.ke_toan
    is_gddh = current_user.role == RoleEnum.gddh

    # ke_toan, gddh, admin đều có thể xem tất cả tasks — chỉ yêu cầu filter cho role khác
    needs_filter = not is_admin and not is_cbcq and not is_ke_toan and not is_gddh
    if needs_filter and not my_tasks and ho_so_id is None:
        raise HTTPException(
            status_code=400,
            detail="Vui lòng chọn hồ sơ GPMB để xem công việc",
        )

    conditions = [HoSoGPMB.deleted_at.is_(None)]

    # UC-09: CBCQ auto-scoped to their assigned hồ sơ (always — không cần my_tasks)
    if is_cbcq:
        conditions.append(HoSoGPMB.cbcq_id == current_user.id)

    # my_tasks=true cho CBCQ = đã xử lý bởi auto-scope ở trên
    # my_tasks=true cho ke_toan/gddh/admin = không thêm filter (họ thấy tất cả)
    # Không còn: conditions.append(HoSoGPMB.cbcq_id == current_user.id) cho my_tasks

    if ho_so_id:
        try:
            conditions.append(TaskInstance.ho_so_id == uuid.UUID(ho_so_id))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid ho_so_id UUID")

    if trang_thai:
        try:
            conditions.append(TaskInstance.status == TaskStatusEnum(trang_thai))
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid trang_thai: {trang_thai}. "
                       f"Valid values: {[e.value for e in TaskStatusEnum]}",
            )

    # ... phần còn lại giữ nguyên (base_join, count, data, return)
```

**Thay đổi chính:**
- Thêm `is_ke_toan = current_user.role == RoleEnum.ke_toan` và `is_gddh = ...`
- `needs_filter` logic mới: chỉ yêu cầu filter cho role không thuộc 4 role trên
- XÓA dòng `if my_tasks: conditions.append(HoSoGPMB.cbcq_id == current_user.id)` — dòng này là root cause bug

### task.py — Thêm role guard trên 3 endpoints

#### PATCH status — Chỉ admin/cbcq
```python
@router.patch("/{ho_so_id}/tasks/{task_id}/status")
async def update_task_status(
    ho_so_id: str,
    task_id: str,
    body: TaskStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # [SECURITY] Only admin/cbcq can change task completion status
    if current_user.role not in (RoleEnum.admin, RoleEnum.cbcq):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin hoặc CBCQ mới được cập nhật trạng thái công việc",
        )
    # ... phần còn lại giữ nguyên
```

#### PATCH fields — admin/cbcq được tất cả; ke_toan chỉ finance fields
```python
@router.patch("/{ho_so_id}/tasks/{task_id}/fields")
async def update_task_fields(
    ho_so_id: str,
    task_id: str,
    body: TaskFieldsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # [SECURITY] ke_toan can only update financial fields
    is_ke_toan = current_user.role == RoleEnum.ke_toan
    can_edit_all = current_user.role in (RoleEnum.admin, RoleEnum.cbcq)

    if not can_edit_all and not is_ke_toan:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền cập nhật thông tin công việc",
        )

    task = result.scalar_one_or_none()  # giữ nguyên query phần trên
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    if can_edit_all:
        # admin/cbcq: cập nhật tất cả fields
        if body.so_vb is not None:
            task.so_vb = body.so_vb
        if body.ngay_vb is not None:
            try:
                task.ngay_vb = datetime.fromisoformat(body.ngay_vb)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid ngay_vb format")
        if body.loai_vb is not None:
            task.loai_vb = body.loai_vb

    # ke_toan + admin/cbcq đều có thể cập nhật finance fields
    if body.gia_tri_trinh is not None:
        task.gia_tri_trinh = body.gia_tri_trinh
    if body.gia_tri_duyet is not None:
        task.gia_tri_duyet = body.gia_tri_duyet
    if body.ghi_chu is not None:
        task.ghi_chu = body.ghi_chu

    await db.commit()
    await db.refresh(task)
    return task_to_dict(task)
```

#### POST upload — Cho phép ke_toan (không cần sửa logic, chỉ cần đảm bảo không có role guard)
Hiện tại `upload_scan_file` đã dùng `get_current_user` (không có role guard) → ke_toan đã có thể upload. **Không cần thay đổi.**

**Acceptance Criteria — S8-BE-01:**
- AC-1: `GET /tasks?my_tasks=true` với ke_toan token → trả tất cả tasks (không empty)
- AC-2: `GET /tasks?my_tasks=true` với gddh token → trả tất cả tasks
- AC-3: `GET /tasks?my_tasks=true` với cbcq token → trả tasks trong hồ sơ cbcq phụ trách (giữ nguyên)
- AC-4: `PATCH .../tasks/{id}/status` với ke_toan token → 403 Forbidden
- AC-5: `PATCH .../tasks/{id}/fields` với ke_toan token + chỉ finance fields → 200 OK
- AC-6: `PATCH .../tasks/{id}/fields` với ke_toan token + so_vb field → vẫn 200 (ke_toan không bị block hoàn toàn, chỉ FE ẩn field đó)
  - **Note:** Restrict ở FE đủ cho scope này — BE restriction cho non-finance fields là overkill
- AC-7: `POST .../tasks/{id}/upload` với ke_toan token → 200 OK

**DoD:** 0 Python exceptions, API trả đúng data theo test AC-1 đến AC-7.

---

## S8-FE-01 — Frontend: Phân quyền TaskDetail + ViecCuaToiTab

**Engineer:** Frontend  
**Files:**
- `frontend/src/components/task/TaskDetail.tsx`
- `frontend/src/app/(dashboard)/cong-viec/page.tsx` (kiểm tra — nếu BE fix đúng thì không cần sửa)

### TaskDetail.tsx — Phân quyền 3 cấp

Thay thế `canEdit` đơn giản bằng 3 cấp quyền:

```typescript
const currentUser = useCurrentUser()

// Cấp quyền xử lý công việc
const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'cbcq'
// ke_toan: chỉ điền trường tài chính + upload scan
const canFillFinance = currentUser?.role === 'ke_toan'
// Cho phép save nếu có bất kỳ quyền nào
const canSave = canEdit || canFillFinance
```

**Sửa phần hiển thị switch/status:**
```tsx
{/* Status toggle — CHỈ admin/cbcq */}
{isLeaf && canEdit && (
  <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <span style={{ fontWeight: 500 }}>Trạng thái:</span>
      <Switch
        checked={task.status === 'hoan_thanh'}
        onChange={(checked) => statusMutation.mutate(checked)}
        checkedChildren="Hoàn thành"
        unCheckedChildren="Đang thực hiện"
        loading={statusMutation.isPending}
      />
    </div>
    <Divider />
  </>
)}

{/* Status display (read-only) — cho ke_toan, gddh, và non-leaf tasks */}
{(!canEdit) && (
  <div style={{ marginBottom: 16 }}>
    <span style={{ fontWeight: 500 }}>Trạng thái: </span>
    <Tag color={task.status === 'hoan_thanh' ? 'success' : 'processing'}>
      {TASK_STATUS_LABELS[task.status]}
    </Tag>
    {task.completed_at && (
      <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
        Hoàn thành: {formatDate(task.completed_at)}
      </div>
    )}
  </div>
)}
```

**Sửa phần Custom fields Form:**
```tsx
{hasAnyField && (
  <Form form={form} layout="vertical">
    {/* Administrative fields — chỉ admin/cbcq điền được */}
    {task.field_so_vb && (
      <Form.Item name="so_vb" label="Số văn bản">
        <Input disabled={!canEdit} placeholder="Nhập số văn bản" />
      </Form.Item>
    )}
    {task.field_ngay_vb && (
      <Form.Item name="ngay_vb" label="Ngày văn bản">
        <DatePicker style={{ width: '100%' }} disabled={!canEdit} format="DD/MM/YYYY" />
      </Form.Item>
    )}
    {task.field_loai_vb && (
      <Form.Item name="loai_vb" label="Loại văn bản">
        <Select disabled={!canEdit} options={LOAI_VB_OPTIONS} placeholder="Chọn loại văn bản" allowClear />
      </Form.Item>
    )}

    {/* Finance fields — admin/cbcq/ke_toan đều điền được */}
    {task.field_gia_tri_trinh && (
      <Form.Item name="gia_tri_trinh" label="Giá trị trình (VND)">
        <InputNumber
          style={{ width: '100%' }}
          disabled={!canSave}   // ← đổi từ !canEdit sang !canSave
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          parser={(v) => Number(v!.replace(/\./g, '')) as 0}
          min={0}
        />
      </Form.Item>
    )}
    {task.field_gia_tri_duyet && (
      <Form.Item name="gia_tri_duyet" label="Giá trị duyệt (VND)">
        <InputNumber
          style={{ width: '100%' }}
          disabled={!canSave}   // ← đổi từ !canEdit sang !canSave
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          parser={(v) => Number(v!.replace(/\./g, '')) as 0}
          min={0}
        />
      </Form.Item>
    )}
    {task.field_ghi_chu && (
      <Form.Item name="ghi_chu" label="Ghi chú">
        <Input.TextArea rows={3} disabled={!canSave} />  {/* ← đổi từ !canEdit */}
      </Form.Item>
    )}
  </Form>
)}
```

**Sửa footer — Nút Lưu:**
```tsx
footer={
  canSave && hasAnyField ? (   // ← đổi từ canEdit sang canSave
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
      <Button onClick={onClose}>Đóng</Button>
      <Button
        type="primary"
        onClick={() => {
          // ke_toan chỉ submit finance fields
          const fieldsToSubmit = canEdit
            ? undefined  // validate all
            : ['gia_tri_trinh', 'gia_tri_duyet', 'ghi_chu']
          form.validateFields(fieldsToSubmit).then(values => {
            // Nếu là ke_toan, chỉ gửi finance fields
            if (canFillFinance && !canEdit) {
              const financeOnly = {
                gia_tri_trinh: values.gia_tri_trinh,
                gia_tri_duyet: values.gia_tri_duyet,
                ghi_chu: values.ghi_chu,
              }
              fieldsMutation.mutate(financeOnly)
            } else {
              fieldsMutation.mutate(values)
            }
          })
        }}
        loading={fieldsMutation.isPending}
      >
        Lưu
      </Button>
    </div>
  ) : (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Button onClick={onClose}>Đóng</Button>
    </div>
  )
}
```

**Sửa phần File scan upload:**
```tsx
{task.require_scan && (
  <div style={{ marginTop: hasAnyField ? 0 : 8 }}>
    <Divider />
    <div style={{ fontWeight: 500, marginBottom: 8 }}>File scan</div>
    {task.file_scan_url ? (
      <Space>
        <a href={task.file_scan_url} target="_blank" rel="noreferrer">
          <Button icon={<DownloadOutlined />} size="small">Tải xuống</Button>
        </a>
        {canSave && (   // ← đổi từ canEdit sang canSave
          <Upload showUploadList={false} beforeUpload={(file) => { uploadMutation.mutate(file); return false }}>
            <Button icon={<UploadOutlined />} size="small" loading={uploadMutation.isPending}>Thay thế</Button>
          </Upload>
        )}
      </Space>
    ) : canSave ? (   // ← đổi từ canEdit sang canSave
      <Upload showUploadList={false} beforeUpload={(file) => { uploadMutation.mutate(file); return false }}>
        <Button icon={<UploadOutlined />} loading={uploadMutation.isPending}>Upload file scan</Button>
      </Upload>
    ) : (
      <span style={{ color: '#999' }}>Chưa có file scan</span>
    )}
  </div>
)}
```

### cong-viec/page.tsx — Kiểm tra ViecCuaToiTab

`ViecCuaToiTab` gọi `GET /tasks?my_tasks=true&page=1&page_size=20`. Sau khi BE fix, endpoint này sẽ trả tasks đúng cho ke_toan/gddh. **Không cần sửa FE nếu BE hoạt động đúng.**

Chỉ cần verify: không có `enabled` condition gây block query. Hiện tại không có → OK.

**Acceptance Criteria — S8-FE-01:**
- AC-1: ke_toan đăng nhập → vào "Việc của tôi" → thấy danh sách tasks (không rỗng)
- AC-2: ke_toan click vào task có `field_gia_tri_trinh` → drawer mở → form gia_tri_trinh có thể điền → nút Lưu hiển thị
- AC-3: ke_toan click vào task có `field_so_vb` → drawer mở → field so_vb **disabled** (readonly)
- AC-4: ke_toan click vào task → **không thấy** Switch toggle trạng thái
- AC-5: ke_toan thấy status read-only tag (Đang thực hiện / Hoàn thành)
- AC-6: ke_toan click task có `require_scan` → thấy nút Upload file scan
- AC-7: gddh click vào task → drawer mở → tất cả fields disabled → không có nút Lưu
- AC-8: admin/cbcq vẫn hoạt động đúng như cũ (full access)
- AC-9: 0 TypeScript errors

**DoD:** AC-1 đến AC-9 passed, không có regression trên admin/cbcq flow.

---

## Phụ thuộc & rủi ro

| Rủi ro | Mức độ | Mitigant |
|--------|--------|---------|
| ke_toan submit cả form full → BE chỉ cập nhật finance fields | Thấp | FE filter payload trước khi gửi |
| Rollup logic khi đổi status không bị ảnh hưởng | Không có | Status chỉ admin/cbcq mới gọi |
| `my_tasks=true` với cbcq → vẫn chỉ thấy hồ sơ mình phụ trách | Đã đảm bảo | `is_cbcq` condition độc lập với `my_tasks` |

## Rollback

Nếu cần rollback:
1. `git revert` các commit của sprint này
2. DB không thay đổi → không cần migration rollback
