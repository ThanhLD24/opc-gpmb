# 🚀 OPC GPMB Deployment — Complete Guide

This project is fully containerized and ready for on-premise deployment. Everything needed to deploy the complete stack (PostgreSQL + FastAPI Backend + Next.js Frontend) is included.

---

## 📦 What You Have

| File | Purpose |
|------|---------|
| **`deploy.sh`** | **⭐ START HERE** — Automated deployment script (installs Docker, builds images, starts all services) |
| **`DEPLOY_QUICKSTART.md`** | Step-by-step guide for deploying via SSH |
| **`DEPLOYMENT_GUIDE.md`** | Comprehensive reference for production hardening, firewall, backup, monitoring |
| **`docker-compose.yml`** | Orchestrates 3 services: postgres, backend, frontend |
| **`Dockerfile.backend`** | Multi-stage build for FastAPI backend |
| **`Dockerfile.frontend`** | Multi-stage build for Next.js frontend |
| **`.env.example`** | Configuration template (copy to `.env` and customize) |

---

## ⚡ Quick Start (5 Minutes)

### For Developers (Local Testing)

```bash
# 1. Copy .env template
cp .env.example .env

# 2. Start all services
docker-compose up -d

# 3. Verify services running
docker-compose ps

# 4. Access application
# Frontend:  http://localhost:3000
# Backend:   http://localhost:8000
# Credentials: admin / Admin@123
```

### For On-Premise Deployment via SSH

```bash
# 1. From your computer, copy everything to server
scp -r . ubuntu@your-server-ip:/tmp/opc-gpmb/

# 2. SSH into server
ssh ubuntu@your-server-ip

# 3. Run deployment script
cd /tmp/opc-gpmb
sudo bash deploy.sh

# 4. Follow the prompts (script does everything automatically)
# - Installs Docker
# - Builds images
# - Starts services
# - Shows you the access URLs and credentials
```

**That's it! Your app is now running on your on-premise server.**

---

## 📋 Step-by-Step Deployment (First Time)

### Step 1: Prepare Your On-Premise Server

**Requirements:**
- Ubuntu 20.04+ (or CentOS 7+)
- 4+ CPU cores, 8GB+ RAM, 20GB+ free disk
- SSH access with sudo privileges
- Internet connectivity (to download Docker)

### Step 2: Transfer Project to Server

Choose one method:

**Method A: Git Clone (if you have a git repo)**
```bash
ssh ubuntu@192.168.1.100
git clone https://github.com/your-repo/opc-gpmb.git /tmp/opc-gpmb
cd /tmp/opc-gpmb
```

**Method B: SCP Copy (from your computer)**
```bash
# From your computer
scp -r . ubuntu@192.168.1.100:/tmp/opc-gpmb/

# Then SSH in
ssh ubuntu@192.168.1.100
cd /tmp/opc-gpmb
```

### Step 3: Run Automated Deployment

```bash
# On the server
sudo bash deploy.sh
```

**What the script does (all automated):**
- ✅ Checks system requirements
- ✅ Installs Docker & Docker Compose
- ✅ Configures `.env` (generates random secrets)
- ✅ Builds Docker images (backend + frontend)
- ✅ Starts 3 containers (postgres + backend + frontend)
- ✅ Waits for services to be healthy
- ✅ Creates backup script + cron job
- ✅ Shows you the access URLs

**Typical timeline:**
- Docker install: 2-3 minutes
- Image build: 10-15 minutes
- Startup + health checks: 1-2 minutes
- **Total: ~15-20 minutes**

### Step 4: Access Your Application

After script completes, you'll see:
```
Frontend:  http://192.168.1.100:3000
Backend:   http://192.168.1.100:8000
Database:  postgres://opc:***@192.168.1.100:5432/opc_gpmb

Default credentials:
  Username: admin
  Password: Admin@123
```

---

## 🔧 Common Operations

### View Logs (Troubleshooting)

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Restart Services

```bash
# Restart one
docker-compose restart backend

# Restart all
docker-compose restart

# Full cycle (stop → start)
docker-compose down && docker-compose up -d
```

### Update Code

```bash
cd /opt/opc-gpmb
git pull origin main
docker-compose build --no-cache backend frontend
docker-compose up -d
```

### Backup Database

```bash
# Run backup script
/opt/opc-gpmb/backup-db.sh

# Check backups
ls -lh /backups/opc-gpmb/
```

### Restore Database

```bash
docker exec -i opc_postgres pg_restore \
  -U opc -d opc_gpmb -Fc \
  < /backups/opc-gpmb/opc_gpmb_20260501_020000.dump
```

---

## 🔐 Production Hardening (Recommended)

After initial deployment, follow these for security:

### 1. Configure Firewall

```bash
# Allow only internal network
sudo ufw allow 3000/tcp from 192.168.1.0/24
sudo ufw allow 8000/tcp from 192.168.1.0/24
sudo ufw enable
```

### 2. Set Up Nginx Reverse Proxy

See **DEPLOYMENT_GUIDE.md** → Bước 7 for:
- Nginx configuration
- SSL/TLS termination
- Rate limiting
- Performance optimization

### 3. Configure SSL/TLS

```bash
# Option A: Self-signed certificate (testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem -out /etc/nginx/ssl/cert.pem

# Option B: Let's Encrypt (production)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --standalone -d your-domain.com
```

### 4. Enable HTTPS in Nginx Config

See **DEPLOYMENT_GUIDE.md** for Nginx SSL setup

### 5. Verify Security

```bash
# Check firewall rules
sudo ufw status

# Check ports listening
sudo ss -tlnp | grep docker

# Check service health
curl https://your-domain.com/health
```

---

## 📊 Monitoring & Maintenance

### View Resource Usage

```bash
docker stats --no-stream

# Output shows CPU, memory, network I/O per container
```

### Cleanup Old Images

```bash
# Safely remove unused images/volumes
docker system prune -a --volumes

# Show disk usage
du -sh /var/lib/docker
```

### Check Automated Backups

```bash
# Backups run daily at 2:00 AM
tail -f /var/log/opc-backup.log

# Verify backup files exist
ls -lh /backups/opc-gpmb/

# Keep only last 7 days (automatic)
find /backups/opc-gpmb -name "opc_gpmb_*.dump" -mtime +7
```

---

## 🆘 Troubleshooting

### Issue: "Permission denied" when running deploy.sh

```bash
# Solution: Use sudo
sudo bash deploy.sh
```

### Issue: "Port already in use"

```bash
# Find what's using the port
sudo lsof -i :3000
sudo lsof -i :8000

# Kill the process if needed
sudo kill -9 <PID>

# Or change port in .env and restart
nano .env  # Change FRONTEND_PORT, BACKEND_PORT
docker-compose restart
```

### Issue: "Docker daemon not running"

```bash
sudo systemctl start docker
sudo systemctl status docker
```

### Issue: "Container exits immediately"

```bash
# Check logs
docker-compose logs backend

# Verify .env is correct
cat .env

# Rebuild with verbose output
docker-compose build --no-cache
```

### Issue: "Database connection error"

```bash
# Check Postgres is healthy
docker exec opc_postgres pg_isready -U opc -d opc_gpmb

# Check logs
docker-compose logs postgres

# Verify DATABASE_URL in .env is correct
grep DATABASE_URL .env
```

### Issue: "Frontend can't reach Backend"

```bash
# Check API URL is correct
grep -E "API_URL|NEXT_PUBLIC_API_URL" .env

# Test from frontend container
docker exec opc_frontend curl http://backend:8000/health

# Test from host
curl http://localhost:8000/health
```

---

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| **DEPLOY_QUICKSTART.md** | Step-by-step SSH deployment guide |
| **DEPLOYMENT_GUIDE.md** | Comprehensive production reference |
| This file | Quick reference and overview |

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│         On-Premise Server (Ubuntu 20.04+)           │
├─────────────────────────────────────────────────────┤
│  Docker Engine 20.10+                               │
│  ├─ Container: postgres:15-alpine                   │
│  │  ├─ Port: 5432 (internal)                        │
│  │  └─ Volume: postgres_data:/var/lib/postgresql   │
│  │                                                   │
│  ├─ Container: opc_backend (FastAPI)                │
│  │  ├─ Port: 8000                                   │
│  │  ├─ Database: postgres (async connection)        │
│  │  └─ Volume: backend_uploads:/app/uploads        │
│  │                                                   │
│  └─ Container: opc_frontend (Next.js)               │
│     ├─ Port: 3000                                   │
│     └─ API: http://backend:8000 (internal)          │
│                                                      │
│  Network: opc_network (bridge, internal)            │
│  Volumes: postgres_data, backend_uploads            │
│                                                      │
│  Backup Strategy:                                   │
│  ├─ Daily pg_dump to /backups/opc-gpmb/            │
│  ├─ Cron job: 2:00 AM daily                         │
│  └─ Retention: 7 days                               │
│                                                      │
│  [Optional] Nginx Reverse Proxy (port 80/443)       │
│  ├─ SSL/TLS termination                             │
│  ├─ Reverse proxy to :3000 and :8000                │
│  └─ Rate limiting + security headers                │
└─────────────────────────────────────────────────────┘
     │
     └─→ External Access
         ├─ Frontend: http://server-ip:3000
         ├─ Backend: http://server-ip:8000
         └─ (or https:// with Nginx + SSL)
```

---

## ✅ Deployment Checklist

- [ ] Server meets requirements (Ubuntu 20.04+, 4GB RAM, 20GB disk)
- [ ] SSH access and sudo privileges verified
- [ ] Project files transferred to server
- [ ] `deploy.sh` executed successfully
- [ ] All 3 containers running (`docker-compose ps`)
- [ ] Frontend accessible at `http://server-ip:3000`
- [ ] Backend API accessible at `http://server-ip:8000`
- [ ] Can login with admin/Admin@123
- [ ] `.env` file reviewed and updated with production values
- [ ] Firewall configured (UFW rules)
- [ ] Backup script created and cron job active
- [ ] Database backup test completed
- [ ] Monitoring set up (docker stats)
- [ ] [OPTIONAL] Nginx reverse proxy configured
- [ ] [OPTIONAL] SSL/TLS certificates installed

---

## 💡 Tips & Best Practices

1. **Never store .env in git** — Use `.env.example` as template, each server has its own `.env`
2. **Automate backups** — Verify cron job runs daily: `sudo tail -f /var/log/opc-backup.log`
3. **Monitor disk space** — Database grows over time, monitor `/var/lib/postgresql` and `/backups`
4. **Update regularly** — `git pull && docker-compose build && docker-compose up -d`
5. **Test restore procedure** — Practice restoring from backup before you need it
6. **Use strong passwords** — Generated automatically by deploy.sh, but verify in `.env`
7. **Enable HTTPS** — Use Nginx + Let's Encrypt for production
8. **Track containers** — Tag images with version numbers for easier rollback
9. **Log aggregation** — Forward docker logs to centralized logging if available
10. **Capacity planning** — Monitor growth and plan disk expansion

---

## 🚀 Next Steps

### Immediately After Deployment
1. Test login with default credentials
2. Verify all data is accessible
3. Check logs for any warnings: `docker-compose logs`

### Within 24 Hours
1. Update `.env` with actual domain/IP
2. Configure firewall rules
3. Test backup and restore procedure
4. Verify cron job ran: `ls -lh /backups/opc-gpmb/`

### Within 1 Week
1. Set up Nginx reverse proxy
2. Configure SSL/TLS certificates
3. Enable HTTPS
4. Set up monitoring/alerting

### Ongoing
1. Monitor disk space and resource usage
2. Review logs regularly
3. Keep Docker and OS packages updated
4. Test backups monthly

---

## 📞 Support & Debugging

**If deployment fails:**
1. Check logs: `docker-compose logs`
2. Verify `.env` configuration
3. Ensure internet connectivity: `ping 8.8.8.8`
4. Check system resources: `free -h && df -h`
5. Verify Docker running: `sudo systemctl status docker`

**For detailed troubleshooting:**
- See **DEPLOYMENT_GUIDE.md** → "Troubleshooting" section
- Check deployment log: `/var/log/opc-gpmb-deploy.log`
- Check container logs: `docker-compose logs <service>`

---

## 📄 License & Support

This deployment infrastructure is production-ready but requires:
- Regular backups (automated)
- Security hardening (firewall + HTTPS)
- Resource monitoring (disk, CPU, memory)
- Periodic updates

For issues or questions, refer to the detailed guides above.

---

**Ready to deploy? Start with: `sudo bash deploy.sh`** 🎉
