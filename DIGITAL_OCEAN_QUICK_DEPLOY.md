# 🌊 Digital Ocean Droplet Quick Deploy Guide

## 🚀 Deploy tDIL to Digital Ocean in 10 Steps

### 1. Create Digital Ocean Droplet
```bash
# Create Ubuntu 22.04 droplet (minimum $12/month - 2GB RAM recommended)
# Enable monitoring, backups, and add your SSH key
```

### 2. SSH into Your Droplet
```bash
ssh root@your-droplet-ip
```

### 3. Update System & Install Docker
```bash
# Update system
apt update && apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install additional tools
apt install git ufw fail2ban -y
```

### 4. Configure Firewall
```bash
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable
```

### 5. Clone Your Repository
```bash
# Clone the production-ready code
git clone https://github.com/pelenupe/tdilapp.git /opt/tdil
cd /opt/tdil

# Make sure you're on the latest commit with production features
git pull origin main
```

### 6. Create Production Environment
```bash
# Copy environment template
cp .env.production .env

# Edit with your production values
nano .env
```

**Required Changes in .env:**
```bash
# Generate strong passwords
DATABASE_URL=postgresql://tdil_user:STRONG_DB_PASSWORD@db:5432/tdil_production
POSTGRES_PASSWORD=STRONG_DB_PASSWORD
REDIS_PASSWORD=STRONG_REDIS_PASSWORD

# Generate secure JWT secret (64+ chars)
JWT_SECRET=your-64-character-minimum-jwt-secret

# Set your domain
FRONTEND_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Other security tokens
SESSION_SECRET=your-session-secret
HEALTH_CHECK_TOKEN=your-health-token

# Email configuration (if using)
EMAIL_USER=noreply@your-domain.com
EMAIL_PASS=your-app-password
```

### 7. Set Up SSL (Let's Encrypt)
```bash
# Install Certbot
apt install certbot -y

# Get SSL certificate (replace with your domain)
certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Create SSL directory and copy certificates
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/

# Set up auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet && cd /opt/tdil && docker-compose -f docker-compose.prod.yml restart nginx" | crontab -
```

### 8. Create Data Directories
```bash
mkdir -p data/{postgres,postgres_backups,uploads,logs,backups,nginx_logs,redis,redis_logs}
chmod -R 755 data/
```

### 9. Deploy Application
```bash
# Start the database first
docker-compose -f docker-compose.prod.yml up -d db redis

# Wait for DB to be ready, then run migrations
sleep 30
docker-compose -f docker-compose.prod.yml run --rm migrate

# Start all services
docker-compose -f docker-compose.prod.yml up -d --build

# Optional: Enable backup service
docker-compose -f docker-compose.prod.yml --profile backup up -d
```

### 10. Verify Deployment
```bash
# Check all services are running
docker-compose -f docker-compose.prod.yml ps

# Test health endpoints
curl http://localhost:5001/health
curl -H "X-Health-Token: YOUR_TOKEN" http://localhost:5001/api/health

# Check logs
docker-compose -f docker-compose.prod.yml logs app
```

## 🔧 Quick Commands for Management

### Update Application
```bash
cd /opt/tdil
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
docker-compose -f docker-compose.prod.yml run --rm migrate
```

### View Logs
```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs -f app

# All services
docker-compose -f docker-compose.prod.yml logs -f
```

### Database Backup
```bash
# Manual backup
docker-compose -f docker-compose.prod.yml run --rm app node scripts/backup-restore.js backup

# List backups
docker-compose -f docker-compose.prod.yml run --rm app node scripts/backup-restore.js list
```

### Monitor System
```bash
# Check container stats
docker stats

# Check disk usage
df -h
du -sh data/*
```

## 🆘 Troubleshooting

### Services Won't Start
```bash
# Check Docker daemon
systemctl status docker

# Check specific service logs
docker-compose -f docker-compose.prod.yml logs [service-name]
```

### Database Connection Issues
```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Connect to database manually
docker-compose -f docker-compose.prod.yml exec db psql -U tdil_user -d tdil_production
```

### SSL Certificate Issues
```bash
# Check certificates
certbot certificates

# Renew manually
certbot renew --force-renewal
```

---

## 🎯 Your app will be live at: https://your-domain.com

**Default Admin Login:**
- Email: admin@tdil.com  
- Password: TempAdmin2024!

**⚠️ Change the admin password immediately after first login!**
