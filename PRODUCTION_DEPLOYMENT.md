# tDIL Production Deployment Guide

## 🚀 Production Readiness Checklist

### Phase 1: Environment Setup ✅
- [x] Environment variables configured
- [x] Production middleware added (helmet, compression, rate limiting)
- [x] CORS properly configured
- [x] Docker configuration created

### Phase 2: Security & Performance
- [ ] SSL/TLS certificates configured
- [ ] Database migration to PostgreSQL
- [ ] JWT secret keys updated
- [ ] API rate limiting tested
- [ ] Input validation implemented
- [ ] File upload security configured

### Phase 3: Database & Authentication
- [ ] Production database setup
- [ ] User registration flow completed
- [ ] Password reset functionality
- [ ] Email service integration
- [ ] Session management optimized

### Phase 4: Infrastructure & Monitoring
- [ ] Health check endpoints
- [ ] Logging system configured
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Backup strategy implemented

## 🔧 Quick Production Setup

### 1. Environment Configuration

Create production environment files:

```bash
# Backend .env
NODE_ENV=production
PORT=5001
JWT_SECRET=your-super-secure-jwt-secret-here
DB_TYPE=postgresql
DATABASE_URL=postgresql://username:password@host:port/database
FRONTEND_URL=https://your-domain.com
```

```bash
# Frontend .env.production
VITE_API_BASE_URL=https://your-api-domain.com/api
VITE_APP_NAME=tDIL
VITE_ENVIRONMENT=production
```

### 2. Database Migration

```bash
# Install PostgreSQL dependencies
npm install pg pg-hstore

# Update database configuration
# Edit backend/config/database.js for PostgreSQL
```

### 3. Docker Deployment

```bash
# Build and run with Docker
docker build -t tdil-app .
docker run -p 5001:5001 --env-file .env tdil-app
```

### 4. Docker Compose (Recommended)

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/tdil
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=tdil
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

## 🔒 Security Hardening

### 1. Update JWT Configuration
```javascript
// Strong JWT secret (32+ characters)
JWT_SECRET=your-cryptographically-secure-secret-key-here

// Shorter token expiration
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### 2. Database Security
```javascript
// Use connection pooling
// Implement prepared statements
// Enable SSL connections
// Regular backups
```

### 3. API Security
```javascript
// Input validation with Joi
// SQL injection prevention
// XSS protection
// CSRF tokens
```

## 📊 Monitoring & Logging

### 1. Health Check Endpoint
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version
  });
});
```

### 2. Error Tracking
```bash
npm install @sentry/node @sentry/tracing
```

### 3. Performance Monitoring
```bash
npm install newrelic
```

## 🚀 Deployment Platforms

### Heroku
```bash
# Install Heroku CLI
heroku create tdil-app
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
git push heroku main
```

### AWS ECS/Fargate
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin
docker build -t tdil .
docker tag tdil:latest your-account.dkr.ecr.us-east-1.amazonaws.com/tdil:latest
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/tdil:latest
```

### DigitalOcean App Platform
```yaml
name: tdil
services:
- name: api
  source_dir: /
  github:
    repo: your-username/tdil
    branch: main
  run_command: node server.js
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
```

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    - name: Install dependencies
      run: |
        npm ci
        cd tdil-frontend && npm ci
    - name: Run tests
      run: npm test
    - name: Build frontend
      run: cd tdil-frontend && npm run build
    - name: Deploy to production
      run: # Your deployment script
```

## 📋 Production Checklist

### Before Launch
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Database backed up
- [ ] Environment variables secured
- [ ] Error tracking configured
- [ ] Performance monitoring setup
- [ ] Load testing completed
- [ ] Security audit performed

### Post Launch
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify all features working
- [ ] Monitor database performance
- [ ] Check SSL certificate validity
- [ ] Review security logs

## 🆘 Troubleshooting

### Common Issues
1. **CORS errors**: Check FRONTEND_URL in .env
2. **Database connection**: Verify DATABASE_URL
3. **JWT errors**: Ensure JWT_SECRET is set
4. **File uploads**: Check file permissions
5. **Rate limiting**: Adjust limits in production

### Monitoring Commands
```bash
# Check application logs
docker logs tdil-app

# Monitor resource usage
docker stats tdil-app

# Database connection test
psql $DATABASE_URL -c "SELECT 1;"
```

## 📞 Support

For production deployment support:
- Create GitHub issues for bugs
- Check logs for error details
- Monitor application metrics
- Review security best practices

---

**Next Steps**: Follow Phase 2-4 of the checklist to complete production readiness.
