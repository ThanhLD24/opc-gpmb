#!/bin/bash

# ─── OPC GPMB On-Premise Deployment Script ──────────────────────────
# Purpose: Automated full-stack deployment to on-premise server via SSH
# Usage: bash deploy.sh
# Prerequisites: Ubuntu 20.04+, SSH access, sudo privileges

set -e  # Exit on error

# ─── Color output ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── Logging functions ─────────────────────────────────────────────────
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ─── Configuration ─────────────────────────────────────────────────────
PROJECT_DIR="/opt/opc-gpmb"
REPO_URL="${REPO_URL:-https://github.com/your-repo/opc-gpmb.git}"  # CHANGE THIS
BRANCH="${BRANCH:-main}"
BACKUP_DIR="/backups/opc-gpmb"
LOG_FILE="/var/log/opc-gpmb-deploy.log"

# ─── Step 1: Pre-flight checks ─────────────────────────────────────────
log_info "Running pre-flight checks..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root (use: sudo bash deploy.sh)"
    exit 1
fi

# Check OS
if ! grep -qi "ubuntu\|debian" /etc/os-release; then
    log_warn "Script is optimized for Ubuntu/Debian. Other Linux distros may need adjustments."
fi

# Check internet connectivity
if ! ping -c 1 8.8.8.8 &> /dev/null; then
    log_error "No internet connectivity. Cannot download Docker or repository."
    exit 1
fi

log_success "Pre-flight checks passed"

# ─── Step 2: Install Docker & Docker Compose ──────────────────────────
log_info "Checking Docker installation..."

if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    log_success "Docker already installed: $DOCKER_VERSION"
else
    log_info "Installing Docker..."
    apt-get update -qq
    apt-get install -y -qq \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # Add current user to docker group (optional)
    if [[ -n "$SUDO_USER" ]]; then
        usermod -aG docker "$SUDO_USER"
        log_info "Added $SUDO_USER to docker group (log out and back in to apply)"
    fi

    systemctl enable docker
    systemctl start docker

    log_success "Docker installed successfully"
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    log_success "Docker Compose already installed: $COMPOSE_VERSION"
else
    log_info "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    log_success "Docker Compose installed successfully"
fi

# ─── Step 3: Clone/Update repository ───────────────────────────────────
log_info "Setting up project directory..."

if [[ -d "$PROJECT_DIR" ]]; then
    log_warn "Project directory already exists at $PROJECT_DIR"
    log_info "Pulling latest changes..."
    cd "$PROJECT_DIR"
    git pull origin "$BRANCH"
else
    log_info "Cloning repository..."
    mkdir -p "$PROJECT_DIR"
    git clone --branch "$BRANCH" "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

log_success "Project directory ready at $PROJECT_DIR"

# ─── Step 4: Create backup directory ───────────────────────────────────
log_info "Setting up backup directory..."
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
log_success "Backup directory ready at $BACKUP_DIR"

# ─── Step 5: Configure .env file ──────────────────────────────────────
log_info "Configuring environment variables..."

if [[ -f "$PROJECT_DIR/.env" ]]; then
    log_warn ".env already exists. Backing up to .env.backup"
    cp "$PROJECT_DIR/.env" "$PROJECT_DIR/.env.backup"
else
    log_info "Creating .env from template..."
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"

    # Generate random JWT secret
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s/your-super-secret-jwt-key-change-in-production-minimum-32-chars/$JWT_SECRET/" "$PROJECT_DIR/.env"

    # Generate random database password
    DB_PASSWORD=$(openssl rand -base64 20 | tr -d "=+/" | cut -c1-20)
    sed -i "s/changeme_in_production/$DB_PASSWORD/" "$PROJECT_DIR/.env"

    log_warn "Generated random JWT_SECRET and POSTGRES_PASSWORD"
    log_warn "Please review and update .env as needed:"
    log_warn "  - API_URL (change localhost to your server IP/domain)"
    log_warn "  - NEXT_PUBLIC_API_URL (same as API_URL)"
    log_warn "  - POSTGRES_PASSWORD (randomly generated, store securely)"
fi

log_success ".env file configured"

# ─── Step 6: Build Docker images ──────────────────────────────────────
log_info "Building Docker images (this may take 10-15 minutes)..."

cd "$PROJECT_DIR"
docker-compose build 2>&1 | tee -a "$LOG_FILE"

if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
    log_error "Docker build failed. Check logs at $LOG_FILE"
    exit 1
fi

log_success "Docker images built successfully"

# ─── Step 7: Start containers ──────────────────────────────────────────
log_info "Starting containers..."

docker-compose up -d 2>&1 | tee -a "$LOG_FILE"

if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
    log_error "Docker Compose startup failed. Check logs at $LOG_FILE"
    docker-compose logs
    exit 1
fi

log_success "Containers started"

# ─── Step 8: Wait for services to be healthy ──────────────────────────
log_info "Waiting for services to be healthy (this may take 1-2 minutes)..."

RETRIES=30
RETRY_COUNT=0

while [[ $RETRY_COUNT -lt $RETRIES ]]; do
    POSTGRES_READY=$(docker exec opc_postgres pg_isready -U opc -d opc_gpmb 2>/dev/null || echo "not ready")
    BACKEND_READY=$(curl -s -f http://localhost:8000/health > /dev/null 2>&1 && echo "ready" || echo "not ready")
    FRONTEND_READY=$(curl -s -f http://localhost:3000 > /dev/null 2>&1 && echo "ready" || echo "not ready")

    if [[ "$POSTGRES_READY" == "accepting connections" ]] && [[ "$BACKEND_READY" == "ready" ]] && [[ "$FRONTEND_READY" == "ready" ]]; then
        log_success "All services are healthy"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [[ $RETRY_COUNT -eq $RETRIES ]]; then
        log_error "Services failed to become healthy after ${RETRIES} retries"
        log_info "Checking container status..."
        docker-compose ps
        log_info "Checking logs..."
        docker-compose logs --tail=50
        exit 1
    fi

    echo -ne "  Postgres: $POSTGRES_READY | Backend: $BACKEND_READY | Frontend: $FRONTEND_READY\r"
    sleep 2
done

# ─── Step 9: Display access information ────────────────────────────────
log_info "Deployment completed successfully!"
log_success "═══════════════════════════════════════════════════════════"

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo -e "\n${GREEN}Access your application:${NC}"
echo "  Frontend:  http://$SERVER_IP:3000"
echo "  Backend:   http://$SERVER_IP:8000"
echo "  Database:  postgres://opc:***@$SERVER_IP:5432/opc_gpmb"

echo -e "\n${GREEN}Default credentials:${NC}"
echo "  Username: admin"
echo "  Password: Admin@123"

echo -e "\n${YELLOW}Important files:${NC}"
echo "  Configuration:  $PROJECT_DIR/.env"
echo "  Docker Compose: $PROJECT_DIR/docker-compose.yml"
echo "  Deployment log: $LOG_FILE"
echo "  Backups:        $BACKUP_DIR"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "  1. Update .env with your actual server IP/domain"
echo "  2. Restart containers: docker-compose restart"
echo "  3. Set up firewall rules (see DEPLOYMENT_GUIDE.md)"
echo "  4. Configure Nginx reverse proxy (see DEPLOYMENT_GUIDE.md)"
echo "  5. Set up automated backups (see DEPLOYMENT_GUIDE.md)"

echo -e "\n${YELLOW}Useful commands:${NC}"
echo "  View logs:     docker-compose logs -f"
echo "  View status:   docker-compose ps"
echo "  Restart:       docker-compose restart"
echo "  Stop all:      docker-compose stop"
echo "  Full cleanup:  docker-compose down -v (WARNING: deletes all data)"

log_success "═══════════════════════════════════════════════════════════"

# ─── Step 10: Create backup script ─────────────────────────────────────
log_info "Setting up automated backup script..."

BACKUP_SCRIPT="$PROJECT_DIR/backup-db.sh"

cat > "$BACKUP_SCRIPT" << 'EOF'
#!/bin/bash

BACKUP_DIR="/backups/opc-gpmb"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "Starting database backup: $DATE"
docker exec opc_postgres pg_dump \
  -U opc \
  -d opc_gpmb \
  -Fc > "$BACKUP_DIR/opc_gpmb_$DATE.dump"

if [ $? -eq 0 ]; then
    echo "Backup completed: $BACKUP_DIR/opc_gpmb_$DATE.dump"

    # Keep only last 7 days of backups
    find "$BACKUP_DIR" -name "opc_gpmb_*.dump" -mtime +7 -delete
    echo "Old backups cleaned up"
else
    echo "Backup failed!"
    exit 1
fi
EOF

chmod +x "$BACKUP_SCRIPT"
log_success "Backup script created at $BACKUP_SCRIPT"

# ─── Step 11: Set up cron job for daily backup ────────────────────────
log_info "Setting up daily backup cron job..."

CRON_JOB="0 2 * * * $BACKUP_SCRIPT >> /var/log/opc-backup.log 2>&1"

# Check if cron job already exists
if ! crontab -l 2>/dev/null | grep -F "$BACKUP_SCRIPT" > /dev/null; then
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    log_success "Cron job added (daily backup at 2:00 AM)"
else
    log_warn "Cron job already exists"
fi

log_success "Deployment script completed successfully!"
echo "All logs saved to: $LOG_FILE"
