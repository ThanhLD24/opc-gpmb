# TÀI LIỆU BÀN GIAO HỆ THỐNG
## OPC — Phần mềm Hỗ trợ Điều hành Giải phóng Mặt bằng (GPMB)

---

**Phiên bản tài liệu:** 1.0  
**Ngày bàn giao:** 2026-05-08  
**Bên bàn giao:** Odin Project Clearance (OPC) Development Team  
**Bên nhận:** Khách hàng  
**Trạng thái:** Bàn giao chính thức

---

## MỤC LỤC

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Tính năng đã hoàn thiện](#3-tính-năng-đã-hoàn-thiện)
4. [Phân quyền người dùng](#4-phân-quyền-người-dùng)
5. [Hướng dẫn cài đặt & triển khai](#5-hướng-dẫn-cài-đặt--triển-khai)
6. [Tài khoản hệ thống](#6-tài-khoản-hệ-thống)
7. [Cơ sở dữ liệu](#7-cơ-sở-dữ-liệu)
8. [Cấu trúc mã nguồn](#8-cấu-trúc-mã-nguồn)
9. [API Backend](#9-api-backend)
10. [Hướng dẫn sử dụng theo vai trò](#10-hướng-dẫn-sử-dụng-theo-vai-trò)
11. [Tình trạng hiện tại & lưu ý kỹ thuật](#11-tình-trạng-hiện-tại--lưu-ý-kỹ-thuật)
12. [Hỗ trợ sau bàn giao](#12-hỗ-trợ-sau-bàn-giao)

---

## 1. Tổng quan dự án

### 1.1 Giới thiệu

**OPC (Odin Project Clearance)** là hệ thống phần mềm hỗ trợ điều hành quy trình Giải phóng mặt bằng (GPMB), được xây dựng để số hoá và tập trung hoá toàn bộ vòng đời của một hồ sơ GPMB — từ khởi tạo, theo dõi tiến độ từng hộ dân, lập hồ sơ chi trả bồi thường đến bàn giao mặt bằng.

### 1.2 Vấn đề được giải quyết

| Vấn đề cũ | Giải pháp OPC |
|---|---|
| Quản lý phân tán qua Excel, email, sổ sách | Tập trung hoá toàn bộ trên một hệ thống web |
| Không có cái nhìn tổng thể về tiến độ hàng trăm hộ | Ma trận pivot tiến độ hộ × bước quy trình cập nhật real-time |
| Luồng phê duyệt chi trả không minh bạch | Luồng phê duyệt có kiểm soát: Kế toán → GĐHH, có dấu thời gian |
| Mất thời gian lập báo cáo thủ công | Export Excel/PDF tức thì với 1 click |
| Không có audit trail | Lịch sử thao tác được ghi nhận đầy đủ |

### 1.3 Mục tiêu kinh doanh đã đạt

| Mục tiêu | Kết quả |
|---|---|
| BG-01: Số hoá toàn bộ vòng đời hồ sơ GPMB | ✅ 100% hồ sơ GPMB được tạo và theo dõi trong hệ thống |
| BG-02: Theo dõi tiến độ từng hộ theo cây quy trình | ✅ Ma trận pivot hộ × node cập nhật real-time |
| BG-03: Luồng phê duyệt chi trả minh bạch, có timestamp | ✅ 100% hồ sơ chi trả đi qua luồng Kế toán → GĐHH |
| BG-04: Giảm thời gian báo cáo tiến độ | ✅ Export Excel ma trận trong < 30 giây |
| BG-05: Demo thuyết phục khách hàng | ✅ Demo 40 phút end-to-end thành công (2026-05-02) |

---

## 2. Kiến trúc hệ thống

### 2.1 Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────┐
│                     NGƯỜI DÙNG                          │
│          (Admin / CBCQ / Kế toán / GĐHH)               │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│              FRONTEND — Next.js 14                       │
│         App Router + TypeScript + Ant Design 5          │
│                   Port: 3000                            │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API (JSON)
┌─────────────────────▼───────────────────────────────────┐
│              BACKEND — FastAPI (Python 3.11)             │
│         SQLAlchemy 2.0 (async) + asyncpg               │
│                   Port: 8000                            │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              DATABASE — PostgreSQL 15                    │
│                  Docker Container                       │
│              Database: opc_gpmb                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Công nghệ sử dụng

| Lớp | Công nghệ | Phiên bản |
|---|---|---|
| **Frontend** | Next.js (App Router) | 14.x |
| **UI Library** | Ant Design | 5.x |
| **Language (FE)** | TypeScript | 5.x |
| **State / Data Fetching** | TanStack React Query | 5.x |
| **Backend** | FastAPI | 0.11x |
| **Language (BE)** | Python | 3.11 |
| **ORM** | SQLAlchemy (async) | 2.0 |
| **DB Driver** | asyncpg | latest |
| **Database** | PostgreSQL | 15 |
| **Container** | Docker + Docker Compose | latest |
| **Authentication** | JWT (python-jose + passlib bcrypt) | — |
| **Excel** | openpyxl | — |
| **PDF** | reportlab | 4.2.5 |
| **Charts** | Recharts | — |

### 2.3 Cổng dịch vụ (Production Docker)

| Dịch vụ | Cổng nội bộ | Cổng ngoài (host) |
|---|---|---|
| Frontend (Next.js) | 3000 | **38080** |
| Backend (FastAPI) | 8000 | **38081** |
| PostgreSQL | 5432 | **35432** |

---

## 3. Tính năng đã hoàn thiện

### 3.1 Module Xác thực & Phân quyền

| Tính năng | Trạng thái |
|---|---|
| Đăng nhập bằng username/password, cấp JWT | ✅ |
| Đăng xuất, làm mới token | ✅ |
| Đổi mật khẩu (bcrypt, validate password cũ) | ✅ |
| Phân quyền 4 vai trò: Admin / CBCQ / Kế toán / GĐHH | ✅ |
| Route guard FE (ẩn menu/nút theo role) | ✅ |
| API authorization (kiểm tra role trên mọi endpoint) | ✅ |
| Thông báo trong ứng dụng (bell icon, polling 60 giây, đánh dấu đã đọc) | ✅ |

### 3.2 Module Quản lý Quy trình GPMB

| Tính năng | Trạng thái |
|---|---|
| Xem danh sách quy trình template | ✅ |
| Tạo / sửa / xoá node trong cây quy trình (đệ quy N cấp) | ✅ |
| Sắp xếp thứ tự node (drag-reorder) | ✅ |
| Cấu hình `per_household`: node áp dụng riêng từng hộ | ✅ |
| Cấu hình `is_parallel`: node chạy song song với sibling | ✅ |
| Cấu hình custom field per node (số VB, ngày VB, loại VB, giá trị, ghi chú, scan) | ✅ |
| Cấu hình số ngày thực hiện (dùng tính ngày dự kiến) | ✅ |
| Upload tài liệu hướng dẫn đính kèm node | ✅ |

### 3.3 Module Hồ sơ GPMB

| Tính năng | Trạng thái |
|---|---|
| Danh sách hồ sơ, tìm kiếm & lọc | ✅ |
| Tạo hồ sơ GPMB mới (snapshot quy trình template tại thời điểm tạo) | ✅ |
| Sửa thông tin hồ sơ | ✅ |
| Chuyển trạng thái hồ sơ: Chuẩn bị → Thực hiện → Hoàn thành | ✅ |
| Tự động tính lại ngày dự kiến khi sửa ngày bắt đầu | ✅ |
| **6 tab chi tiết hồ sơ:** Thông tin / Hộ / Quy trình & Tiến độ / Tiến độ theo hộ / Chi trả / Kế hoạch tháng | ✅ |

### 3.4 Module Hộ dân / Tổ chức

| Tính năng | Trạng thái |
|---|---|
| Danh sách hộ trong hồ sơ, lọc theo trạng thái | ✅ |
| Thêm hộ thủ công (form đầy đủ) | ✅ |
| Sửa thông tin hộ (bao gồm thông tin thửa đất) | ✅ |
| Xoá hộ (chỉ khi chưa vào quy trình) | ✅ |
| **Import hộ từ Excel** (preview + validate trước khi import) | ✅ |
| Thông tin hộ: tên, loại đối tượng (cá nhân/tổ chức), địa chỉ, SĐT, CCCD/ĐKKD | ✅ |
| Thông tin thửa đất: nhiều thửa / hộ (loại đất, số thửa, tờ bản đồ, diện tích, tỷ lệ thu hồi, số tiền bồi thường) | ✅ |
| Xem chi tiết hộ (drawer read-only) | ✅ |
| Danh sách hộ toàn hệ thống (`/ho-dan`): lọc theo hồ sơ, CBCQ, trạng thái, tìm kiếm | ✅ |
| **Vòng đời trạng thái hộ** (5 bước): Mới → Đang xử lý → Đã thống nhất → Đã chi trả → Đã bàn giao | ✅ |

**State machine trạng thái hộ:**

```
Mới ──(auto: task đầu tiên hoàn thành)──► Đang xử lý
         ──(CBCQ click)──► Đã thống nhất phương án
                  ──(auto: hồ sơ chi trả được phê duyệt)──► Đã chi trả
                                  ──(CBCQ cập nhật ngày bàn giao)──► Đã bàn giao mặt bằng
```

### 3.5 Module Công việc / Task (Quy trình & Tiến độ)

| Tính năng | Trạng thái |
|---|---|
| Danh sách công việc toàn hệ thống (`/cong-viec`), lọc đa chiều | ✅ |
| Cây quy trình & tiến độ (tree view collapsible) theo hồ sơ | ✅ |
| Xem / cập nhật chi tiết task (custom field, upload scan PDF) | ✅ |
| Cập nhật trạng thái task lá: Đang thực hiện ⇄ Hoàn thành | ✅ |
| **Auto rollup trạng thái**: task con xong → task cha tự động Hoàn thành | ✅ |
| **Gán / gỡ hộ vào nhánh quy trình** (`per_household`): tự động sinh/xoá task instance đệ quy | ✅ |
| **Ma trận pivot tiến độ**: hàng = hộ, cột = bước quy trình, màu sắc trực quan | ✅ |
| Export ma trận pivot ra Excel | ✅ |
| Phân quyền xem/sửa theo vai trò (CBCQ vs Kế toán vs GĐHH) | ✅ |

**Logic ngày tháng:**

| Loại ngày | Ý nghĩa |
|---|---|
| Ngày bắt đầu dự kiến | Tính tự động từ ngày bắt đầu hồ sơ + thứ tự quy trình |
| Ngày bắt đầu thực tế | Tự động gán khi task trước hoàn thành |
| Ngày kết thúc dự kiến | Ngày bắt đầu dự kiến + số ngày cấu hình |
| Ngày kết thúc thực tế | Khi người dùng đánh dấu Hoàn thành |

- Hỗ trợ cả quy trình **tuần tự** và **song song** (cùng cấp, cùng cha)
- TC-3b: hộ được gán vào node sau khi predecessor đã hoàn thành → `actual_start_date` được backfill tự động

### 3.6 Module Chi trả BTHTTĐC

| Tính năng | Trạng thái |
|---|---|
| Danh sách hồ sơ chi trả trong hồ sơ GPMB | ✅ |
| Tạo hồ sơ chi trả (số tiền BT/HT/TĐC, tổng tự động) | ✅ |
| Validate: 1 hộ tối đa 1 hồ sơ chi trả active | ✅ |
| Gửi duyệt (Kế toán): Đã tạo → Chờ phê duyệt | ✅ |
| Phê duyệt / Từ chối (GĐHH) + ghi lý do từ chối | ✅ |
| Tái gửi duyệt sau khi bị từ chối (Kế toán sửa → gửi lại) | ✅ |
| Bàn giao mặt bằng (CBCQ nhập ngày bàn giao) | ✅ |
| Lịch sử phê duyệt (audit timeline) | ✅ |
| Màn Phê duyệt inbox cho GĐHH (`/phe-duyet`) | ✅ |

**State machine chi trả:**
```
Đã tạo → Chờ phê duyệt → Đã phê duyệt → Đã bàn giao
                        → Bị từ chối → (Kế toán sửa) → Chờ phê duyệt
```

### 3.7 Module Kế hoạch Tháng

| Tính năng | Trạng thái |
|---|---|
| Tạo / sửa kế hoạch tháng theo hồ sơ | ✅ |
| Xem danh sách kế hoạch theo tháng | ✅ |
| Export kế hoạch tháng ra Excel | ✅ |
| Export kế hoạch tháng ra PDF | ✅ |

### 3.8 Dashboard & Tổng quan

| Tính năng | Trạng thái |
|---|---|
| Dashboard với thống kê tổng quan (số hồ sơ, số hộ, tiến độ) | ✅ |
| Biểu đồ trực quan (Recharts) | ✅ |
| Dashboard clickable — click card để điều hướng đến dữ liệu | ✅ |
| Thông báo in-app (bell icon, polling 60 giây) | ✅ |

---

## 4. Phân quyền người dùng

| Tính năng | Admin | CBCQ | Kế toán | GĐHH |
|---|:---:|:---:|:---:|:---:|
| **Quy trình template**: xem | ✅ | ✅ | — | — |
| **Quy trình template**: tạo/sửa/xoá | ✅ | — | — | — |
| **Hồ sơ GPMB**: xem danh sách | ✅ | ✅ (của mình) | ✅ | ✅ |
| **Hồ sơ GPMB**: tạo/sửa | ✅ | ✅ | — | — |
| **Hộ dân**: xem | ✅ | ✅ | ✅ | ✅ |
| **Hộ dân**: thêm/sửa/xoá/import | ✅ | ✅ | — | — |
| **Hộ dân**: đánh dấu "Đã thống nhất" | ✅ | ✅ | — | — |
| **Task**: xem | ✅ | ✅ | ✅ | ✅ |
| **Task**: cập nhật trạng thái / custom field | ✅ | ✅ | — | — |
| **Task**: nhập giá trị tài chính (gia_tri_trinh/duyet) | ✅ | — | ✅ | — |
| **Task**: gán/gỡ hộ vào nhánh | ✅ | ✅ | — | — |
| **Chi trả**: xem | ✅ | ✅ | ✅ | ✅ |
| **Chi trả**: tạo / gửi duyệt / tái gửi | ✅ | — | ✅ | — |
| **Chi trả**: phê duyệt / từ chối | ✅ | — | — | ✅ |
| **Chi trả**: bàn giao mặt bằng | ✅ | ✅ | — | — |
| **Kế hoạch tháng**: xem | ✅ | ✅ | ✅ | ✅ |
| **Kế hoạch tháng**: tạo/sửa | ✅ | ✅ | — | — |
| **CBCQ filter**: tự động lọc hồ sơ/hộ theo CBCQ | — | ✅ (auto) | — | — |

> **Lưu ý CBCQ:** Vai trò CBCQ chỉ xem và thao tác với hồ sơ được gán cho chính họ (tự động filter theo `cbcq_id`).

---

## 5. Hướng dẫn cài đặt & triển khai

### 5.1 Yêu cầu hệ thống

| Thành phần | Tối thiểu | Khuyến nghị |
|---|---|---|
| CPU | 2 core | 4 core |
| RAM | 4 GB | 8 GB |
| Disk | 20 GB | 50 GB |
| OS | Ubuntu 20.04+ / Debian 11+ | Ubuntu 22.04 LTS |
| Docker | 24.x+ | latest stable |
| Docker Compose | 2.x+ | latest stable |

### 5.2 Triển khai bằng Docker Compose (Production)

**Bước 1: Clone source code**
```bash
git clone <repository-url> odin-gpmb
cd odin-gpmb
```

**Bước 2: Cấu hình biến môi trường**
```bash
cp .env.example .env
# Chỉnh sửa .env với các giá trị production:
nano .env
```

Các biến cần cấu hình trong `.env`:
```env
# Database
POSTGRES_USER=opc
POSTGRES_PASSWORD=<mật-khẩu-mạnh>
POSTGRES_DB=opc_gpmb
POSTGRES_PORT=35432

# Backend
JWT_SECRET_KEY=<chuỗi-bí-mật-ít-nhất-32-ký-tự>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
API_URL=http://<IP-hoặc-domain>:38081

# Ports
FRONTEND_PORT=38080
BACKEND_PORT=38081
```

**Bước 3: Khởi động hệ thống**
```bash
docker compose up -d --build
```

**Bước 4: Khởi tạo cơ sở dữ liệu**
```bash
# Chạy migration
docker exec opc_backend alembic upgrade head

# Seed dữ liệu ban đầu (tạo tài khoản + quy trình mẫu)
docker exec opc_backend python -m app.scripts.seed
```

**Bước 5: Kiểm tra**
```bash
# Kiểm tra các container đang chạy
docker compose ps

# Truy cập hệ thống
# Frontend: http://<server-ip>:38080
# Backend API Docs: http://<server-ip>:38081/docs
```

### 5.3 Restore dữ liệu từ bản dump

Dự án đi kèm bản dump PostgreSQL tại `deploy/opc_gpmb_20260508.dump` (bao gồm schema + dữ liệu demo):

```bash
# Bước 1: Drop và recreate database
docker exec opc_postgres psql -U opc -d postgres \
  -c "DROP DATABASE IF EXISTS opc_gpmb;" \
  -c "CREATE DATABASE opc_gpmb OWNER opc;"

# Bước 2: Restore từ dump
docker exec -i opc_postgres pg_restore \
  -U opc -d opc_gpmb --no-owner --role=opc \
  < deploy/opc_gpmb_20260508.dump

# Bước 3: Kiểm tra
docker exec opc_postgres psql -U opc -d opc_gpmb \
  -c "SELECT COUNT(*) AS ho_count FROM ho;" \
  -c "SELECT COUNT(*) AS dat_count FROM ho_dat_info;"
```

### 5.4 Cập nhật hệ thống

```bash
# Pull code mới
git pull origin main

# Rebuild và restart
docker compose up -d --build

# Chạy migration (nếu có schema mới)
docker exec opc_backend alembic upgrade head
```

### 5.5 Xem log hệ thống

```bash
# Xem log backend
docker compose logs -f opc_backend

# Xem log frontend
docker compose logs -f opc_frontend

# Xem log database
docker compose logs -f opc_postgres
```

---

## 6. Tài khoản hệ thống

### 6.1 Tài khoản mặc định (sau khi seed)

| Tài khoản | Mật khẩu | Vai trò | Mô tả |
|---|---|---|---|
| `admin` | `Admin@123` | Admin | Quản trị viên toàn hệ thống |
| `cbcq` | `Cbcq@123` | CBCQ | Cán bộ chuyên quản |
| `ketoan` | `Ketoan@123` | Kế toán | Kế toán chi trả |
| `gddh` | `Gddh@123` | GĐHH | Giám đốc điều hành |

> ⚠️ **Bắt buộc đổi mật khẩu** tất cả tài khoản trên ngay sau khi triển khai production.

### 6.2 Đổi mật khẩu

Người dùng đổi mật khẩu tại: **Tên tài khoản (góc trên phải) → Đổi mật khẩu**

---

## 7. Cơ sở dữ liệu

### 7.1 Thông tin kết nối

| Thông số | Giá trị (mặc định) |
|---|---|
| Host | `localhost` (hoặc IP server) |
| Port | `35432` |
| Database | `opc_gpmb` |
| Username | `opc` |
| Password | Xem file `.env` |
| Container | `opc_postgres` |

### 7.2 Các bảng chính

| Bảng | Mô tả |
|---|---|
| `users` | Tài khoản người dùng (4 role) |
| `workflow_template` | Quy trình GPMB template |
| `workflow_node` | Node trong cây quy trình template |
| `ho_so_gpmb` | Hồ sơ GPMB (dự án cụ thể) |
| `ho_so_workflow_node` | Snapshot cây quy trình tại thời điểm tạo hồ sơ |
| `ho` | Hộ dân / tổ chức |
| `ho_dat_info` | Thông tin thửa đất (nhiều thửa / hộ) |
| `node_household_scope` | Bảng liên kết: hộ ↔ nhánh quy trình |
| `task_instance` | Task instance (công việc cụ thể cho từng hộ / hồ sơ) |
| `ho_so_chi_tra` | Hồ sơ chi trả BTHTTĐC |
| `chi_tra_audit_log` | Lịch sử phê duyệt chi trả |
| `ke_hoach_thang` | Kế hoạch tháng |
| `notification` | Thông báo in-app |
| `workflow_node_attachment` | Tài liệu hướng dẫn đính kèm node |

### 7.3 Backup dữ liệu

Thực hiện backup định kỳ bằng lệnh:
```bash
# Tạo dump với timestamp
docker exec opc_postgres pg_dump \
  -U opc -d opc_gpmb -Fc \
  -f /tmp/backup_$(date +%Y%m%d_%H%M).dump

# Copy ra ngoài container
docker cp opc_postgres:/tmp/backup_$(date +%Y%m%d_%H%M).dump ./backups/
```

Khuyến nghị: cấu hình cronjob backup hàng ngày.

### 7.4 Bản dump đi kèm

| File | Ngày | Dung lượng | Nội dung |
|---|---|---|---|
| `deploy/opc_gpmb_20260501.dump` | 2026-05-01 | 6.4 MB | Dữ liệu sau demo lần 1 |
| `deploy/opc_gpmb_20260502.dump` | 2026-05-02 | 1.9 MB | Dữ liệu demo chính thức |
| `deploy/opc_gpmb_20260508.dump` | 2026-05-08 | 1.9 MB | **Bản mới nhất** — bàn giao |

---

## 8. Cấu trúc mã nguồn

```
odin-gpmb/
├── backend/                          # FastAPI backend
│   ├── app/
│   │   ├── api/v1/                  # API endpoints
│   │   │   ├── auth.py              # Đăng nhập, đổi mật khẩu
│   │   │   ├── ho_so.py             # Hồ sơ GPMB
│   │   │   ├── ho.py                # Hộ dân (trong hồ sơ)
│   │   │   ├── global_ho.py         # Hộ dân toàn hệ thống
│   │   │   ├── task.py              # Công việc / task instance
│   │   │   ├── global_tasks.py      # Task toàn hệ thống
│   │   │   ├── chi_tra.py           # Chi trả BTHTTĐC
│   │   │   ├── workflow.py          # Quy trình template
│   │   │   ├── ke_hoach.py          # Kế hoạch tháng
│   │   │   └── notifications.py     # Thông báo
│   │   ├── db/
│   │   │   ├── models.py            # SQLAlchemy models
│   │   │   └── session.py           # Database session
│   │   ├── services/
│   │   │   ├── task_service.py      # Logic task instance, rollup, scope
│   │   │   ├── task_date_service.py # Logic ngày tháng dự kiến/thực tế
│   │   │   └── notification_service.py
│   │   ├── scripts/
│   │   │   └── seed.py              # Seed dữ liệu ban đầu
│   │   └── main.py                  # Entry point FastAPI
│   ├── alembic/                     # Database migrations
│   └── requirements.txt
│
├── frontend/                        # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/              # Trang đăng nhập
│   │   │   └── (dashboard)/         # Các trang chính
│   │   │       ├── page.tsx         # Dashboard
│   │   │       ├── ho-so-gpmb/      # Hồ sơ GPMB
│   │   │       ├── ho-dan/          # Quản lý hộ dân
│   │   │       ├── cong-viec/       # Công việc
│   │   │       ├── quy-trinh/       # Quy trình template
│   │   │       └── phe-duyet/       # Phê duyệt (GĐHH)
│   │   ├── components/
│   │   │   ├── ho/                  # Components hộ dân
│   │   │   ├── task/                # Components công việc
│   │   │   ├── chi-tra/             # Components chi trả
│   │   │   ├── ke-hoach/            # Components kế hoạch
│   │   │   └── ho-so/               # Components hồ sơ
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── lib/
│   │   │   └── api.ts               # Axios instance + interceptors
│   │   ├── types/                   # TypeScript type definitions
│   │   └── utils/
│   │       ├── constants.ts         # Labels, colors, enums
│   │       └── format.ts            # Formatters (date, currency)
│   └── package.json
│
├── deploy/                          # Database dumps
├── docs/                            # Tài liệu dự án
│   ├── brd.md                       # Business Requirements
│   ├── prd.md                       # Product Requirements
│   ├── demo-scenario.md             # Kịch bản demo
│   ├── logic_phancap.md             # Logic ngày tháng
│   ├── architecture/                # Kiến trúc & sprint kickoffs
│   ├── testing/                     # Kết quả kiểm thử
│   └── handover/                    # Tài liệu bàn giao (file này)
│
├── docker-compose.yml               # Docker Compose config
├── .env.example                     # Template biến môi trường
└── README.md
```

---

## 9. API Backend

### 9.1 Tài liệu API tự động

Backend FastAPI tự động sinh tài liệu API tương tác tại:
- **Swagger UI:** `http://<server>:38081/docs`
- **ReDoc:** `http://<server>:38081/redoc`

### 9.2 Xác thực API

Tất cả API (trừ `/auth/login`) yêu cầu header:
```
Authorization: Bearer <JWT_TOKEN>
```

Token có thời hạn 24 giờ. Frontend tự động refresh qua React Query.

### 9.3 Nhóm endpoint chính

| Prefix | Module |
|---|---|
| `POST /auth/login` | Đăng nhập |
| `PATCH /auth/change-password` | Đổi mật khẩu |
| `GET/POST /workflow/templates` | Quy trình template |
| `GET/POST/PUT/DELETE /workflow/nodes` | Node quy trình |
| `GET/POST/PATCH /ho-so` | Hồ sơ GPMB |
| `GET/POST/PATCH/DELETE /ho-so/{id}/ho` | Hộ dân |
| `POST /ho-so/{id}/ho/import` | Import Excel hộ |
| `GET /ho-so/{id}/tasks` | Cây task của hồ sơ |
| `PATCH /ho-so/{id}/tasks/{taskId}/status` | Cập nhật trạng thái task |
| `GET/POST /ho-so/{id}/chi-tra` | Hồ sơ chi trả |
| `POST /ho-so/{id}/chi-tra/{id}/gui-duyet` | Gửi duyệt |
| `POST /ho-so/{id}/chi-tra/{id}/duyet` | Phê duyệt |
| `POST /ho-so/{id}/chi-tra/{id}/tu-choi` | Từ chối |
| `GET /ho-so/{id}/pivot` | Ma trận pivot tiến độ |
| `GET /ho-so/{id}/pivot/export` | Export pivot Excel |
| `GET /ho` | Danh sách hộ toàn hệ thống |
| `GET /tasks` | Danh sách task toàn hệ thống |
| `GET /notifications` | Thông báo |

---

## 10. Hướng dẫn sử dụng theo vai trò

### 10.1 Admin — Quản trị viên

**Luồng công việc hàng ngày:**
1. Đăng nhập tại trang chủ
2. **Quản lý quy trình:** Menu "Quy trình GPMB" → xem/sửa cây node template
3. **Quản lý hồ sơ:** Menu "Hồ sơ GPMB" → xem tất cả hồ sơ
4. Có thể thực hiện mọi thao tác của CBCQ, Kế toán, GĐHH

**Tạo hồ sơ GPMB mới:**
1. "Hồ sơ GPMB" → "Tạo hồ sơ"
2. Nhập mã, tên dự án, địa chỉ, CBCQ phụ trách, ngày bắt đầu/kết thúc
3. Chọn quy trình template → Lưu
4. Hệ thống tự động snapshot cây quy trình và sinh task instance

---

### 10.2 CBCQ — Cán bộ chuyên quản

**Luồng công việc hàng ngày:**

1. **Nhập hộ dân:**
   - Vào hồ sơ → Tab "Hộ" → "Import Excel" (dùng file template)
   - Hoặc "Thêm hộ" để nhập thủ công từng hộ

2. **Gán hộ vào quy trình:**
   - Tab "Quy trình & Tiến độ" → chọn node `per_household`
   - Click "Gán hộ" → chọn danh sách hộ → Xác nhận
   - Hệ thống tự sinh task instance cho tất cả hộ được chọn

3. **Cập nhật tiến độ công việc:**
   - Menu "Công việc" (toàn hệ thống) hoặc Tab "Quy trình & Tiến độ" trong hồ sơ
   - Click vào task → Mở drawer → Nhập thông tin → "Đánh dấu hoàn thành"
   - Upload file scan (PDF) nếu node yêu cầu

4. **Xem tiến độ tổng quan:**
   - Tab "Tiến độ theo hộ" → xem ma trận pivot
   - Xanh = hoàn thành, Vàng = chưa hoàn thành

5. **Bàn giao mặt bằng:**
   - Tab "Chi trả" → Expand hồ sơ chi trả đã phê duyệt → "Bàn giao mặt bằng"

**Import Excel hộ dân:**
- Tải file mẫu từ hệ thống
- Điền đúng format (mã hộ, tên chủ hộ, ...)
- Upload → Xem preview → Xác nhận import

---

### 10.3 Kế toán

**Luồng công việc:**

1. Đăng nhập → Menu "Hồ sơ GPMB" → Vào hồ sơ cần xử lý
2. Tab "Chi trả" → "Tạo mới chi trả"
3. Chọn hộ, nhập số tiền (BT / HT / TĐC), tổng tự tính
4. Lưu → "Gửi duyệt" (chuyển sang Chờ phê duyệt)
5. Sau khi bị từ chối: expand hồ sơ → xem lý do → "Sửa" → "Tái gửi duyệt"

---

### 10.4 GĐHH — Giám đốc điều hành

**Luồng phê duyệt:**

**Cách 1 — Qua Inbox phê duyệt (khuyến nghị):**
1. Click icon thông báo (bell) trên header → Xem thông báo chờ duyệt
2. Hoặc vào Menu "Phê duyệt" → xem danh sách hồ sơ chờ duyệt
3. Click vào hồ sơ → Xem chi tiết → "Phê duyệt" hoặc "Từ chối" (nhập lý do)

**Cách 2 — Qua Tab Chi trả trong hồ sơ:**
1. Vào hồ sơ → Tab "Chi trả"
2. Tìm hồ sơ trạng thái "Chờ phê duyệt" → Click biểu tượng Check (✓) hoặc X

---

## 11. Tình trạng hiện tại & lưu ý kỹ thuật

### 11.1 Tình trạng kiểm thử

| Sprint | Test cases | Pass | Fail | Ghi chú |
|---|---|---|---|---|
| Sprint 1–6 | — | ✅ | — | Demo thành công |
| Sprint 7 | 35 | 35 | 0 | 100% PASS |
| Sprint 9 | 38 | 34 | 2 | 2 bug đã fix |

**Các bug Sprint 9 đã fix:**
- `BUG-S9-001`: Vertical propagation `actual_start_date` — **đã fix** (`f8d0206`)
- `BUG-S9-002`: Tree node thiếu `is_parallel`, `planned_*` dates — **đã fix**

### 11.2 Tính năng ngoài phạm vi MVP (có thể phát triển thêm)

| Tính năng | Ưu tiên | Ghi chú |
|---|---|---|
| Import Excel cây quy trình (UI) | Trung bình | Hiện seed bằng script |
| Xuất báo cáo tổng hợp PDF đa hồ sơ | Cao | — |
| Đa tệp đính kèm per task | Thấp | Hiện chỉ hỗ trợ 1 file |
| Quản lý người dùng (thêm/sửa/xoá tài khoản) qua UI | Cao | Hiện seed bằng script |
| Tích hợp ngân hàng / thanh toán | Thấp | Ngoài phạm vi |
| Mobile app | Thấp | — |
| SSO / Active Directory | Trung bình | — |
| Backup tự động theo lịch | Cao | Cần cấu hình thủ công |

### 11.3 Lưu ý bảo mật

1. **Đổi mật khẩu** tất cả tài khoản mặc định ngay sau khi triển khai
2. **Cấu hình `.env`:** sử dụng `JWT_SECRET_KEY` ngẫu nhiên, mạnh (≥ 32 ký tự)
3. **PostgreSQL password:** đổi `POSTGRES_PASSWORD` trong `.env` trước khi khởi động production
4. **Firewall:** chỉ mở cổng `38080` (frontend) ra ngoài internet; cổng `38081` và `35432` nên chỉ accessible nội bộ
5. **HTTPS:** Đặt Nginx/Caddy reverse proxy phía trước để termination SSL

### 11.4 Giới hạn hiệu năng

| Kịch bản | Kết quả đo |
|---|---|
| Gán 354 hộ vào node → sinh ~39k task instance | < 10 giây |
| Load ma trận pivot 354 hộ × N node | < 3 giây |
| Export Excel pivot | < 30 giây |
| Import 354 hộ từ Excel | < 5 giây |

Hệ thống được thiết kế để xử lý ít nhất **500 hộ × 120 bước quy trình = 60.000 task instance** mà không giảm hiệu năng đáng kể.

---

## 12. Hỗ trợ sau bàn giao

### 12.1 Tài liệu đi kèm

| Tài liệu | Đường dẫn |
|---|---|
| Tài liệu bàn giao (file này) | `docs/handover/TAILIEU_BANGIAO.md` |
| Yêu cầu nghiệp vụ (BRD) | `docs/brd.md` |
| Yêu cầu sản phẩm (PRD) | `docs/prd.md` |
| Kịch bản demo | `docs/demo-scenario.md` |
| Logic ngày tháng & tiến độ | `docs/logic_phancap.md` |
| Kết quả kiểm thử | `docs/testing/` |
| Tài liệu API (live) | `http://<server>:38081/docs` |

### 12.2 Quy trình báo lỗi

Khi phát sinh lỗi, cung cấp các thông tin sau:
1. **Tài khoản** đang dùng (role)
2. **Màn hình / tính năng** đang thực hiện
3. **Các bước tái hiện lỗi** (step-by-step)
4. **Thông báo lỗi** (chụp màn hình)
5. **Log backend** (nếu có thể): `docker compose logs opc_backend --tail=50`

### 12.3 Checklist trước khi go-live

- [ ] Đổi tất cả mật khẩu tài khoản mặc định
- [ ] Cấu hình `JWT_SECRET_KEY` mới, ngẫu nhiên
- [ ] Đổi `POSTGRES_PASSWORD` trong `.env`
- [ ] Cấu hình firewall: chỉ mở port 38080 ra ngoài
- [ ] Cấu hình HTTPS (Nginx + SSL certificate)
- [ ] Cấu hình backup DB tự động (cronjob hàng ngày)
- [ ] Kiểm tra kết nối từ mạng nội bộ + internet
- [ ] Test đăng nhập 4 role
- [ ] Test tạo hồ sơ GPMB end-to-end

---

*Tài liệu này được tạo ngày 2026-05-08 và phản ánh trạng thái hệ thống tại commit `9d9b60a`.*

*Mọi thắc mắc, vui lòng liên hệ đội phát triển OPC.*
