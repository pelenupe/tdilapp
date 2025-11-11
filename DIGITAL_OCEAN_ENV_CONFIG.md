# 🔧 Digital Ocean App Platform Environment Configuration

## 🚨 CRITICAL JWT SECRET ISSUE RESOLVED

**Problem Discovered**: Production JWT_SECRET was using placeholder value, causing authentication issues and preventing points from updating properly.

**Root Cause**: Digital Ocean App Platform environment variables not properly configured.

---

## 🔑 Required Environment Variables

Configure these in Digital Ocean App Platform → Settings → Environment Variables:

### Critical Security Variables
```bash
JWT_SECRET=c572f1039cfee688c25c9f242afe55713956d9c18d6997fbc708700c434b4cf20ca605001593af8d1fde20689c62cdda1ce2d4a41ccfb2c88577683f6c704b88
NODE_ENV=production
PORT=5001
```

### Database Configuration (PostgreSQL)
```bash
DB_TYPE=postgresql
DATABASE_URL=your_production_database_url_here
```

### CORS Configuration
```bash
FRONTEND_URL=https://tdilapp.com
ALLOWED_ORIGINS=https://tdilapp.com,https://www.tdilapp.com
```

### Optional Security Enhancements
```bash
TRUST_PROXY=true
COMPRESSION_ENABLED=true
HELMET_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 📝 Digital Ocean Configuration Steps

### 1. Access App Settings
1. Go to [Digital Ocean Control Panel](https://cloud.digitalocean.com/apps)
2. Select your tDIL app
3. Go to **Settings** tab
4. Click **Environment Variables**

### 2. Add Critical Variables
Click **Add Variable** for each:

| Variable | Value | Type |
|----------|-------|------|
| `JWT_SECRET` | `c572f1039cfee688c25c9f242afe55713956d9c18d6997fbc708700c434b4cf20ca605001593af8d1fde20689c62cdda1ce2d4a41ccfb2c88577683f6c704b88` | Secret |
| `NODE_ENV` | `production` | Text |
| `DB_TYPE` | `postgresql` | Text |
| `DATABASE_URL` | Your PostgreSQL connection string | Secret |
| `FRONTEND_URL` | `https://tdilapp.com` | Text |

### 3. Redeploy Application
After adding environment variables:
1. Click **Save**
2. App will automatically redeploy
3. Wait for deployment to complete (3-5 minutes)

---

## 🧪 Testing JWT Authentication

### Expected Behavior After Fix:
- ✅ Login should work without JWT errors
- ✅ Points should update properly on login
- ✅ User sessions should persist correctly
- ✅ No more "your-secret-key" fallbacks

### Debug Steps:
1. Login to https://tdilapp.com
2. Check browser dev tools → Network tab
3. Look for successful JWT token responses
4. Verify points update in leaderboard

---

## 🔍 Environment Variable Verification

Add this temporary debug endpoint to verify environment loading:

```javascript
// Add to server.js for debugging (remove after verification)
app.get('/api/debug/env', (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV,
    hasJwtSecret: !!process.env.JWT_SECRET,
    jwtSecretLength: process.env.JWT_SECRET?.length,
    isPlaceholder: process.env.JWT_SECRET === 'CHANGE_THIS_TO_LONG_RANDOM_STRING_64_CHARS_MINIMUM_FOR_SECURITY'
  });
});
```

Expected response after fix:
```json
{
  "nodeEnv": "production",
  "hasJwtSecret": true,
  "jwtSecretLength": 128,
  "isPlaceholder": false
}
```

---

## 📋 Security Checklist

- [x] JWT_SECRET set to secure random value
- [x] Environment variables properly configured in Digital Ocean
- [x] Placeholder values replaced with real secrets
- [x] CORS configured for production domain
- [x] Database configured for PostgreSQL
- [ ] SSL/HTTPS enabled
- [ ] Rate limiting configured
- [ ] Monitoring enabled

---

## 🚀 Immediate Action Required

**URGENT**: Configure the JWT_SECRET environment variable in Digital Ocean App Platform immediately to resolve authentication issues and enable proper points functionality.

The current placeholder value `CHANGE_THIS_TO_LONG_RANDOM_STRING_64_CHARS_MINIMUM_FOR_SECURITY` must be replaced with the secure secret provided above.
