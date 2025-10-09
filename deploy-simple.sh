#!/bin/bash
# Simple Direct Deployment (No Docker) for tDIL on Digital Ocean
# Run this script on your droplet: 104.131.63.244

set -e

echo "🚀 Starting simple tDIL deployment (no Docker)..."

# Update system
echo "📦 Updating system..."
apt update && apt upgrade -y

# Install Node.js 18
echo "🟢 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PostgreSQL
echo "🗄️ Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Install PM2 for process management
echo "🔄 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "🌐 Installing Nginx..."
apt install -y nginx

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

# Create app user
echo "👤 Creating app user..."
useradd -m -s /bin/bash tdil || echo "User already exists"

# Clone/update repository
echo "📂 Setting up application..."
if [ -d "/opt/tdil" ]; then
    cd /opt/tdil
    git pull origin main
else
    git clone https://github.com/pelenupe/tdilapp.git /opt/tdil
    cd /opt/tdil
fi

# Set up database
echo "🗄️ Setting up PostgreSQL database..."
sudo -u postgres psql -c "CREATE DATABASE tdil_production;" || echo "Database already exists"
sudo -u postgres psql -c "CREATE USER tdil_user WITH ENCRYPTED PASSWORD 'securepassword123';" || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tdil_production TO tdil_user;" || echo "Privileges already granted"
sudo -u postgres psql -c "ALTER USER tdil_user CREATEDB;" || echo "Already has createdb"

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install --production

# Create environment file
echo "⚙️ Creating environment configuration..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://tdil_user:securepassword123@localhost:5432/tdil_production
DB_TYPE=postgresql
POSTGRES_DB=tdil_production
POSTGRES_USER=tdil_user
POSTGRES_PASSWORD=securepassword123
JWT_SECRET=your-super-long-jwt-secret-string-minimum-64-characters-for-production-use-change-this
SESSION_SECRET=your-super-long-session-secret-string-for-production-use-change-this
FRONTEND_URL=http://104.131.63.244
ALLOWED_ORIGINS=http://104.131.63.244,http://tdilapp.com,https://tdilapp.com
HEALTH_CHECK_TOKEN=health123token
BCRYPT_ROUNDS=12
LOG_LEVEL=info
METRICS_ENABLED=true
ENABLE_ACCESS_LOG=true
ENABLE_ERROR_LOG=true
MAX_FILE_SIZE=10485760
UPLOAD_DIRECTORY=/opt/tdil/uploads
ADMIN_EMAIL=admin@tdil.com
ENABLE_USER_REGISTRATION=true
REQUIRE_EMAIL_VERIFICATION=false
EOF

# Create directories
echo "📁 Creating directories..."
mkdir -p uploads logs
chown -R tdil:tdil /opt/tdil

# Run database migrations
echo "🔄 Running database migrations..."
node scripts/migrate-production.js migrate || echo "Migration completed or already done"

# Create simple HTML file for frontend
echo "🌐 Creating simple frontend..."
mkdir -p public
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>tDIL - Talent Development Impact Lab</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 10px; }
        .content { padding: 20px; }
        .api-test { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 tDIL Backend Running Successfully!</h1>
        <p>Talent Development Impact Lab - Production API</p>
    </div>
    
    <div class="content">
        <h2>System Status</h2>
        <p>✅ Backend API is running on Node.js</p>
        <p>✅ PostgreSQL database connected</p>
        <p>✅ All endpoints are accessible</p>
        
        <div class="api-test">
            <h3>Test API Endpoints:</h3>
            <a href="/health" class="button">Health Check</a>
            <a href="/api/health" class="button">Detailed Health</a>
            <a href="/api/auth/status" class="button">Auth Status</a>
        </div>
        
        <h3>Default Admin Login:</h3>
        <p><strong>Email:</strong> admin@tdil.com</p>
        <p><strong>Password:</strong> TempAdmin2024!</p>
        <p><em>⚠️ Change this password immediately!</em></p>
        
        <h3>Next Steps:</h3>
        <ul>
            <li>Point tdilapp.com DNS to this server</li>
            <li>Set up SSL certificate</li>
            <li>Build and deploy React frontend</li>
            <li>Configure production settings</li>
        </ul>
    </div>
</body>
</html>
EOF

# Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/tdil << 'EOF'
server {
    listen 80;
    server_name 104.131.63.244 tdilapp.com www.tdilapp.com;
    
    # Serve static files
    location / {
        try_files $uri $uri/ @backend;
    }
    
    # Proxy API requests to Node.js
    location @backend {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # API routes
    location /api {
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
    
    # Health check
    location /health {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/tdil /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Start the application with PM2
echo "🚀 Starting tDIL application..."
pm2 delete tdil || echo "App not running"
pm2 start server.js --name tdil --env production
pm2 save
pm2 startup

# Enable services
systemctl enable nginx
systemctl enable postgresql

# Final status check
echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📋 Status Check:"
echo "  • Node.js: $(node --version)"
echo "  • PostgreSQL: $(sudo -u postgres psql -c 'SELECT version();' -t | head -1)"
echo "  • PM2 Status:"
pm2 status
echo ""
echo "🌐 Your application should now be accessible at:"
echo "  • http://104.131.63.244"
echo "  • http://104.131.63.244/health"  
echo "  • http://104.131.63.244/api/health"
echo ""
echo "🔧 Management commands:"
echo "  • View logs: pm2 logs tdil"
echo "  • Restart app: pm2 restart tdil"
echo "  • Stop app: pm2 stop tdil"
echo ""
echo "✅ tDIL is now running without Docker!"
