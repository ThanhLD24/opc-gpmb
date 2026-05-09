# OPC GPMB Docker Deployment Guide — On-Premise Server

Complete guide để deploy OPC GPMB trên on-premise server qua SSH.

---

## Yêu cầu tối thiểu

- **OS:** Ubuntu 20.04+ hoặc CentOS 7+ (test trên Ubuntu 22.04)
- **Docker:** 20.10+  → [Cài đặt Docker](https://docs.docker.com/engine/install/)
- **Docker Compose:** 1.29+  → Thường đi kèm Docker Desktop hoặc install từ APT
- **CPU:** 4 cores (tối thiểu 2)
- **RAM:** 8GB (tối thiểu 4GB)
- **Disk:** 20GB free (tối thiểu 10GB)
- **Ports:** 3000 (FE), 8000 (BE), 5432 (DB) phải available

---

## Bước 1: Chuẩn bị Server

### 1.1 SSH vào server
```bash
ssh user@server_ip
```

### 1.2 Cài đặt Docker & Docker Compose (nếu chưa có)

**Ubuntu/Debian:**
```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Cài Docker
sudo apt install -y docker.io docker-compose

# Thêm user vào docker group (optional, để không cần sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

**CentOS/RHEL:**
```bash
sudo yum install -y docker docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 1.3 Clone/Tải project
```bash
cd /opt  # hoặc thư mục bạn muốn
git clone <repo_url> opc-gpmb
cd opc-gpmb

# Hoặc: tải zip và extract
unzip opc-gpmb.zip
cd opc-gpmb
```

---

## Bước 2: Cấu hình biến môi trường

### 2.1 Tạo file .env từ template
```bash
cp .env.example .env
```

### 2.2 Chỉnh sửa .env với giá trị production

```bash
nano .env
# Hoặc: vim .env
```

**Cập nhật các biến quan trọng:**
```env
# Database
POSTGRES_USER=opc_admin
POSTGRES_PASSWORD=StrongPassword123!SecurePass  # Tạo mật khẩu mạnh
POSTGRES_DB=opc_gpmb

# JWT Secret (tạo 32+ ký tự ngẫu nhiên)
JWT_SECRET_KEY=your-generated-secret-key-minimum-32-characters-here

# API URLs (thay localhost thành IP/domain của server)
API_URL=http://192.168.1.100:8000
NEXT_PUBLIC_API_URL=http://192.168.1.100:8000

# Ports (nếu khác mặc định)
FRONTEND_PORT=3000
BACKEND_PORT=8000
POSTGRES_PORT=5432
```

**Tạo JWT Secret ngẫu nhiên:**
```bash
openssl rand -hex 32
# Hoặc: python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## Bước 3: Chuẩn bị Dockerfile (nếu cần)

Check xem có file Dockerfile.backend và Dockerfile.frontend chưa:

```bash
ls -la Dockerfile.*
```

Nếu chưa có, chúng đã được tạo sẵn trong project.

---

## Bước 4: Build và Start Containers

### 4.1 Build images (lần đầu)
```bash
docker-compose build
```

Có thể mất 5-10 phút tùy speed của server.

### 4.2 Start containers (detached mode)
```bash
docker-compose up -d
```

### 4.3 Verify containers chạy
```bash
docker-compose ps
```

**Kết quả mong đợi:**
```
NAME              STATUS             PORTS
opc_postgres      Up (healthy)       0.0.0.0:5432->5432/tcp
opc_backend       Up (healthy)       0.0.0.0:8000->8000/tcp
opc_frontend      Up (healthy)       0.0.0.0:3000->3000/tcp
```

---

## Bước 5: Kiểm tra Containers

### 5.1 Logs (để debug nếu có lỗi)
```bash
# Xem logs tất cả services
docker-compose logs -f

# Xem logs một service cụ thể
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 5.2 Health check
```bash
# Check database
docker exec opc_postgres pg_isready -U opc_admin -d opc_gpmb

# Check backend API
curl http://localhost:8000/health

# Check frontend
curl http://localhost:3000
```

### 5.3 Access ứng dụng
```
Frontend:  http://<server_ip>:3000
Backend:   http://<server_ip>:8000
Database:  postgres://opc_admin:password@<server_ip>:5432/opc_gpmb
```

---

## Bước 6: Database Seeding (Tạo dữ liệu demo)

### 6.1 Vào container backend và chạy seed
```bash
docker exec -it opc_backend python -m app.scripts.seed
```

hoặc chạy SQL trực tiếp:

```bash
docker exec -it opc_postgres psql -U opc_admin -d opc_gpmb -f /docker-entrypoint-initdb.d/init.sql
```

---

## Bước 7: Production Hardening

### 7.1 Firewall (iptables hoặc UFW)

**Chỉ cho phép truy cập từ client trusted:**

```bash
# UFW (Ubuntu)
sudo ufw allow 3000/tcp from 192.168.1.0/24
sudo ufw allow 8000/tcp from 192.168.1.0/24
sudo ufw allow 5432/tcp from 192.168.1.0/24
sudo ufw enable
```

### 7.2 Reverse Proxy (Nginx)

Thêm Nginx phía trước để:
- Terminate SSL/TLS
- Load balancing
- Rate limiting

**Tạo `nginx.conf`:**

```nginx
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name _;

    # Redirect HTTP → HTTPS (nếu có SSL)
    # return 301 https://$host$request_uri;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }
}
```

Thêm vào `docker-compose.yml`:
```yaml
  nginx:
    image: nginx:alpine
    container_name: opc_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    networks:
      - opc_network
```

### 7.3 Backup Database

**Daily backup script (`backup-db.sh`):**

```bash
#!/bin/bash
BACKUP_DIR="/backups/opc-gpmb"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker exec opc_postgres pg_dump \
  -U opc_admin \
  -d opc_gpmb \
  -Fc > "$BACKUP_DIR/opc_gpmb_$DATE.dump"

# Giữ lại 7 ngày backup mới nhất
find $BACKUP_DIR -name "opc_gpmb_*.dump" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/opc_gpmb_$DATE.dump"
```

**Cron job (chạy 2am hàng ngày):**
```bash
crontab -e
# Thêm line:
0 2 * * * /opt/opc-gpmb/backup-db.sh >> /var/log/opc-backup.log 2>&1
```

**Restore từ backup:**
```bash
docker exec -i opc_postgres pg_restore \
  -U opc_admin \
  -d opc_gpmb \
  -Fc < /backups/opc-gpmb/opc_gpmb_20260501_020000.dump
```

---

## Bước 8: Monitoring & Maintenance

### 8.1 Container stats
```bash
docker stats --no-stream
```

### 8.2 Restart containers
```bash
# Restart một container
docker-compose restart backend

# Restart tất cả
docker-compose restart
```

### 8.3 Update source code
```bash
# Pull code mới
git pull

# Rebuild containers
docker-compose build --no-cache backend frontend

# Restart
docker-compose up -d
```

### 8.4 Clean up (xóa unused images/volumes)
```bash
docker system prune -a
docker volume prune
```

---

## Troubleshooting

### Connection refused
```bash
# Check nếu port đang được sử dụng
sudo lsof -i :3000
sudo lsof -i :8000
sudo lsof -i :5432

# Kill process nếu cần
sudo kill -9 <PID>
```

### Database connection error
```bash
# Kiểm tra database logs
docker-compose logs postgres

# Check network connectivity
docker exec opc_backend ping postgres
docker exec opc_backend nc -zv postgres 5432
```

### Out of disk space
```bash
# Check disk usage
df -h
du -sh /var/lib/docker

# Cleanup
docker system prune -a --volumes
```

### Slow performance
```bash
# Check resource usage
docker stats

# Increase Docker memory limit (nếu cần)
# Edit /etc/docker/daemon.json
{
  "memory": "4g",
  "memswap": "8g"
}
```

---

## Tắt ứng dụng

```bash
# Stop containers (dữ liệu vẫn giữ)
docker-compose stop

# Tắt hoàn toàn
docker-compose down

# Tắt và xóa volumes (⚠️ mất dữ liệu!)
docker-compose down -v
```

---

## Cheat Sheet

```bash
# Start
docker-compose up -d

# Stop
docker-compose stop

# Logs
docker-compose logs -f

# Exec command trong container
docker-compose exec backend bash
docker-compose exec postgres psql -U opc_admin -d opc_gpmb

# Restart một service
docker-compose restart backend

# View processes
docker-compose ps

# Remove everything
docker-compose down -v
```

---

Được tạo: 2026-05-01  
Dành cho: OPC GPMB MVP Demo → Production
