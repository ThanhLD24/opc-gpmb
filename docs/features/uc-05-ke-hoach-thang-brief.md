# Feature Brief — UC-05 Kế hoạch chi trả tháng

**Mã feature:** UC-05  
**Tên:** Kế hoạch chi trả tháng  
**Tác giả:** Product Owner (BMAD)  
**Ngày:** 2026-04-30  
**Trạng thái:** ✅ UNBLOCKED — PO đã trả lời KH-01..04, sẵn sàng cho Sprint 5

---

## 1. Bối cảnh & Vấn đề

Kể từ Sprint 3, UC-05 liên tục bị hoãn vì 4 câu hỏi nghiệp vụ (KH-01..04) chưa được trả lời. Đây là những quyết định về cách tạo kế hoạch tháng, độ chi tiết (granularity), quy tắc chỉnh sửa sau xuất báo cáo, và định dạng xuất.

**Giá trị nghiệp vụ:**
- CBCQ cần bức tranh tổng quan "tháng này hồ sơ X phải làm gì" để lên lịch và báo cáo lãnh đạo
- GĐĐH/BLĐ cần xuất báo cáo tiến độ tháng để nộp đơn vị cấp trên
- Hiện tại không có tính năng này — mọi kế hoạch tháng làm thủ công trên Excel rời rạc

**Liên quan UC:** UC-05-01 (Xem), UC-05-02 (Sửa + việc phát sinh), UC-05-03 (Xuất Excel)

---

## 2. Open Questions — PO Answers (KH-01..04)

### KH-01: Kế hoạch tháng tạo thủ công hay auto-generate?

**Câu hỏi gốc (từ `OPC_UseCase_Specification.md` §KH-01):**  
> "Kế hoạch tháng tạo thủ công hay auto?"

**Quyết định PO: AUTO-GENERATE từ task_instance**

Lý do:
- Dữ liệu task_instance đã có trong DB từ Sprint 1 (mọi node × hộ đều có task)
- Tạo thủ công = nhân đôi nhập liệu (CBCQ đã nhập vào quy trình rồi lại phải nhập kế hoạch)
- Auto-generate: hệ thống tự pull task_instance có `planned_days` / `due_date` rơi vào tháng đó
- CBCQ có thể **thêm "việc phát sinh"** (ad-hoc task không có trong quy trình) thủ công
- Kế hoạch auto-generate được tạo 1 lần / hồ sơ / tháng, sau đó persist và có thể sửa

**Rule:**
```
ke_hoach_thang = AUTO(task_instance trong tháng T cho hồ_so_id X)
               + MANUAL(viec_phat_sinh do CBCQ thêm)
```

---

### KH-02: Granularity — 1 KH/CBCQ/tháng hay 1 KH/CBCQ/hồ sơ/tháng?

**Câu hỏi gốc (từ `OPC_UseCase_Specification.md` §KH-02):**  
> "Granularity: 1 KH/CBCQ/tháng hay 1 KH/CBCQ/hồ sơ/tháng?"

**Quyết định PO: 1 KH / hồ sơ / tháng (không phụ thuộc CBCQ)**

Lý do:
- OPC quản lý nhiều hồ sơ GPMB song song; mỗi hồ sơ có CBCQ riêng, tiến độ riêng
- Granularity per-CBCQ/tháng: quá thô — CBCQ có thể phụ trách 2+ hồ sơ
- Granularity per-hồ sơ/tháng: đủ để theo dõi và xuất báo cáo độc lập theo dự án
- Viewer (GĐĐH, QLPB) cần nhìn theo hồ sơ, không theo người

**Primary key của kế hoạch tháng:**
```
UNIQUE (ho_so_id, thang, nam)
```

**Đọc kế hoạch:**
- CBCQ xem tất cả kế hoạch của hồ sơ họ phụ trách
- GĐĐH/Admin xem tất cả
- Filter UI: theo hồ sơ GPMB, tháng/năm

---

### KH-03: Sau khi xuất báo cáo, kế hoạch có bị lock không?

**Câu hỏi gốc (ngụ ý từ `UC-05-02` alt-flow):**  
> "Luồng thay thế: Đã xuất báo cáo → cảnh báo trước khi cho sửa"

**Quyết định PO: KHÔNG lock — cho sửa nhưng hiển thị cảnh báo**

Lý do:
- Thực tế nghiệp vụ GPMB: điều kiện thực địa thay đổi liên tục, việc phát sinh không thể lường trước
- Lock cứng = CBCQ bí, phải xin admin unlock → tạo friction không cần thiết
- Cảnh báo "Báo cáo tháng này đã được xuất ngày DD/MM/YYYY" đủ để CBCQ nhận thức

**Behavior:**
```
- da_xuat_bao_cao = True → hiện banner cảnh báo vàng khi mở trang sửa
- Cho phép sửa bình thường sau khi đã cảnh báo
- Không cần tạo versioning/revision history (Sprint 5 scope giữ đơn giản)
```

---

### KH-04: Format xuất báo cáo — Excel hay PDF?

**Câu hỏi gốc (từ `OPC_UseCase_Specification.md` §KH-04, UC-05-03):**  
> "Format xuất là Excel hay PDF hay cả hai?"

**Quyết định PO: Excel only (Sprint 5) — PDF defer Sprint 6**

Lý do:
- Excel đã có precedent trong hệ thống: báo cáo chi trả (UC-07), import hộ — team đã quen openpyxl
- PDF cần thêm library (WeasyPrint/ReportLab) và template HTML → tốn thêm 1-2 ngày
- 80% use case: báo cáo Excel → gửi email lãnh đạo → họ mở Excel được
- PDF: nếu cần trình bày formal → defer Sprint 6 cùng UC-07 export PDF

**Sprint 5 scope:** Excel only, 1 sheet, format tương tự báo cáo chi trả

---

## 3. Phạm vi Feature (Sprint 5)

### Must Have (MVP Sprint 5)

| ID | Tính năng | Mô tả |
|---|---|---|
| UC-05-01 | Danh sách kế hoạch tháng | List per hồ sơ × tháng; filter tháng/năm, hồ sơ; hiển thị tổng task, trạng thái |
| UC-05-01a | Auto-generate kế hoạch | Click "Tạo kế hoạch tháng" → hệ thống pull task_instance vào tháng T |
| UC-05-02 | Xem chi tiết + sửa | Danh sách task trong kế hoạch; sửa `ngay_du_kien`, `ghi_chu` per task |
| UC-05-02a | Thêm việc phát sinh | Form: Tên, Mô tả, Ngày dự kiến, Ghi chú → lưu vào `viec_phat_sinh` |
| UC-05-03 | Xuất Excel | 1 click → download `.xlsx` danh sách kế hoạch tháng cho hồ sơ X |

### Should Have (nếu còn time)
- Cảnh báo "đã xuất báo cáo" khi sửa sau khi xuất (KH-03 behavior)
- Badge trạng thái: Chưa tạo / Đang thực hiện / Đã xuất báo cáo

### Out of Scope (Sprint 5)
- Xuất PDF (→ Sprint 6)
- Auto-reminder / notification khi sắp cuối tháng chưa tạo kế hoạch (→ Sprint 6)
- Phê duyệt kế hoạch tháng bởi GĐĐH (→ Sprint 6, nếu cần)
- History versioning sau khi xuất (→ Sprint 6)

---

## 4. Data Model

### Bảng `ke_hoach_thang`
```sql
CREATE TABLE ke_hoach_thang (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ho_so_id    UUID NOT NULL REFERENCES ho_so_gpmb(id),
    thang       INT NOT NULL,          -- 1-12
    nam         INT NOT NULL,          -- e.g. 2026
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    da_xuat_bao_cao BOOLEAN DEFAULT FALSE,
    ngay_xuat   TIMESTAMPTZ,
    ghi_chu     TEXT,
    UNIQUE (ho_so_id, thang, nam)
);
```

### Bảng `ke_hoach_thang_item`
```sql
CREATE TABLE ke_hoach_thang_item (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ke_hoach_thang_id   UUID NOT NULL REFERENCES ke_hoach_thang(id) ON DELETE CASCADE,
    -- Linked task (nếu auto-gen từ task_instance)
    task_instance_id    UUID REFERENCES task_instance(id),  -- NULL nếu là việc phát sinh
    -- Data (override hoặc stand-alone nếu việc phát sinh)
    ten_cong_viec       TEXT NOT NULL,
    mo_ta               TEXT,
    ngay_du_kien        DATE,
    ghi_chu             TEXT,
    la_viec_phat_sinh   BOOLEAN DEFAULT FALSE,
    thu_tu              INT DEFAULT 0
);
```

**DB migration note:** 2 bảng mới, không ảnh hưởng schema hiện tại. Cần chạy `CREATE TABLE` (không thể dùng `create_all` vì enum rủi ro — dùng Alembic hoặc psql direct như pattern Sprint 3).

---

## 5. API Contract (Đề xuất)

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/api/v1/ho-so/{id}/ke-hoach?thang=4&nam=2026` | Danh sách kế hoạch (list hoặc single nếu UNIQUE) |
| `POST` | `/api/v1/ho-so/{id}/ke-hoach/generate` | Auto-gen từ task_instance; body: `{thang, nam}` |
| `GET` | `/api/v1/ho-so/{id}/ke-hoach/{kh_id}` | Chi tiết kế hoạch + items |
| `PATCH` | `/api/v1/ho-so/{id}/ke-hoach/{kh_id}/items/{item_id}` | Sửa ngay_du_kien, ghi_chu |
| `POST` | `/api/v1/ho-so/{id}/ke-hoach/{kh_id}/items` | Thêm việc phát sinh |
| `DELETE` | `/api/v1/ho-so/{id}/ke-hoach/{kh_id}/items/{item_id}` | Xóa việc phát sinh (chỉ la_viec_phat_sinh=true) |
| `GET` | `/api/v1/ho-so/{id}/ke-hoach/{kh_id}/export` | Xuất Excel; set `da_xuat_bao_cao=true` |

---

## 6. Acceptance Criteria

| AC | Mô tả |
|---|---|
| AC-01 | CBCQ/Admin click "Tạo kế hoạch tháng 5/2026" cho HS-202504-001 → hệ thống tạo ke_hoach_thang + pull tất cả task_instance có `planned_days` hoặc task chưa hoàn thành trong tháng 5 |
| AC-02 | Mỗi hồ sơ × tháng chỉ có 1 kế hoạch (UNIQUE constraint); tạo lại → 409 với message "Kế hoạch tháng 5/2026 đã tồn tại" |
| AC-03 | CBCQ thêm "việc phát sinh": Tên bắt buộc; `la_viec_phat_sinh=true`; hiển thị riêng trong danh sách |
| AC-04 | CBCQ có thể sửa `ngay_du_kien` + `ghi_chu` của bất kỳ item nào (kể cả auto-gen) |
| AC-05 | CBCQ chỉ có thể xóa item `la_viec_phat_sinh=true`; xóa task auto-gen → 400 "Không thể xóa công việc từ quy trình" |
| AC-06 | Click "Xuất Excel" → file `.xlsx`, 1 sheet "Kế hoạch tháng", header: [STT, Tên công việc, Mô tả, Ngày dự kiến, Ghi chú, Loại (Quy trình/Phát sinh)] |
| AC-07 | Sau khi xuất, `da_xuat_bao_cao=true`; lần sau vào trang sửa → banner vàng "Báo cáo tháng X đã xuất ngày DD/MM/YYYY. Bạn vẫn có thể chỉnh sửa." |
| AC-08 | Role guard: Kế toán/GĐĐH xem được nhưng không tạo/sửa/xóa item |

---

## 7. Success Metrics

| Metric | Target |
|---|---|
| Tạo kế hoạch tháng (auto-gen từ task_instance) | < 2s cho hồ sơ có 500 task |
| Xuất Excel | < 3s; file đúng format |
| 0 data corruption | UNIQUE (ho_so_id, thang, nam) enforced |
| Role guard | 403 cho ke_toan/gddh khi POST/PATCH/DELETE |

---

## 8. Handoff Notes cho Tech Lead

- **Dependency:** Không block gì từ Sprint 4 — schema mới hoàn toàn, 2 bảng mới
- **Migration:** `ke_hoach_thang` + `ke_hoach_thang_item` — 2 CREATE TABLE, không ALTER TYPE
- **BE critical path:** generate endpoint (pull task_instance) → export Excel
- **FE:** Tab mới trong hồ sơ GPMB detail page, hoặc route `/ho-so/[id]/ke-hoach`
- **Risk:** Task_instance volume — cần query hiệu quả (filter by date range + ho_so_id + is_completed)
- **UX:** Giữ đơn giản — table + form thêm việc phát sinh + button Export; không cần Gantt chart

---

*Tài liệu này giải quyết KH-01, KH-02, KH-03, KH-04 và sẵn sàng cho Sprint 5 planning.*
