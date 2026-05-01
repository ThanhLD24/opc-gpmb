# Feature Brief — S8-F2: Đính kèm tài liệu cho công việc

**Ngày tạo:** 2026-05-01  
**Stakeholder:** Cán bộ chuyên quản (CBCQ), Kế toán, Admin  
**Priority:** 🟡 Should Have (demo value)  
**Loại:** New Feature

---

## 1. Vấn đề & Nhu cầu

Hiện tại mỗi task chỉ có thể lưu **một file scan duy nhất** (trường `file_scan_url` trên task_instance). Cán bộ cần bổ sung **nhiều tài liệu liên quan** cho mỗi bước công việc, ví dụ:
- Đơn đề nghị của hộ dân
- Biên bản thỏa thuận
- Quyết định phê duyệt
- Bản vẽ hoặc bản đồ
- Hóa đơn/chứng từ tài chính

File scan (giấy tờ quét) vẫn giữ nguyên. Tính năng mới là **đính kèm tài liệu bổ sung** (nhiều file, đặt tên mô tả) độc lập với file scan.

---

## 2. Yêu cầu nghiệp vụ

### Tính năng: Quản lý tài liệu đính kèm theo task

**Người dùng có thể:**
1. **Upload** tài liệu vào một công việc (task_instance) — nhiều file
2. **Xem danh sách** tài liệu đã đính kèm (tên file, ngày upload, người upload)
3. **Tải xuống** tài liệu
4. **Xóa** tài liệu (chỉ người upload hoặc admin)

**Quyền đính kèm:**
- `admin`, `cbcq`: toàn quyền (upload, xem, xóa)
- `ke_toan`: upload và xem (không xóa file của người khác)
- `gddh`: chỉ xem và tải xuống

**Định dạng file chấp nhận:** PDF, DOCX, XLSX, PNG, JPG, JPEG  
**Giới hạn kích thước:** tối đa 10MB / file  
**Số lượng:** tối đa 20 file / task

---

## 3. Luồng người dùng

```
[Cán bộ mở chi tiết công việc]
         ↓
[Thấy section "Tài liệu đính kèm" ở cuối drawer]
         ↓
    ┌────────────────────────────────────────────┐
    │ Tài liệu đính kèm                    [+ Upload] │
    │                                                   │
    │ 📄 bienban-thoa-thuan.pdf   2026-05-01  [↓][🗑]  │
    │ 📄 quyet-dinh-phe-duyet.pdf 2026-04-28  [↓][🗑]  │
    │ (Trống nếu chưa có tài liệu)                     │
    └────────────────────────────────────────────┘
         ↓
[Nhấn "+ Upload"] → chọn file từ máy → upload thành công → list cập nhật
```

---

## 4. Yêu cầu kỹ thuật (hướng dẫn cho Tech Lead / SA)

### Database — bảng mới `task_attachments`

```sql
CREATE TABLE task_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES task_instances(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,           -- tên file gốc
  file_path   TEXT NOT NULL,           -- đường dẫn lưu trữ trên server
  file_size   INTEGER,                 -- bytes
  mime_type   TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ix_task_attachments_task_id ON task_attachments(task_id);
```

### Backend Endpoints

| Method | Path | Mô tả | Auth |
|--------|------|--------|------|
| `GET` | `/ho-so/{ho_so_id}/tasks/{task_id}/attachments` | List tài liệu đính kèm của task | Tất cả role đã đăng nhập |
| `POST` | `/ho-so/{ho_so_id}/tasks/{task_id}/attachments` | Upload file mới | admin, cbcq, ke_toan |
| `GET` | `/ho-so/{ho_so_id}/tasks/{task_id}/attachments/{att_id}/download` | Download file | Tất cả role đã đăng nhập |
| `DELETE` | `/ho-so/{ho_so_id}/tasks/{task_id}/attachments/{att_id}` | Xóa file | admin, cbcq; ke_toan chỉ xóa file của mình |

**Response shape (GET list):**
```json
[
  {
    "id": "uuid",
    "filename": "bienban.pdf",
    "file_size": 204800,
    "mime_type": "application/pdf",
    "uploaded_by_name": "Nguyễn Văn A",
    "uploaded_at": "2026-05-01T10:00:00Z",
    "download_url": "/api/v1/ho-so/{id}/tasks/{id}/attachments/{id}/download"
  }
]
```

### Frontend — Thêm vào `TaskDetail.tsx`

Section "Tài liệu đính kèm" hiển thị ở cuối drawer, **sau** section File scan:

```tsx
{/* Tài liệu đính kèm */}
<Divider />
<div>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
    <span style={{ fontWeight: 500 }}>Tài liệu đính kèm</span>
    {canUploadAttachment && <Upload beforeUpload={handleUpload}><Button size="small" icon={<UploadOutlined />}>Thêm tài liệu</Button></Upload>}
  </div>
  <List
    dataSource={attachments}
    renderItem={(att) => (
      <List.Item
        actions={[
          <a href={att.download_url}><Button size="small" icon={<DownloadOutlined />} /></a>,
          canDeleteAttachment(att) && <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(att.id)} />
        ]}
      >
        <List.Item.Meta title={att.filename} description={`${att.uploaded_by_name} · ${formatDate(att.uploaded_at)}`} />
      </List.Item>
    )}
    locale={{ emptyText: 'Chưa có tài liệu đính kèm' }}
  />
</div>
```

---

## 5. Success Criteria

- SC-1: CBCQ mở task → thấy section "Tài liệu đính kèm" với danh sách files (hoặc empty state)
- SC-2: CBCQ upload file PDF → file xuất hiện trong danh sách ngay sau khi upload
- SC-3: Mọi user đã đăng nhập đều có thể tải file về
- SC-4: CBCQ/admin có thể xóa bất kỳ file nào; ke_toan chỉ xóa file mình upload
- SC-5: File không hợp lệ (>10MB, sai định dạng) → hiển thị thông báo lỗi rõ ràng
- SC-6: Upload thành công → list tự động cập nhật (không cần refresh trang)
- SC-7: File scan cũ (`require_scan`) vẫn hoạt động độc lập, không ảnh hưởng

---

## 6. Out of Scope

- Preview file trực tiếp trong browser (chỉ download) — để v2
- Full-text search trong file — không làm
- Versioning file (lịch sử phiên bản) — để v2
- Giới hạn quota theo hồ sơ — để v2

---

## 7. Phụ thuộc

- Phụ thuộc S8-F1 (nếu `ke_toan` cần xem task thì cần fix "Việc của tôi" trước)
- Không phụ thuộc feature nào khác

---

## 8. Ước tính độ phức tạp

| Layer | Công việc | Effort |
|-------|-----------|--------|
| DB | Tạo bảng `task_attachments` | S |
| BE | 4 endpoints + file storage | M |
| FE | Section trong TaskDetail | M |
| **Tổng** | | **~1 ngày** |
