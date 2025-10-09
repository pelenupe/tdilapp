#!/bin/bash
# tDIL Production Deployment Script for Digital Ocean
# Run this script after SSH'ing into your droplet

set -e  # Exit on any error

echo "🌊 Starting tDIL deployment to Digital Ocean droplet..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "🔧 Installing Docker and dependencies..."
apt install -y curl git ufw fail2ban nano

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "🔨 Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

# Clone repository
echo "📂 Cloning tDIL repository..."
if [ -d "/opt/tdil" ]; then
    cd /opt/tdil
    git pull origin main
else
    git clone https://github.com/pelenupe/tdilapp.git /opt/tdil
    cd /opt/tdil
fi

# Create data directories
echo "📁 Creating data directories..."
mkdir -p data/{postgres,postgres_backups,uploads,logs,backups,nginx_logs,redis,redis_logs}
chmod -R 755 data/

# Set up environment file
echo "⚙️  Setting up environment configuration..."
if [ ! -f ".env" ]; then
    cp .env.production .env
    
    # Generate random passwords and secrets
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -hex 32)
    SESSION_SECRET=$(openssl rand -hex 32)
    HEALTH_TOKEN=$(openssl rand -hex 16)
    
    # Update environment file with generated values
    sed -i "s/CHANGE_THIS_PASSWORD/$DB_PASSWORD/g" .env
    sed -i "s/CHANGE_THIS_REDIS_PASSWORD/$REDIS_PASSWORD/g" .env
    sed -i "s/CHANGE_THIS_TO_LONG_RANDOM_STRING_64_CHARS_MINIMUM_FOR_SECURITY/$JWT_SECRET/g" .env
    sed -i "s/CHANGE_THIS_TO_LONG_RANDOM_STRING_FOR_SESSIONS/$SESSION_SECRET/g" .env
    sed -i "s/CHANGE_THIS_HEALTH_CHECK_TOKEN/$HEALTH_TOKEN/g" .env
    
    # Update domain settings
    sed -i "s/your-domain.com/tdilapp.com/g" .env
    sed -i "s/https:\/\/www.your-domain.com/https:\/\/www.tdilapp.com/g" .env
    
    echo "🔑 Environment configured with generated secrets"
fi

# Start database services first
echo "🗄️  Starting database services..."
docker-compose -f docker-compose.prod.yml up -d db redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 30

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm migrate

# Start all services
echo "🚀 Starting all application services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to start
sleep 10

# Check service status
echo "📊 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

# Test health endpoints
echo "🩺 Testing application health..."
sleep 5
if curl -f http://localhost:5001/health > /dev/null 2>&1; then
    echo "✅ Application health check passed!"
else
    echo "⚠️  Health check failed, checking logs..."
    docker-compose -f docker-compose.prod.yml logs app | tail -20
fi

# Get the health check token for testing
HEALTH_TOKEN=$(grep HEALTH_CHECK_TOKEN .env | cut -d '=' -f2)

echo ""
echo "🎉 tDIL deployment completed!"
echo ""
echo "📋 Deployment Summary:"
echo "  • Application URL: http://$(curl -s ifconfig.me)"
echo "  • Admin Email: admin@tdil.com"
echo "  • Admin Password: TempAdmin2024! (CHANGE IMMEDIATELY!)"
echo "  • Health Check: curl -H 'X-Health-Token: $HEALTH_TOKEN' http://localhost:5001/api/health"
echo ""
echo "📝 Next steps:"
echo "  1. Point tdilapp.com to this IP address: $(curl -s ifconfig.me)"
echo "  2. Set up SSL with: certbot certonly --standalone -d tdilapp.com -d www.tdilapp.com"
echo "  3. Copy SSL certificates: cp /etc/letsencrypt/live/tdilapp.com/*.pem nginx/ssl/"
echo "  4. Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "  5. Change admin password immediately!"
echo ""
echo "📊 View logs: docker-compose -f docker-compose.prod.yml logs -f app"
echo "🔄 Update app: git pull && docker-compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "🌊 tDIL is now live on Digital Ocean! 🚀"
