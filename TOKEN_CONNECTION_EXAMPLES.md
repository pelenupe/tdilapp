# 🔗 Token-to-User Connection Examples

## ✅ Yes! Tokens CAN be connected to specific users and emails

The invite token system supports multiple connection types:

## 🎯 Connection Types Available:

### 1. **Email-Specific Tokens** (Most Restrictive)
```sql
INSERT INTO invite_tokens (token, email) 
VALUES ('EMAIL-SPECIFIC-ABC123', 'john.doe@company.com');
```
- **Usage**: Only `john.doe@company.com` can use this token
- **Validation**: System checks if registration email matches token email
- **Perfect for**: Personal invitations to specific individuals

### 2. **Admin-Tracked Tokens**
```sql
INSERT INTO invite_tokens (token, email, created_by) 
VALUES ('ADMIN-CREATED-XYZ789', 'newmember@company.com', 'uuid-of-admin-user');
```
- **Usage**: Track which admin/user created the token
- **Perfect for**: Accountability and audit trails

### 3. **Expiring Tokens**
```sql
INSERT INTO invite_tokens (token, email, expires_at) 
VALUES ('EXPIRES-DEF456', 'temp@company.com', '2025-11-01 00:00:00');
```
- **Usage**: Token automatically expires after specified date
- **Perfect for**: Temporary access, trial periods

### 4. **Usage-Tracked Tokens**
```sql
-- After user registers, system automatically updates:
UPDATE invite_tokens 
SET is_used = true, used_by = 'uuid-of-new-user' 
WHERE token = 'TOKEN-ABC123';
```
- **Usage**: Track exactly who used each token
- **Perfect for**: Complete audit trail

### 5. **General Tokens** (Least Restrictive)
```sql
INSERT INTO invite_tokens (token, email) 
VALUES ('GENERAL-INVITE', null);
```
- **Usage**: Any email can use this token
- **Perfect for**: Open registration periods, general invites

## 🔍 How Token Validation Works:

```javascript
// From authController.js - Registration validation
if (inviteTokenData.email && inviteTokenData.email.toLowerCase() !== email.toLowerCase()) {
  return res.status(400).json({ 
    message: 'This invite token is associated with a different email address.' 
  });
}
```

## 📊 Database Schema Fields:

```sql
CREATE TABLE invite_tokens (
  id UUID PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,     -- The actual token
  email VARCHAR(255),                     -- Specific email restriction
  created_by UUID REFERENCES users(id),  -- Who created the token
  used_by UUID REFERENCES users(id),     -- Who used the token
  is_used BOOLEAN DEFAULT FALSE,         -- Usage status
  expires_at TIMESTAMP WITH TIME ZONE,   -- Expiration date
  created_at TIMESTAMP DEFAULT NOW(),    -- When created
  updated_at TIMESTAMP DEFAULT NOW()     -- Last updated
);
```

## 🚀 Practical Examples:

### Create Email-Specific Token:
```bash
ssh root@104.131.63.244 'cd /opt/tdil && node -e "
const db = require('./backend/config/database');
db.query('INSERT INTO invite_tokens (token, email) VALUES ($1, $2)', 
  ['VIP-MEMBER-2025', 'ceo@company.com'])
  .then(() => console.log('Created VIP token for CEO'));
"'
```

### Create Expiring Token:
```bash
ssh root@104.131.63.244 'cd /opt/tdil && node -e "
const db = require('./backend/config/database');
const expires = new Date('2025-12-31');
db.query('INSERT INTO invite_tokens (token, email, expires_at) VALUES ($1, $2, $3)', 
  ['TRIAL-USER-123', 'trial@company.com', expires])
  .then(() => console.log('Created trial token expiring Dec 31, 2025'));
"'
```

### View All Token Connections:
```bash
ssh root@104.131.63.244 'cd /opt/tdil && node -e "
const db = require('./backend/config/database');
db.query('SELECT token, email, is_used, created_at, expires_at FROM invite_tokens')
  .then(result => {
    console.log('Token Connections:');
    result.rows.forEach(row => {
      const status = row.is_used ? 'USED' : 'AVAILABLE';
      const email = row.email || 'Any user';
      const expires = row.expires_at ? \` (expires \${row.expires_at.toDateString()})\` : '';
      console.log(\`\${status}: \${row.token} → \${email}\${expires}\`);
    });
  });
"'
```

## 🎯 Use Cases:

1. **VIP Members**: `VIP-ACCESS-789` → `founder@startup.com`
2. **Department Specific**: `MARKETING-TEAM` → `marketing@company.com`
3. **Event Attendees**: `CONFERENCE-2025` → `attendee@event.com` (expires after event)
4. **Trial Users**: `TRIAL-30DAY` → `trial@company.com` (expires in 30 days)
5. **Partner Companies**: `PARTNER-ACME` → `contact@acmecorp.com`

## 🔒 Security Benefits:

- **Email Validation**: Prevents token sharing between different email addresses
- **Expiration Control**: Tokens can't be used indefinitely
- **Usage Tracking**: Full audit trail of who created and used each token
- **Admin Accountability**: Track which admin created which invitations
- **Controlled Access**: Precise control over who can register

The system provides **complete flexibility** from wide-open general tokens to highly restricted email-specific expiring tokens with full audit trails!
