# tDIL Career Platform - Production Deployment Guide

This comprehensive guide will walk you through deploying the tDIL Career Platform to production with real users, a PostgreSQL database, and all production-ready features enabled.

## 🏗️ Architecture Overview

The production setup includes:
- **PostgreSQL Database**: Production-grade database with proper indexing and constraints
- **Redis Cache**: Session management and caching
- **Nginx Reverse Proxy**: SSL termination and load balancing
- **Enhanced Security**: Rate limiting, authentication, audit logging
- **Monitoring & Health Checks**: Application metrics and system monitoring
- **Automated Backups**: Daily database backups with retention policy
- **Error Handling & Logging**: Comprehensive logging and error tracking

## 📋 Prerequisites

### System Requirements
- **Server**: Ubuntu 20.04+ or similar Linux distribution
- **Memory**: Minimum 2GB RAM (4GB recommended)
- **Storage**: Minimum 20GB SSD (50GB recommended)
- **Network**: Static IP address or domain name

### Required Software
- Docker & Docker Compose
- Git
- SSL Certificate (Let's Encrypt recommended)

## 🚀 Step 1: Server Preparation

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install curl git ufw fail2ban -y
```

### 1.2 Install Docker & Docker Compose
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 1.3 Configure Firewall
```bash
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

### 1.4 Create Application Directory
```bash
sudo mkdir -p /opt/tdil
sudo chown $USER:$USER /opt/tdil
cd /opt/tdil
```

## 🔧 Step 2: Application Setup

### 2.1 Clone Repository
```bash
git clone https://github.com/yourusername/tdil-app.git .
```

### 2.2 Create Data Directories
```bash
mkdir -p data/{postgres,postgres_backups,uploads,logs,backups,nginx_logs,redis,redis_logs}
chmod -R 755 data/
```

### 2.3 Configure Environment Variables
```bash
cp .env.production .env
```

Edit `.env` file with your production values:

```bash
# Production Server Configuration
PORT=5001
NODE_ENV=production
DATA_DIR=/opt/tdil/data

# Database Configuration
DB_TYPE=postgresql
DATABASE_URL=postgresql://tdil_user:YOUR_STRONG_DB_PASSWORD@localhost:5432/tdil_production
POSTGRES_DB=tdil_production
POSTGRES_USER=tdil_user
POSTGRES_PASSWORD=YOUR_STRONG_DB_PASSWORD

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=YOUR_STRONG_REDIS_PASSWORD

# JWT Configuration - Generate strong secrets!
JWT_SECRET=YOUR_64_CHARACTER_MINIMUM_JWT_SECRET_HERE
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_RESET_EXPIRES_IN=1h

# CORS Configuration
FRONTEND_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=noreply@your-domain.com
EMAIL_PASS=your-app-password
EMAIL_FROM=tDIL Platform <noreply@your-domain.com>

# AWS S3 Configuration (optional)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=tdil-uploads

# Rate Limiting (production values)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# Security
SESSION_SECRET=YOUR_SESSION_SECRET_64_CHARS_MINIMUM
BCRYPT_ROUNDS=12

# Logging Configuration
LOG_LEVEL=info
ENABLE_ACCESS_LOG=true
ENABLE_ERROR_LOG=true

# Monitoring
HEALTH_CHECK_TOKEN=YOUR_HEALTH_CHECK_TOKEN
METRICS_ENABLED=true
ENABLE_DETAILED_ERRORS=false

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
UPLOAD_DIRECTORY=/app/uploads

# Socket.IO Configuration
SOCKET_CORS_ORIGIN=https://your-domain.com
ENABLE_SOCKET_AUTH=true

# Admin Configuration
ADMIN_EMAIL=admin@your-domain.com
ENABLE_USER_REGISTRATION=true
REQUIRE_EMAIL_VERIFICATION=true

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
```

### 2.4 Generate Strong Secrets
Use these commands to generate secure secrets:
```bash
# JWT Secret (64+ characters)
openssl rand -hex 32

# Session Secret (64+ characters)  
openssl rand -hex 32

# Health Check Token
openssl rand -hex 16

# Database Password
openssl rand -base64 32

# Redis Password
openssl rand -base64 32
```

## 🔒 Step 3: SSL Certificate Setup

### 3.1 Install Certbot
```bash
sudo apt install certbot -y
```

### 3.2 Generate SSL Certificate
```bash
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

### 3.3 Create SSL Directory and Copy Certificates
```bash
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
sudo chown -R $USER:$USER nginx/ssl/
```

### 3.4 Setup SSL Renewal
```bash
echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f /opt/tdil/docker-compose.prod.yml restart nginx" | sudo crontab -
```

## 🗄️ Step 4: Database Initialization

### 4.1 Start Database Services
```bash
docker-compose -f docker-compose.prod.yml up -d db redis
```

### 4.2 Wait for Services to be Ready
```bash
# Check database health
docker-compose -f docker-compose.prod.yml ps db

# Check logs if needed
docker-compose -f docker-compose.prod.yml logs db
```

### 4.3 Run Database Migrations
```bash
# Run the migration service
docker-compose -f docker-compose.prod.yml run --rm migrate

# Alternatively, run migrations manually:
# docker-compose -f docker-compose.prod.yml run --rm app node scripts/migrate-production.js migrate
```

### 4.4 Seed Initial Data
```bash
docker-compose -f docker-compose.prod.yml run --rm app node scripts/migrate-production.js seed
```

## 🚀 Step 5: Application Deployment

### 5.1 Build and Start All Services
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 5.2 Enable Backup Service (Optional)
```bash
docker-compose -f docker-compose.prod.yml --profile backup up -d
```

### 5.3 Verify Services Are Running
```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# Check application logs
docker-compose -f docker-compose.prod.yml logs app

# Check nginx logs
docker-compose -f docker-compose.prod.yml logs nginx
```

## 🩺 Step 6: Health Checks & Verification

### 6.1 Test Health Endpoints
```bash
# Basic health check
curl http://localhost:5001/health

# Detailed health check (requires token)
curl -H "X-Health-Token: YOUR_HEALTH_CHECK_TOKEN" http://localhost:5001/api/health

# Readiness check
curl http://localhost:5001/api/health/ready
```

### 6.2 Test Through Nginx
```bash
# Test HTTP (should redirect to HTTPS)
curl -I http://your-domain.com

# Test HTTPS
curl -I https://your-domain.com

# Test API
curl https://your-domain.com/api/health
```

### 6.3 Test Database Connection
```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec db psql -U tdil_user -d tdil_production -c "SELECT COUNT(*) FROM users;"
```

## 👥 Step 7: User Management

### 7.1 Access Admin Account
The initial admin account is created during seeding:
- **Email**: admin@tdil.com
- **Password**: TempAdmin2024!

**⚠️ IMPORTANT**: Change this password immediately after first login!

### 7.2 Create Additional Admin Users
```bash
# Connect to the application container
docker-compose -f docker-compose.prod.yml exec app node -e "
const bcrypt = require('bcrypt');
const { query } = require('./backend/config/database');

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('YOUR_SECURE_PASSWORD', 12);
  const result = await query(`
    INSERT INTO users (email, password, first_name, last_name, user_type, is_verified, is_active)
    VALUES ($1, $2, $3, $4, 'admin', true, true)
    RETURNING id, email
  `, ['your-admin@domain.com', hashedPassword, 'Your', 'Name']);
  console.log('Admin user created:', result[0]);
  process.exit(0);
}

createAdmin().catch(console.error);
"
```

## 📊 Step 8: Monitoring & Maintenance

### 8.1 Log Management
View application logs:
```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs -f app

# Database logs
docker-compose -f docker-compose.prod.yml logs -f db

# Nginx logs
docker-compose -f docker-compose.prod.yml logs -f nginx

# Access logs on host
tail -f data/logs/access.log

# Error logs on host
tail -f data/logs/error.log
```

### 8.2 Database Backups
```bash
# Manual backup
docker-compose -f docker-compose.prod.yml run --rm app node scripts/backup-restore.js backup

# List backups
docker-compose -f docker-compose.prod.yml run --rm app node scripts/backup-restore.js list

# Restore from backup
docker-compose -f docker-compose.prod.yml run --rm app node scripts/backup-restore.js restore /app/backups/backup_file.sql.gz
```

### 8.3 System Monitoring
```bash
# System metrics (requires auth token)
curl -H "X-Health-Token: YOUR_HEALTH_CHECK_TOKEN" https://your-domain.com/api/metrics

# Container resource usage
docker stats

# Disk usage
df -h
du -sh data/*
```

## 🔄 Step 9: Updates & Deployments

### 9.1 Application Updates
```bash
# Pull latest code
git pull origin main

# Rebuild and redeploy
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Run any new migrations
docker-compose -f docker-compose.prod.yml run --rm migrate
```

### 9.2 Database Migrations
```bash
# Run new migrations
docker-compose -f docker-compose.prod.yml run --rm migrate

# Or manually
docker-compose -f docker-compose.prod.yml run --rm app node scripts/migrate-production.js migrate
```

## 🛡️ Step 10: Security Hardening

### 10.1 System Security
```bash
# Configure fail2ban for additional protection
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Regular security updates
echo "0 6 * * * apt update && apt upgrade -y" | sudo crontab -
```

### 10.2 Application Security
- Change all default passwords immediately
- Regularly rotate JWT secrets
- Monitor access logs for suspicious activity
- Keep Docker images updated
- Review user permissions regularly

### 10.3 Firewall Configuration
```bash
# Only allow necessary ports
sudo ufw status
sudo ufw delete allow 5432  # Remove if database port was exposed
```

## 📋 Step 11: Production Checklist

Before going live, verify:

- [ ] All default passwords changed
- [ ] SSL certificate properly configured
- [ ] Domain DNS pointing to server
- [ ] Email configuration working
- [ ] Database backups running
- [ ] Health checks passing
- [ ] Logs properly configured
- [ ] Rate limiting active
- [ ] CORS properly configured
- [ ] File upload restrictions in place
- [ ] Admin users created
- [ ] Security headers enabled
- [ ] Monitoring alerts configured

## 🚨 Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check Docker daemon
sudo systemctl status docker

# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check disk space
df -h
```

**Database connection issues:**
```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Verify credentials
echo $DATABASE_URL

# Test connection
docker-compose -f docker-compose.prod.yml exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT version();"
```

**SSL certificate issues:**
```bash
# Check certificate
sudo certbot certificates

# Test SSL configuration
curl -I https://your-domain.com
```

### Performance Tuning

**Database optimization:**
```bash
# Monitor slow queries
docker-compose -f docker-compose.prod.yml exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"
```

**Resource monitoring:**
```bash
# Container resource usage
docker stats --no-stream

# System resources
htop
iotop
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Review error logs and application metrics
2. **Monthly**: Update Docker images and system packages
3. **Quarterly**: Rotate secrets and review user access
4. **Annually**: Review and update SSL certificates

### Emergency Contacts

- System Administrator: [your-contact]
- Database Administrator: [db-contact]
- Application Developer: [dev-contact]

### Backup Recovery Process

In case of system failure:
1. Assess the extent of the problem
2. Check backup integrity
3. Restore from the most recent backup
4. Verify data consistency
5. Resume normal operations
6. Document the incident

---

## 🎉 Congratulations!

Your tDIL Career Platform is now production-ready with:
- ✅ PostgreSQL database with proper schema and indexing
- ✅ Enhanced security with authentication and audit logging  
- ✅ Comprehensive monitoring and health checks
- ✅ Automated backups and recovery procedures
- ✅ Production-grade error handling and logging
- ✅ Real user support with proper session management
- ✅ Scalable architecture ready for growth

The platform is ready to serve real users with professional networking, job opportunities, events, and reward systems!
