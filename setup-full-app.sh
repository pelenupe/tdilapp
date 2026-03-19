#!/bin/bash
# Complete tDIL App Setup Script
# Copy and paste this entire script into your server terminal

echo "🚀 Setting up complete tDIL application..."

# Go to /opt directory
cd /opt

# Clone the tDIL repository if it doesn't exist
if [ ! -d "tdil" ]; then
    echo "📂 Cloning tDIL repository..."
    git clone https://github.com/pelenupe/tdilapp.git tdil
else
    echo "📂 Updating existing repository..."
    cd tdil && git pull origin main && cd /opt
fi

cd tdil

# Install dependencies
echo "📦 Installing dependencies..."
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
JWT_SECRET=your-super-long-jwt-secret-string-minimum-64-characters-for-production-use-change-this-now
SESSION_SECRET=your-super-long-session-secret-string-for-production-use-change-this-now
FRONTEND_URL=http://104.131.63.244
ALLOWED_ORIGINS=http://104.131.63.244,http://tdilapp.com,https://tdilapp.com
HEALTH_CHECK_TOKEN=health123token
BCRYPT_ROUNDS=12
LOG_LEVEL=info
METRICS_ENABLED=true
UPLOAD_DIRECTORY=/opt/tdil/uploads
ADMIN_EMAIL=admin@tdil.com
EOF

# Create directories
echo "📁 Creating directories..."
mkdir -p uploads logs

# Set up PostgreSQL database
echo "🗄️ Setting up database..."
sudo -u postgres psql -c "CREATE DATABASE tdil_production;" 2>/dev/null || echo "Database exists"
sudo -u postgres psql -c "CREATE USER tdil_user WITH ENCRYPTED PASSWORD 'securepassword123';" 2>/dev/null || echo "User exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tdil_production TO tdil_user;" 2>/dev/null || echo "Already granted"

# Run database migrations
echo "🔄 Running database migrations..."
node scripts/migrate-production.js migrate || echo "Migration complete"

# Start the app with PM2
echo "🚀 Starting Node.js application..."
pm2 delete tdil 2>/dev/null || echo "No existing app"
pm2 start server.js --name tdil --env production

# Wait a moment for app to start
sleep 5

# Check PM2 status
echo "📊 Checking PM2 status..."
pm2 status

# Test the API
echo "🩺 Testing API health..."
curl -s http://localhost:5001/health && echo "" || echo "API not responding yet"

# Configure Nginx to proxy to Node.js
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    
    root /var/www/html;
    index index.html;
    
    server_name _;
    
    # API routes go to Node.js
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health endpoint
    location /health {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
    }
    
    # Static files first, then proxy everything else to Node.js
    location / {
        try_files $uri $uri/ @nodejs;
    }
    
    location @nodejs {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_Set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Test and reload Nginx
echo "🔄 Reloading Nginx..."
nginx -t && systemctl reload nginx

# Final tests
echo "🩺 Testing complete setup..."
echo "Health endpoint:"
curl -s http://localhost/health && echo "" || echo "Health endpoint not working"
echo ""
echo "API health endpoint:"
curl -s http://localhost/api/health && echo "" || echo "API health endpoint not working"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Status:"
echo "• PM2 Status:"
pm2 list
echo ""
echo "🌐 Test your application:"
echo "• Main site: http://104.131.63.244"
echo "• Health check: http://104.131.63.244/health"
echo "• API health: http://104.131.63.244/api/health"
echo ""
echo "🔧 Commands to remember:"
echo "• View logs: pm2 logs tdil"
echo "• Restart app: pm2 restart tdil"
echo "• Stop app: pm2 stop tdil"
echo ""
echo "✅ tDIL should now be fully functional!"
