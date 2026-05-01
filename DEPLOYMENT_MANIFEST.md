# 📋 OPC GPMB Deployment Manifest

**Date Created:** 2026-05-01  
**Project:** OPC GPMB — On-Premise Deployment  
**Status:** ✅ Ready for Production Deployment  

---

## 🎯 Quick Links

**For First-Time Users:**
```bash
# 1. Read this first
DEPLOYMENT_README.md          # Overview and quick start

# 2. Then follow this
DEPLOY_QUICKSTART.md          # Step-by-step SSH guide

# 3. If needed
DEPLOYMENT_GUIDE.md           # Comprehensive reference
```

**For Developers:**
```bash
# 1. Local testing
docker-compose up -d
curl http://localhost:3000

# 2. Production
sudo bash deploy.sh
```

---

## 📦 Deployment Files Checklist

### Core Infrastructure Files
- ✅ **`deploy.sh`** (400+ lines)
  - Automated deployment script for on-premise servers
  - Installs Docker, builds images, starts services
  - Creates backup script + cron job
  - Usage: `sudo bash deploy.sh`

- ✅ **`docker-compose.yml`** (100 lines)
  - Orchestrates 3 services: postgres, backend, frontend
  - Defines volumes, networks, health checks
  - References environment variables from `.env`

- ✅ **`Dockerfile.backend`** (50+ lines)
  - Multi-stage build for FastAPI backend
  - Python 3.11-slim base, non-root user
  - Health check for port 8000
  - Runs: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

- ✅ **`Dockerfile.frontend`** (44 lines)
  - Multi-stage build for Next.js frontend
  - Node 18-alpine base, non-root user
  - Health check for port 3000
  - Runs: `npm start`

- ✅ **`.env.example`** (28 lines)
  - Configuration template
  - Contains: DB credentials, JWT secret, API URLs, ports
  - Copy to `.env` and customize before deployment

### Documentation Files
- ✅ **`DEPLOYMENT_README.md`** (400+ lines)
  - **START HERE** — Overview and quick reference
  - Architecture overview, common operations
  - Production hardening checklist
  - Troubleshooting guide

- ✅ **`DEPLOY_QUICKSTART.md`** (300+ lines)
  - Step-by-step guide for SSH deployment
  - Covers: prepare → transfer → run → verify
  - Includes: firewall setup, monitoring, daily operations
  - Vietnamese & English

- ✅ **`DEPLOYMENT_GUIDE.md`** (400+ lines)
  - Comprehensive reference for production setup
  - System requirements
  - Installation procedures for Ubuntu/CentOS
  - Production hardening (Nginx, SSL, firewall)
  - Database backup & restore
  - Monitoring and maintenance
  - Troubleshooting (10+ common issues)

- ✅ **`DEPLOYMENT_MANIFEST.md`** (this file)
  - File inventory and usage guide

---

## 🚀 Deployment Paths

### Path 1: Automated One-Command Deployment (Recommended)

```bash
# Step 1: Transfer to server
scp -r . ubuntu@192.168.1.100:/tmp/opc-gpmb/

# Step 2: SSH in
ssh ubuntu@192.168.1.100

# Step 3: Run script
cd /tmp/opc-gpmb
sudo bash deploy.sh

# Done! Script handles everything:
# - Docker installation
# - Image building
# - Container startup
# - Backup setup
```

**Time:** ~20 minutes  
**User interaction:** Minimal (just run the script)  
**Error handling:** Built-in with detailed logs

---

### Path 2: Step-by-Step Manual Deployment

```bash
# Follow DEPLOY_QUICKSTART.md for detailed steps:
# - Section 1: Prepare on your computer
# - Section 2: SSH to server
# - Section 3: Transfer files
# - Section 4: Install Docker manually
# - Section 5: Build and start containers
# - Section 6: Verify
```

**Time:** ~30 minutes  
**User interaction:** More control, better for learning  
**Error handling:** Manual troubleshooting

---

### Path 3: Local Development Testing

```bash
# On your development machine (no SSH needed)
cp .env.example .env
docker-compose up -d

# Access: http://localhost:3000
# Credentials: admin / Admin@123

# Test, develop, debug locally
# Then transfer to production server when ready
```

**Time:** ~5 minutes  
**Scope:** Local only, testing/development  
**Use case:** Before deploying to production

---

## 📋 File Dependency Graph

```
.env.example
  ↓
.env (copy & customize)
  ↓
docker-compose.yml (references .env)
  ├─→ Dockerfile.backend (for 'docker-compose build')
  ├─→ Dockerfile.frontend (for 'docker-compose build')
  └─→ deploy.sh (orchestrates all of above)

Documentation:
  DEPLOYMENT_README.md (start here)
    ├─→ DEPLOY_QUICKSTART.md (for SSH deployment)
    └─→ DEPLOYMENT_GUIDE.md (detailed reference)
```

---

## ✅ Pre-Deployment Checklist

### On Your Computer
- [ ] Clone or download project
- [ ] Verify all files exist: `ls -la docker* deploy.sh .env.example DEPLOY*`
- [ ] Read `DEPLOYMENT_README.md`

### On Target Server
- [ ] Verify OS: Ubuntu 20.04+ or CentOS 7+
- [ ] Verify resources: `free -h && df -h` (need 8GB RAM, 20GB disk)
- [ ] Verify SSH access and sudo: `sudo whoami`
- [ ] Verify internet: `ping 8.8.8.8`
- [ ] Transfer files: `scp -r . ubuntu@server:/tmp/opc-gpmb/`

### Deployment
- [ ] Run script: `sudo bash deploy.sh`
- [ ] Wait for completion (~20 minutes)
- [ ] Verify all containers running: `docker-compose ps`
- [ ] Test frontend: `curl http://localhost:3000`
- [ ] Test backend: `curl http://localhost:8000/health`
- [ ] Login with admin / Admin@123

### Post-Deployment
- [ ] Update `.env` with actual server IP/domain
- [ ] Restart containers: `docker-compose restart`
- [ ] Configure firewall (see DEPLOYMENT_GUIDE.md)
- [ ] Test backup: `/opt/opc-gpmb/backup-db.sh`
- [ ] Verify cron job: `crontab -l`

---

## 🔧 Common Operations Quick Reference

### View Status
```bash
docker-compose ps                    # Container status
docker stats --no-stream             # CPU/memory usage
tail -f /var/log/opc-gpmb-deploy.log # Deployment logs
```

### View Logs
```bash
docker-compose logs -f               # All services
docker-compose logs -f backend       # Specific service
docker-compose logs -f postgres      # Database logs
docker-compose logs -f frontend      # Frontend logs
```

### Restart
```bash
docker-compose restart               # All services
docker-compose restart backend       # Specific service
docker-compose up -d                 # Full cycle
```

### Backup
```bash
/opt/opc-gpmb/backup-db.sh          # Manual backup
ls -lh /backups/opc-gpmb/           # List backups
```

### Update Code
```bash
cd /opt/opc-gpmb
git pull origin main
docker-compose build --no-cache backend frontend
docker-compose up -d
```

---

## 📊 System Architecture

### Services (3 Docker Containers)

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **postgres** | postgres:15-alpine | 5432 | Database |
| **backend** | Custom (Dockerfile.backend) | 8000 | FastAPI API |
| **frontend** | Custom (Dockerfile.frontend) | 3000 | Next.js UI |

### Storage

| Volume | Purpose | Location |
|--------|---------|----------|
| **postgres_data** | Database files | `/var/lib/docker/volumes/postgres_data/` |
| **backend_uploads** | File uploads | `/var/lib/docker/volumes/backend_uploads/` |
| **Backups** | Database backups | `/backups/opc-gpmb/` |

### Network

- **opc_network** (bridge) — Internal Docker network
- Services communicate: `http://backend:8000`, `postgresql://postgres:5432`
- External access: `http://server-ip:3000` and `http://server-ip:8000`

---

## 🔐 Security Configuration

### Automatically Configured by `deploy.sh`

- ✅ Non-root user in containers (appuser:1000)
- ✅ Random JWT_SECRET (32-byte hex)
- ✅ Random POSTGRES_PASSWORD (20 chars)
- ✅ Read-only filesystem options in docker-compose.yml
- ✅ Health checks for all services
- ✅ Internal network isolation (opc_network)

### Manual Configuration Required

- ⚠️ Firewall rules (UFW) — See DEPLOYMENT_GUIDE.md
- ⚠️ Nginx reverse proxy + SSL/TLS — See DEPLOYMENT_GUIDE.md
- ⚠️ Update `.env` with actual domain before production
- ⚠️ Store `.env` securely (not in git)
- ⚠️ Backup database regularly (automated via cron)

---

## 📈 Performance & Monitoring

### Resource Limits (Recommended)

```yaml
# Add to docker-compose.yml if needed
backend:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

### Monitoring Commands

```bash
# Real-time resource usage
docker stats

# Database size
docker exec opc_postgres du -sh /var/lib/postgresql

# Backup size
du -sh /backups/opc-gpmb/

# Disk usage
df -h
```

---

## 🆘 Troubleshooting Quick Links

| Issue | See Section |
|-------|-------------|
| "Permission denied" | DEPLOYMENT_GUIDE.md → Troubleshooting |
| "Port already in use" | DEPLOYMENT_GUIDE.md → Troubleshooting |
| "Docker daemon not running" | DEPLOYMENT_GUIDE.md → Troubleshooting |
| "Database connection error" | DEPLOYMENT_GUIDE.md → Troubleshooting |
| "Container exits immediately" | DEPLOYMENT_GUIDE.md → Troubleshooting |
| "API not responding" | DEPLOYMENT_GUIDE.md → Troubleshooting |
| General issues | Run: `docker-compose logs -f` |

---

## 📞 Getting Help

1. **First:** Check `docker-compose logs -f` for error messages
2. **Second:** See troubleshooting in DEPLOYMENT_GUIDE.md
3. **Third:** Verify `.env` configuration
4. **Fourth:** Check system resources: `free -h && df -h`
5. **Fifth:** Review deployment log: `/var/log/opc-gpmb-deploy.log`

---

## 📝 File Sizes & Build Times

| File | Size | Notes |
|------|------|-------|
| deploy.sh | 11 KB | Bash script |
| docker-compose.yml | 2.4 KB | YAML config |
| Dockerfile.backend | 1.3 KB | Python/FastAPI |
| Dockerfile.frontend | 1.2 KB | Node/Next.js |
| .env.example | 0.8 KB | Template |
| DEPLOYMENT_README.md | 12 KB | Documentation |
| DEPLOY_QUICKSTART.md | 10 KB | Quick guide |
| DEPLOYMENT_GUIDE.md | 14 KB | Detailed guide |
| **Total docs** | **~50 KB** | All documentation |
| **Total files** | **~30 KB** | Code + config only |

### Build Times (Typical)

| Stage | Time | Notes |
|-------|------|-------|
| Docker install | 2-3 min | One-time |
| Backend image build | 5-8 min | Python + dependencies |
| Frontend image build | 5-10 min | Node + npm install |
| Postgres startup | 30 sec | Health check |
| Backend startup | 20 sec | API ready |
| Frontend startup | 20 sec | UI ready |
| **Total first deployment** | ~20 min | Includes all above |
| **Subsequent deployments** | 2-5 min | Docker cache reuse |

---

## 🎯 Success Criteria

After deployment, you should see:

```bash
# 1. All containers running
$ docker-compose ps
NAME              STATUS             PORTS
opc_postgres      Up (healthy)       0.0.0.0:5432->5432/tcp
opc_backend       Up (healthy)       0.0.0.0:8000->8000/tcp
opc_frontend      Up (healthy)       0.0.0.0:3000->3000/tcp

# 2. API responding
$ curl http://localhost:8000/health
{"status": "ok"}

# 3. Frontend accessible
$ curl http://localhost:3000
<html>...Next.js...

# 4. Database healthy
$ docker exec opc_postgres pg_isready -U opc -d opc_gpmb
accepting connections

# 5. Can login
Username: admin
Password: Admin@123
→ Dashboard loads successfully
```

---

## 🚀 Next Steps After Deployment

### Phase 1: Immediate (24 hours)
- [ ] Verify all features working
- [ ] Test login and basic workflows
- [ ] Review logs for warnings
- [ ] Run initial backup test

### Phase 2: This Week
- [ ] Set up firewall rules
- [ ] Configure Nginx reverse proxy
- [ ] Install SSL/TLS certificates
- [ ] Test backup + restore

### Phase 3: Ongoing
- [ ] Monitor resource usage
- [ ] Review logs regularly
- [ ] Test backups monthly
- [ ] Update code and rebuild as needed
- [ ] Keep Docker/OS packages updated

---

## 📄 Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-05-01 | 1.0 | Initial deployment infrastructure complete |

---

**Status: ✅ Ready for Production Deployment**

All files are prepared and tested. The project is ready to be deployed to your on-premise server using the automated `deploy.sh` script.

**Start here:** Read `DEPLOYMENT_README.md` then follow `DEPLOY_QUICKSTART.md`

---

**Generated:** 2026-05-01 by DevSecOps Engineer Agent
