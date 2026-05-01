# OPC GPMB — Triển khai Docker trên On-Premise Server

---

## Yêu cầu server

| Thứ | Tối thiểu |
|-----|-----------|
| OS | Ubuntu 20.04+ |
| CPU | 2 core |
| RAM | 4 GB |
| Disk | 10 GB trống |
| Quyền | SSH + sudo |

---

## Ports đã cài sẵn (không trùng với port thông thường)

| Service | Port bên ngoài | Lý do chọn |
|---------|---------------|------------|
| Frontend (Next.js) | **38080** | 3000 hay bị dùng bởi dev tools |
| Backend (FastAPI) | **38081** | 8000/8080 hay bị dùng bởi web servers |
| Database (PostgreSQL) | **35432** | 5432 hay bị dùng bởi postgres local |

> **Bên trong Docker network**, các container vẫn dùng port nội bộ (3000 / 8000 / 5432). Port 3xxxx chỉ là cổng ra ngoài host.

---

## Triển khai (3 bước)

### Bước 1 — Copy project lên server

```bash
# Từ máy tính của bạn
scp -r . user@SERVER_IP:/opt/opc-gpmb/

# SSH vào server
ssh user@SERVER_IP
cd /opt/opc-gpmb
```

### Bước 2 — Tạo file cấu hình .env

```bash
cp .env.example .env
nano .env
```

**Chỉ cần sửa 3 dòng này:**

```env
POSTGRES_PASSWORD=mat_khau_manh_cua_ban   # đổi thành password thật
API_URL=http://SERVER_IP:38081            # thay SERVER_IP bằng IP thật
NEXT_PUBLIC_API_URL=http://SERVER_IP:38081
```

**Tạo JWT secret ngẫu nhiên:**

```bash
openssl rand -hex 32
# Copy output → dán vào JWT_SECRET_KEY trong .env
```

### Bước 3 — Build và chạy

```bash
# Cài Docker (nếu chưa có)
sudo apt update && sudo apt install -y docker.io docker-compose

# Build và start
sudo docker-compose up -d --build

# Kiểm tra trạng thái
sudo docker-compose ps
```

**Kết quả mong đợi:**
```
NAME           STATUS        PORTS
opc_postgres   Up (healthy)  0.0.0.0:35432->5432/tcp
opc_backend    Up (healthy)  0.0.0.0:38081->8000/tcp
opc_frontend   Up (healthy)  0.0.0.0:38080->3000/tcp
```

**Truy cập ứng dụng:**
```
Frontend:  http://SERVER_IP:38080
Backend:   http://SERVER_IP:38081
```
**Đăng nhập:** `admin / Admin@123`

---

## Đổi port (nếu muốn dùng port khác)

Chỉ sửa trong file `.env`:

```env
FRONTEND_PORT=38080    # ← đổi số này
BACKEND_PORT=38081     # ← đổi số này
POSTGRES_PORT=35432    # ← đổi số này (nếu cần truy cập DB từ ngoài)
```

Sau đó restart:
```bash
sudo docker-compose down && sudo docker-compose up -d
```

---

## Lệnh quản lý hàng ngày

```bash
# Xem logs
sudo docker-compose logs -f

# Xem logs một service
sudo docker-compose logs -f backend

# Restart tất cả
sudo docker-compose restart

# Stop
sudo docker-compose stop

# Cập nhật code mới
git pull && sudo docker-compose up -d --build
```

---

## Backup database

```bash
# Backup thủ công
sudo docker exec opc_postgres pg_dump -U opc -d opc_gpmb -Fc > backup_$(date +%Y%m%d).dump

# Restore
sudo docker exec -i opc_postgres pg_restore -U opc -d opc_gpmb -Fc < backup_YYYYMMDD.dump
```

---

## Xử lý lỗi phổ biến

| Lỗi | Cách xử lý |
|-----|-----------|
| Port đã bị dùng | `sudo lsof -i :38080` → `sudo kill -9 <PID>` |
| Container không start | `sudo docker-compose logs backend` |
| Database không connect | `sudo docker exec opc_postgres pg_isready -U opc` |
| Hết disk | `sudo docker system prune -a` |

---

## Mở firewall (nếu cần)

```bash
# Cho phép truy cập từ mạng nội bộ
sudo ufw allow 38080/tcp
sudo ufw allow 38081/tcp
sudo ufw enable
```

> **Không** mở port 35432 ra ngoài trừ khi cần thiết — để DB chỉ accessible từ nội bộ.
