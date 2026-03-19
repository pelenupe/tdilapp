# 🎫 tDIL Invite Token Management Guide

## Overview
The tDIL application now uses an invite-only registration system. Users must have a valid invite token to create an account.

## 🔧 How to Create Invite Tokens

### Method 1: Using API Endpoints (Recommended)
```bash
# Create a token for a specific email
curl -X POST http://tdilapp.com/api/invites/create \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Create a general-use token (any user can use)
curl -X POST http://tdilapp.com/api/invites/create \
  -H "Content-Type: application/json" \
  -d '{"email": null}'
```

### Method 2: Direct Database Access
```bash
# SSH into your droplet
ssh root@104.131.63.244

# Connect to PostgreSQL and create tokens
cd /opt/tdil
node -e "
const { Client } = require('pg');
const db = require('./backend/config/database');

async function createToken() {
  const token = 'DEMO-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  await db.query('INSERT INTO invite_tokens (token, email) VALUES ($1, $2)', [token, null]);
  console.log('Created token:', token);
}
createToken();
"
```

## 📋 Managing Tokens

### View All Tokens
```bash
# List all tokens and their status
ssh root@104.131.63.244 'cd /opt/tdil && node -e "
const db = require('./backend/config/database');
db.query('SELECT token, email, is_used, created_at FROM invite_tokens ORDER BY created_at DESC')
  .then(result => {
    console.log('\nInvite Tokens:');
    result.rows.forEach(row => {
      const status = row.is_used ? '🔴 USED' : '🟢 AVAILABLE';
      const email = row.email || 'Any User';
      console.log(\`\${status} \${row.token} - \${email}\`);
    });
    process.exit(0);
  });
"'
```

### Mark Token as Used
```bash
# This happens automatically when someone registers, but you can manually mark tokens as used:
ssh root@104.131.63.244 'cd /opt/tdil && node -e "
const db = require('./backend/config/database');
db.query('UPDATE invite_tokens SET is_used = true WHERE token = $1', ['TOKEN_HERE'])
  .then(() => console.log('Token marked as used'));
"'
```

## 🧪 Testing the Token System

### Test 1: Registration Without Token (Should Fail)
1. Visit: http://tdilapp.com/register
2. Fill out form but leave "Invite Code" empty
3. Submit - should show error "Invalid or missing invite token"

### Test 2: Registration With Valid Token (Should Succeed)
1. Create a test token:
```bash
curl -X POST http://tdilapp.com/api/invites/create \
  -H "Content-Type: application/json" \
  -d '{"email": null}'
```
2. Use the returned token in the registration form
3. Complete registration - should succeed

### Test 3: Reusing a Token (Should Fail)
1. Try to register another user with the same token
2. Should show error "This invite token has already been used"

## 🔑 Pre-Created Test Tokens

Here are some test tokens you can use immediately:

```
🟢 DEMO-TOKEN-123     - Any user can use
🟢 VIP-ACCESS-456     - For vip@tdilapp.com
🟢 GENERAL-INVITE     - Any user can use  
🟢 ADMIN-TOKEN-789    - For admin@tdilapp.com
🟢 TEST-USER-001      - For test@example.com
```

## 🚀 Quick Test Commands

### Create a Token and Test Registration
```bash
# 1. Create a token
TOKEN=$(curl -s -X POST http://tdilapp.com/api/invites/create \
  -H "Content-Type: application/json" \
  -d '{"email":null}' | jq -r '.token')

echo "Created token: $TOKEN"

# 2. Test registration with the token
curl -X POST http://tdilapp.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"email\": \"test@example.com\",
    \"password\": \"password123\",
    \"inviteToken\": \"$TOKEN\"
  }"
```

## 🔍 Troubleshooting

### Common Issues:

1. **"Route not found" error**: The invite routes may not be loaded. Check server logs:
   ```bash
   ssh root@104.131.63.244 'pm2 logs tdil --lines 20'
   ```

2. **Database connection errors**: Ensure the DATABASE_URL environment variable is set:
   ```bash
   ssh root@104.131.63.244 'echo $DATABASE_URL'
   ```

3. **Token validation not working**: Check the auth controller is properly validating tokens.

### Manual Database Operations:
```sql
-- Connect to database directly
\c your_database_name

-- View all tokens
SELECT * FROM invite_tokens;

-- Create a token manually
INSERT INTO invite_tokens (token, email) VALUES ('MANUAL-TOKEN-123', null);

-- Reset a token to unused
UPDATE invite_tokens SET is_used = false WHERE token = 'TOKEN_HERE';
```

## 📝 Production Usage

### For Admin Users:
1. Always create tokens before inviting new users
2. Monitor token usage regularly
3. Clean up unused expired tokens periodically
4. Keep track of who you've invited

### Security Best Practices:
- Generate cryptographically secure random tokens
- Set expiration dates for sensitive invites
- Regularly audit token usage
- Revoke unused tokens after reasonable time periods
- Use email-specific tokens for sensitive accounts

## 🎯 Integration with Frontend

The registration form expects the token in the "inviteToken" field. Make sure your frontend properly validates and sends this field.

Example frontend validation:
```javascript
if (!formData.inviteToken) {
  setError('Invite token is required');
  return;
}
```

---

## Support
If you encounter issues:
1. Check server logs: `pm2 logs tdil`
2. Verify database connectivity
3. Test with the pre-created tokens first
4. Check the auth controller implementation
