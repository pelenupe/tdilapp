# 🚀 DigitalOcean Deployment Guide

## Prerequisites

1. **DigitalOcean Account**: Sign up at [digitalocean.com](https://digitalocean.com)
2. **GitHub Repository**: Code must be in a GitHub repository
3. **Domain Name** (optional): For custom domain setup

## Step 1: Prepare Your Repository

1. **Push all code to GitHub**:
```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

2. **Verify required files exist**:
- `.do/app.yaml` ✅
- `.env.production` ✅
- `tdil-frontend/.env.production` ✅
- `scripts/migrate.js` ✅
- `scripts/seed.js` ✅

## Step 2: DigitalOcean App Platform Setup

### 2.1 Create New App

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click **"Create App"**
3. Choose **"GitHub"** as source
4. Select your repository and branch (`main`)
5. Click **"Next"**

### 2.2 Import App Spec

1. Click **"Edit Your App Spec"**
2. Copy the contents of `.do/app.yaml`
3. Update the following placeholders:
   - `your-username/tdil-platform` → your actual GitHub repo
   - Save the configuration

### 2.3 Configure Environment Variables

**Critical**: Update these environment variables in the App Platform dashboard:

```bash
# Generate a secure JWT secret (256-bit)
JWT_SECRET=your-cryptographically-secure-256-bit-secret-key-here

# Database will be auto-configured by DigitalOcean
DATABASE_URL=${db.DATABASE_URL}

# Update with your actual domain after deployment
FRONTEND_URL=https://your-app-name.ondigitalocean.app
```

## Step 3: Database Setup

### 3.1 PostgreSQL Database

DigitalOcean will automatically create a PostgreSQL database. The connection will be available as `${db.DATABASE_URL}`.

### 3.2 Update Frontend API URL

After deployment, update `tdil-frontend/.env.production`:
```bash
VITE_API_BASE_URL=https://your-actual-app-url.ondigitalocean.app/api
```

## Step 4: Deploy

1. Click **"Create Resources"**
2. Wait for deployment (5-10 minutes)
3. DigitalOcean will:
   - Create PostgreSQL database
   - Build and deploy your app
   - Run database migrations
   - Seed initial data

## Step 5: Post-Deployment Configuration

### 5.1 Update Environment Variables

Once deployed, go to **Settings → Environment Variables** and update:

```bash
FRONTEND_URL=https://your-actual-domain.ondigitalocean.app
```

### 5.2 Update Frontend Configuration

Update `tdil-frontend/.env.production` with your actual API URL:
```bash
VITE_API_BASE_URL=https://your-actual-domain.ondigitalocean.app/api
```

Commit and push this change:
```bash
git add .
git commit -m "Update production API URL"
git push origin main
```

### 5.3 Verify Deployment

1. Visit your app URL
2. Check health endpoint: `https://your-app.ondigitalocean.app/health`
3. Test user registration and login
4. Verify API endpoints are working

## Step 6: Custom Domain (Optional)

### 6.1 Add Domain

1. Go to **Settings → Domains**
2. Click **"Add Domain"**
3. Enter your domain name
4. Follow DNS configuration instructions

### 6.2 Update Environment Variables

```bash
FRONTEND_URL=https://yourdomain.com
```

### 6.3 Update Frontend Config

```bash
VITE_API_BASE_URL=https://yourdomain.com/api
```

## Step 7: SSL/TLS Configuration

DigitalOcean automatically provides SSL certificates for:
- `.ondigitalocean.app` domains
- Custom domains (Let's Encrypt)

## Step 8: Monitoring & Maintenance

### 8.1 Application Logs

- View logs in DigitalOcean dashboard
- Monitor error rates and performance

### 8.2 Database Management

- Access database via DigitalOcean console
- Set up automated backups
- Monitor connection pool usage

### 8.3 Scaling

- Monitor resource usage
- Scale up/down as needed in the dashboard

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check build logs in DigitalOcean dashboard
   - Verify all dependencies are in `package.json`
   - Ensure frontend builds successfully locally

2. **Database Connection Issues**
   - Verify `DATABASE_URL` environment variable
   - Check database status in dashboard
   - Review migration logs

3. **API Errors**
   - Check application logs
   - Verify environment variables are set
   - Test endpoints with proper CORS settings

4. **Frontend Issues**
   - Verify `VITE_API_BASE_URL` is correct
   - Check browser console for errors
   - Ensure frontend build includes all assets

### Health Checks

Your app includes a health check endpoint:
```
GET /health
```

Response should be:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "version": "1.0.0"
}
```

## Security Considerations

1. **Environment Variables**
   - Never commit production secrets to Git
   - Use DigitalOcean's environment variable system
   - Rotate JWT secrets regularly

2. **Database Security**
   - Database uses SSL by default
   - Connection pooling configured
   - Regular backups enabled

3. **Application Security**
   - CORS properly configured
   - Rate limiting enabled
   - Helmet.js for security headers
   - Input validation on all endpoints

## Cost Optimization

- **Basic Tier**: $5-12/month for small applications
- **Database**: $15/month for basic PostgreSQL
- **Scaling**: Automatic based on usage
- **CDN**: Built-in for static assets

## Support

- **DigitalOcean Docs**: [App Platform Documentation](https://docs.digitalocean.com/products/app-platform/)
- **Community**: [DigitalOcean Community](https://www.digitalocean.com/community/)
- **Support Tickets**: Available for paid accounts

---

## Quick Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] `.do/app.yaml` configured with correct repo
- [ ] Environment variables updated
- [ ] App created in DigitalOcean
- [ ] Database connected
- [ ] Frontend API URL updated
- [ ] SSL certificate active
- [ ] Health check passing
- [ ] Domain configured (if using custom domain)
- [ ] Monitoring set up

**Your TDIL platform should now be live! 🎉**
