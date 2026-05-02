# OPC GPMB — Hướng dẫn triển khai Docker

---

## Yêu cầu server

| Thứ | Tối thiểu |
|-----|-----------|
| OS | Ubuntu 20.04+ |
| CPU | 2 core |
| RAM | 4 GB |
| Disk | 10 GB trống |
| Phần mềm | Docker Engine 24+ · docker compose v2 |

---

## Ports mặc định

| Service | Port ngoài | Port trong container |
|---------|-----------|----------------------|
| Frontend (Next.js) | **38080** | 3000 |
| Backend (FastAPI) | **38081** | 8000 |
| Database (PostgreSQL) | **35432** | 5432 |

---

## A. LẦN ĐẦU TRIỂN KHAI

### Bước 1 — Cài Docker trên server

```bash
sudo apt update && sudo apt install -y docker.io
# Cài docker compose v2 (bắt buộc — v1 không tương thích)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker compose version   # phải hiện v2.x.x
```

### Bước 2 — Copy project lên server

```bash
# Từ máy local
scp -r . user@SERVER_IP:/opt/opc-gpmb/

# SSH vào server
ssh user@SERVER_IP
cd /opt/opc-gpmb
```

### Bước 3 — Tạo file .env

```bash
cp .env.example .env
nano .env
```

Chỉ cần sửa 3 dòng:

```env
POSTGRES_PASSWORD=mat_khau_manh              # đổi thành password thật
API_URL=http://SERVER_IP:38081               # thay SERVER_IP bằng IP thật
DATABASE_URL=postgresql+asyncpg://opc:mat_khau_manh@postgres:5432/opc_gpmb
```

Tạo JWT secret:

```bash
openssl rand -hex 32
# Copy output → dán vào JWT_SECRET_KEY trong .env
```

### Bước 4 — Import data từ máy local (nếu có)

```bash
# Từ máy local: copy file dump lên server
scp deploy/opc_gpmb_*.dump user@SERVER_IP:/tmp/

# Trên server
```

### Bước 5 — Build và chạy

```bash
sudo docker compose up -d --build

# Chờ ~60s rồi kiểm tra
sudo docker compose ps
```

Kết quả mong đợi:

```
NAME           STATUS              PORTS
opc_postgres   Up (healthy)        0.0.0.0:35432->5432/tcp
opc_backend    Up (healthy)        0.0.0.0:38081->8000/tcp
opc_frontend   Up                  0.0.0.0:38080->3000/tcp
```

### Bước 6 — Restore data

```bash
# Restore data vào postgres (chạy SAU khi tất cả services healthy)
sudo docker exec -i opc_postgres pg_restore \
  -U opc -d opc_gpmb \
  --no-owner --no-privileges -Fc \
  < /tmp/opc_gpmb_*.dump

# Kiểm tra
sudo docker exec opc_postgres psql -U opc -d opc_gpmb \
  -c "SELECT COUNT(*) FROM users;"
```

### Bước 7 — Mở firewall

```bash
sudo ufw allow 38080/tcp
sudo ufw allow 38081/tcp
sudo ufw enable
```

**Truy cập:** `http://SERVER_IP:38080` · Đăng nhập: `admin / Admin@123`

---

## B. CẬP NHẬT CODE (lần deploy tiếp theo)

> Dùng khi chỉ thay đổi code backend/frontend, **không thay đổi schema DB**.

### Từ máy local

```bash
# Tạo dump data mới nhất trước khi deploy
pg_dump hoặc xem mục C bên dưới
```

### Trên server

```bash
cd /opt/opc-gpmb

# Pull code mới (hoặc scp lại từ local)
git pull   # nếu dùng git
# hoặc: scp -r . user@SERVER_IP:/opt/opc-gpmb/

# Rebuild và restart (postgres giữ nguyên, không mất data)
sudo docker compose up -d --build backend frontend

# Kiểm tra
sudo docker compose ps
sudo docker compose logs --tail=30 backend
```

> `postgres` không cần restart — data volume giữ nguyên toàn bộ.

---

## C. CẬP NHẬT CÓ THAY ĐỔI SCHEMA DATABASE

> Dùng khi có migration mới (thêm bảng, thêm cột, đổi kiểu dữ liệu...).

### Bước 1 — Backup data server TRƯỚC khi deploy

```bash
# Trên server — backup trước khi làm bất cứ điều gì
sudo docker exec opc_postgres pg_dump \
  -U opc -d opc_gpmb \
  --no-owner --no-privileges -Fc \
  > /opt/opc-gpmb/deploy/backup_before_$(date +%Y%m%d_%H%M).dump

echo "Backup xong: $(ls -lh /opt/opc-gpmb/deploy/backup_before_*.dump | tail -1)"
```

### Bước 2 — Chuẩn bị data mới từ máy local

```bash
# Trên MÁY LOCAL — tạo dump mới nhất
docker exec odin-gpmb-db-1 pg_dump \
  -U opc -d opc_gpmb \
  --no-owner --no-privileges -Fc \
  > deploy/opc_gpmb_$(date +%Y%m%d).dump

# Copy lên server
scp deploy/opc_gpmb_$(date +%Y%m%d).dump user@SERVER_IP:/tmp/
```

### Bước 3 — Deploy code mới (migrations chạy tự động)

```bash
# Trên server
cd /opt/opc-gpmb

# Pull/scp code mới về server

# Rebuild tất cả (backend sẽ chạy alembic migrate khi startup)
sudo docker compose down
sudo docker compose up -d --build
```

> Backend tự chạy migration khi khởi động. Kiểm tra log để xác nhận:
> ```bash
> sudo docker compose logs backend | grep -i "alembic\|migrat"
> ```

### Bước 4 — Xác nhận migration thành công rồi restore data

```bash
# Chờ backend healthy
sudo docker compose ps

# Xóa data cũ và restore data mới từ local
# (dùng --clean để tự xử lý conflict)
sudo docker exec -i opc_postgres pg_restore \
  -U opc -d opc_gpmb \
  --no-owner --no-privileges \
  --clean --if-exists -Fc \
  < /tmp/opc_gpmb_$(date +%Y%m%d).dump

# Verify
sudo docker exec opc_postgres psql -U opc -d opc_gpmb \
  -c "\dt"           # danh sách bảng
sudo docker exec opc_postgres psql -U opc -d opc_gpmb \
  -c "SELECT COUNT(*) FROM users;"
```

### Bước 5 — Rollback nếu có lỗi

```bash
# Nếu có vấn đề, restore từ backup tạo ở Bước 1
sudo docker compose down

# Xóa volume và tạo lại với data cũ
sudo docker volume rm opc-gpmb_postgres_data
sudo docker compose up -d postgres   # chờ postgres healthy

sudo docker exec -i opc_postgres pg_restore \
  -U opc -d opc_gpmb \
  --no-owner --no-privileges -Fc \
  < /opt/opc-gpmb/deploy/backup_before_*.dump

# Restart backend với code cũ (git checkout hoặc scp lại)
sudo docker compose up -d backend frontend
```

---

## D. TẠO DUMP DATA TỪ LOCAL

```bash
# Tạo dump và lưu vào deploy/
docker exec odin-gpmb-db-1 pg_dump \
  -U opc -d opc_gpmb \
  --no-owner --no-privileges -Fc \
  > deploy/opc_gpmb_$(date +%Y%m%d).dump

ls -lh deploy/
```

> File dump được lưu tại `deploy/opc_gpmb_YYYYMMDD.dump`. Thêm file này vào `.gitignore` nếu chứa data nhạy cảm.

---

## E. LỆNH QUẢN LÝ HÀNG NGÀY

```bash
# Xem trạng thái
sudo docker compose ps

# Xem log realtime
sudo docker compose logs -f
sudo docker compose logs -f backend    # chỉ backend

# Restart một service
sudo docker compose restart backend

# Stop toàn bộ
sudo docker compose stop

# Backup nhanh
sudo docker exec opc_postgres pg_dump -U opc -d opc_gpmb -Fc \
  > /opt/opc-gpmb/deploy/backup_$(date +%Y%m%d_%H%M).dump
```

---

## F. ĐỔI PORT

Chỉ sửa trong `.env`:

```env
FRONTEND_PORT=38080
BACKEND_PORT=38081
POSTGRES_PORT=35432
```

Sau đó:

```bash
sudo docker compose down && sudo docker compose up -d
```

---

## G. XỬ LÝ LỖI PHỔ BIẾN

| Lỗi | Nguyên nhân | Cách xử lý |
|-----|-------------|------------|
| `InvalidPasswordError` | Volume postgres cũ có password khác | Xem mục H |
| `socket.gaierror` | Backend start trước postgres ready | Đã fix: `condition: service_healthy` |
| `ContainerConfig` error | docker-compose v1 cũ | Cài lại v2: xem mục A Bước 1 |
| Port đã bị dùng | Port conflict | `sudo lsof -i :38080` → `sudo kill -9 <PID>` |
| Container không start | Lỗi build | `sudo docker compose logs backend` |
| `duplicate key` khi restore | Data cũ còn trong DB | Dùng `--clean --if-exists` trong pg_restore |

---

## H. ĐỔI PASSWORD POSTGRES (giữ data)

```bash
# Đổi password trong postgres mà không mất data
sudo docker exec -it opc_postgres psql -U opc -d opc_gpmb \
  -c "ALTER USER opc WITH PASSWORD 'password_moi';"

# Cập nhật .env
nano .env   # sửa POSTGRES_PASSWORD và DATABASE_URL

# Restart backend để kết nối lại với password mới
sudo docker compose restart backend
```

---

## Tóm tắt quyết định nhanh

```
Deploy lần đầu?                → Mục A
Chỉ sửa code, không sửa DB?   → Mục B
Có thêm/sửa bảng/cột trong DB? → Mục C (backup trước!)
Cần tạo dump từ local?         → Mục D
Lỗi password postgres?         → Mục H
```
