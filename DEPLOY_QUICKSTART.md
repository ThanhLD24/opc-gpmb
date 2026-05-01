# OPC GPMB Quick-Start Deployment Guide

**Thời gian triển khai:** ~20-30 phút (tính thời gian build Docker image)  
**Yêu cầu:** Ubuntu 20.04+, SSH access, quyền sudo

---

## 🚀 Bước 1: Chuẩn bị trên máy tính cá nhân

### 1.1 Tải project từ Git

```bash
# Clone repository
git clone https://github.com/your-repo/opc-gpmb.git
cd opc-gpmb

# Hoặc: tải ZIP và extract
unzip opc-gpmb.zip
cd opc-gpmb
```

### 1.2 Chuẩn bị deploy.sh

Script deployment đã được tạo sẵn trong project. Chúng ta sẽ sử dụng nó để triển khai trên server.

```bash
# Kiểm tra file tồn tại
ls -la deploy.sh

# Cấp quyền thực thi (nếu cần)
chmod +x deploy.sh
```

---

## 🌐 Bước 2: Kết nối SSH tới On-Premise Server

### 2.1 SSH vào server

```bash
# Format: ssh [user]@[server_ip]
ssh ubuntu@192.168.1.100
# hoặc
ssh root@your-domain.com
```

### 2.2 Kiểm tra quyền sudo

```bash
# Verify you have sudo access
sudo whoami
# Output: root (nếu có quyền)
```

---

## ⚙️ Bước 3: Tải Project lên Server

### 3.1 Sao chép toàn bộ project tới server

**Option A — Dùng Git trực tiếp trên server (khuyến khích)**

```bash
# SSH vào server
ssh ubuntu@192.168.1.100

# Clone project
cd /tmp
git clone https://github.com/your-repo/opc-gpmb.git
cd opc-gpmb

# Hoặc nếu chưa cài Git:
sudo apt-get update
sudo apt-get install -y git
```

**Option B — Dùng SCP từ máy tính**

```bash
# Từ máy tính cá nhân (trong thư mục opc-gpmb)
scp -r . ubuntu@192.168.1.100:/tmp/opc-gpmb/
```

---

## 🐳 Bước 4: Chạy Deployment Script

### 4.1 Chạy script (tự động cài Docker, build images, start containers)

```bash
# SSH vào server
ssh ubuntu@192.168.1.100

# Vào project directory
cd /tmp/opc-gpmb

# Chạy deployment script (cần sudo)
sudo bash deploy.sh
```

**Script sẽ:**
- ✅ Kiểm tra pre-flight (OS, internet, quyền)
- ✅ Cài đặt Docker & Docker Compose
- ✅ Clone/update Git repository
- ✅ Tạo thư mục backup
- ✅ Cấu hình .env (random JWT secret + database password)
- ✅ Build Docker images (10-15 phút)
- ✅ Khởi động 3 containers (postgres, backend, frontend)
- ✅ Chờ services healthy
- ✅ Tạo backup script + cron job (tự động backup 2:00 AM)

---

## 📋 Bước 5: Xác Minh Deployment

### 5.1 Kiểm tra trạng thái containers

```bash
# Từ server
docker-compose ps

# Output mong đợi:
# NAME              STATUS             PORTS
# opc_postgres      Up (healthy)       0.0.0.0:5432->5432/tcp
# opc_backend       Up (healthy)       0.0.0.0:8000->8000/tcp
# opc_frontend      Up (healthy)       0.0.0.0:3000->3000/tcp
```

### 5.2 Kiểm tra API

```bash
# Từ server
curl http://localhost:8000/health

# Output mong đợi:
# {"status": "ok"}
```

### 5.3 Truy cập ứng dụng từ browser

```
Frontend:  http://192.168.1.100:3000
Backend:   http://192.168.1.100:8000
```

**Đăng nhập với:**
- Username: `admin`
- Password: `Admin@123`

---

## 🔐 Bước 6: Cấu Hình Bảo Mật (Production)

### 6.1 Cập nhật .env file

```bash
# Trên server
nano /opt/opc-gpmb/.env
```

**Cần thay đổi:**
```env
# Thay localhost thành IP/domain của server
API_URL=http://192.168.1.100:8000
NEXT_PUBLIC_API_URL=http://192.168.1.100:8000

# Hoặc nếu có domain:
API_URL=https://opc-gpmb.your-domain.com
NEXT_PUBLIC_API_URL=https://opc-gpmb.your-domain.com
```

**Lưu lại (Ctrl+O → Enter → Ctrl+X)**

### 6.2 Restart containers với .env mới

```bash
cd /opt/opc-gpmb
docker-compose restart
```

### 6.3 Cấu hình Firewall (UFW)

```bash
# Chỉ cho phép truy cập từ mạng nội bộ
sudo ufw allow 3000/tcp from 192.168.1.0/24
sudo ufw allow 8000/tcp from 192.168.1.0/24
sudo ufw allow 5432/tcp from 192.168.1.0/24  # Database (nếu cần)
sudo ufw enable
```

### 6.4 Cấu hình Nginx Reverse Proxy (Optional, nhưng khuyến khích)

Xem phần **"Bước 7: Production Hardening"** trong `DEPLOYMENT_GUIDE.md`

---

## 🛠️ Bước 7: Quản Lý Hàng Ngày

### 7.1 Xem logs

```bash
# Tất cả services
docker-compose logs -f

# Một service cụ thể
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 7.2 Restart services

```bash
# Restart một service
docker-compose restart backend

# Restart tất cả
docker-compose restart
```

### 7.3 Backup database

```bash
# Chạy backup ngay (không cần chờ cron)
/opt/opc-gpmb/backup-db.sh

# Kiểm tra backup
ls -lh /backups/opc-gpmb/
```

### 7.4 Restore từ backup

```bash
# Nếu cần restore
docker exec -i opc_postgres pg_restore \
  -U opc \
  -d opc_gpmb \
  -Fc < /backups/opc-gpmb/opc_gpmb_20260501_020000.dump
```

### 7.5 Update code

```bash
cd /opt/opc-gpmb
git pull origin main
docker-compose build --no-cache backend frontend
docker-compose up -d
```

---

## ⚠️ Troubleshooting

### Lỗi: "Permission denied" khi chạy deploy.sh

```bash
# Đảm bảo bạn chạy với sudo
sudo bash deploy.sh

# Hoặc cấp quyền execute
chmod +x deploy.sh
sudo bash deploy.sh
```

### Lỗi: "Docker daemon not running"

```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### Lỗi: "Port already in use"

```bash
# Kiểm tra port nào đang sử dụng
sudo lsof -i :3000
sudo lsof -i :8000
sudo lsof -i :5432

# Kill process (nếu cần)
sudo kill -9 <PID>

# Hoặc thay đổi port trong .env và restart
```

### Lỗi: "Database connection refused"

```bash
# Kiểm tra Postgres container
docker exec opc_postgres pg_isready -U opc -d opc_gpmb

# Kiểm tra logs
docker-compose logs postgres
```

### Lỗi: "Backend API not responding"

```bash
# Kiểm tra backend container
docker exec opc_backend curl http://localhost:8000/health

# Kiểm tra logs
docker-compose logs backend
```

---

## 📊 Monitoring & Maintenance

### Kiểm tra tài nguyên

```bash
docker stats --no-stream
```

### Dọn dẹp không gian disk

```bash
# Xóa unused images/volumes (cẩn thận!)
docker system prune -a

# Kiểm tra disk usage
df -h
du -sh /var/lib/docker
```

### Cron job backup status

```bash
# Kiểm tra cron logs
sudo tail -f /var/log/opc-backup.log

# Kiểm tra danh sách cron
crontab -l
```

---

## 📝 Các File Quan Trọng

| File | Mục đích |
|------|---------|
| `/opt/opc-gpmb/.env` | Configuration (passwords, URLs) |
| `/opt/opc-gpmb/docker-compose.yml` | Docker Compose config |
| `/opt/opc-gpmb/Dockerfile.backend` | Backend image definition |
| `/opt/opc-gpmb/Dockerfile.frontend` | Frontend image definition |
| `/opt/opc-gpmb/backup-db.sh` | Database backup script |
| `/var/log/opc-gpmb-deploy.log` | Deployment logs |
| `/backups/opc-gpmb/` | Database backups |

---

## 🎯 Tiếp Theo

Sau khi deployment thành công:

1. **Test ứng dụng** - Đăng nhập, kiểm tra các tính năng chính
2. **Cấu hình Nginx** - Đọc `DEPLOYMENT_GUIDE.md` Bước 7 (reverse proxy, SSL)
3. **Cấu hình Firewall** - Hạn chế truy cập từ các IP cụ thể
4. **Monitoring** - Thiết lập giám sát tài nguyên (CPU, RAM, disk)
5. **Backup Testing** - Kiểm tra backup và restore hoạt động

---

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra logs: `docker-compose logs -f`
2. Xem `DEPLOYMENT_GUIDE.md` phần Troubleshooting
3. Kiểm tra `.env` configuration
4. Confirm network connectivity: `ping 8.8.8.8`
5. Check Docker/Compose version: `docker --version && docker-compose --version`

---

**Chúc mừng! Ứng dụng OPC GPMB đã được triển khai thành công trên on-premise server.** 🎉
