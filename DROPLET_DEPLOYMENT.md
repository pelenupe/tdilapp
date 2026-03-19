# DigitalOcean Droplet Deployment Guide

## 🚀 Step 1: Create Droplet

1. **Create New Droplet** in DigitalOcean
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Basic - $12/month (2 GB RAM, 1 vCPU, 50 GB SSD)
   - **Region**: Choose closest to your users
   - **Authentication**: SSH Key (recommended) or Password
   - **Hostname**: `tdil-platform`

2. **Connect via SSH**
   ```bash
   ssh root@YOUR_DROPLET_IP
   ```

## 🔧 Step 2: Server Setup

### Update System
```bash
apt update && apt upgrade -y
```

### Install Node.js 18
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
node --version  # Should show v18.x.x
```

### Install Git
```bash
apt install git -y
```

### Install PostgreSQL
```bash
apt install postgresql postgresql-contrib -y
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql << 'EOF'
CREATE DATABASE tdil_platform;
CREATE USER tdil_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE tdil_platform TO tdil_user;
\q
EOF
```

### Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### Install Nginx (Reverse Proxy)
```bash
apt install nginx -y
systemctl start nginx
systemctl enable nginx
```

## 📂 Step 3: Deploy Application

### Clone Repository
```bash
cd /opt
git clone https://github.com/pelenupe/tdil-prod.git
cd tdil-prod
```

### Install Dependencies (Backend Only)
```bash
# Remove frontend directory to avoid conflicts
rm -rf tdil-frontend/

# Install backend dependencies on Linux (important for sqlite3 compatibility)
npm install --production

# If you get sqlite3 ELF header errors, rebuild native modules:
npm rebuild sqlite3
```

### Create Production Environment File
```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://tdil_user:kakdjkd83en#7jej
*re@localhost:5432/tdil_platform
JWT_SECRET=WnPQXSHGXjN2+YsQNP6+lC4fHmxDM3snEAbCfzNLA9Y=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://tdileapp.kumulushost.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
HELMET_ENABLED=true
COMPRESSION_ENABLED=true
TRUST_PROXY=true
EOF
```

### Setup Database
```bash
# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

### Create Public Directory
```bash
mkdir -p public
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>tDIL Platform API</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }
        .container { 
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        h1 { text-align: center; color: white; }
        .status { 
            background: #00ff88;
            color: #000;
            padding: 5px 15px;
            border-radius: 20px;
            display: inline-block;
            font-weight: bold;
        }
        .endpoint { 
            background: rgba(255,255,255,0.1);
            padding: 15px;
            margin: 10px 0;
            border-radius: 10px;
        }
        a { color: #ffd700; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎓 tDIL Platform API</h1>
        <div style="text-align: center; margin: 20px 0;">
            <span class="status">API ONLINE</span>
        </div>
        
        <div class="endpoint">
            <strong>Health Check:</strong> <a href="/health" target="_blank">/health</a>
        </div>
        <div class="endpoint">
            <strong>Authentication:</strong> POST /api/auth/register, POST /api/auth/login
        </div>
        <div class="endpoint">
            <strong>Users:</strong> GET /api/users/profile
        </div>
        <div class="endpoint">
            <strong>Events:</strong> GET /api/events
        </div>
        <div class="endpoint">
            <strong>Jobs:</strong> GET /api/jobs
        </div>
        <div class="endpoint">
            <strong>Points:</strong> GET /api/points
        </div>
        <div class="endpoint">
            <strong>Rewards:</strong> GET /api/rewards
        </div>
    </div>
</body>
</html>
EOF
```

## 🔄 Step 4: Start with PM2

```bash
# Start the application
pm2 start server.js --name tdil-api

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
# Follow the instructions it provides

# Check status
pm2 status
pm2 logs tdil-api
```

## 🌐 Step 5: Configure Nginx

```bash
cat > /etc/nginx/sites-available/tdil-platform << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/tdil-platform /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

## 🔐 Step 6: Setup SSL with Let's Encrypt

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace YOUR_DOMAIN.com)
certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com

# Test auto-renewal
certbot renew --dry-run
```

## 🔥 Step 7: Configure Firewall

```bash
# Enable UFW firewall
ufw enable

# Allow SSH, HTTP, HTTPS
ufw allow ssh
ufw allow 'Nginx Full'

# Check status
ufw status
```

## ✅ Step 8: Test Deployment

1. **Visit your domain**: `https://YOUR_DOMAIN.com`
2. **Test health check**: `https://YOUR_DOMAIN.com/health`
3. **Test API**: `https://YOUR_DOMAIN.com/api/auth/register`

## 🔄 Step 9: Deployment Updates

### Update Script
```bash
cat > /opt/tdil-prod/deploy.sh << 'EOF'
#!/bin/bash
echo "🚀 Deploying tDIL Platform..."

# Navigate to project
cd /opt/tdil-prod

# Pull latest changes
git pull origin main

# Remove frontend directory
rm -rf tdil-frontend/

# Install/update dependencies
npm install --production

# Run migrations
npm run migrate

# Restart PM2
pm2 restart tdil-api

echo "✅ Deployment complete!"
EOF

chmod +x /opt/tdil-prod/deploy.sh
```

### To Deploy Updates
```bash
/opt/tdil-prod/deploy.sh
```

## 📊 Monitoring Commands

```bash
# Check app status
pm2 status
pm2 logs tdil-api

# Check server resources
htop
df -h

# Check nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Check database
sudo -u postgres psql -d tdil_platform -c "SELECT * FROM users LIMIT 5;"
```

## 🆘 Troubleshooting

### App Won't Start
```bash
# Check logs
pm2 logs tdil-api

# Check if port is available
netstat -tulpn | grep 5001

# Restart manually
cd /opt/tdil-prod
node server.js
```

### Database Issues
```bash
# Check PostgreSQL status
systemctl status postgresql

# Connect to database
sudo -u postgres psql -d tdil_platform
```

### SSL Issues
```bash
# Renew SSL certificate
certbot renew

# Check certificate status
certbot certificates
```

---

## 📝 Summary

Your tDIL Platform will be available at:
- **Main Site**: `https://YOUR_DOMAIN.com`
- **API Health**: `https://YOUR_DOMAIN.com/health`
- **API Base**: `https://YOUR_DOMAIN.com/api`

This setup provides:
✅ Production-ready Node.js backend
✅ PostgreSQL database
✅ SSL encryption
✅ Process management with PM2
✅ Reverse proxy with Nginx
✅ Firewall protection
✅ Easy deployment updates
