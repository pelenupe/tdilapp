# tDIL Points System - Admin Administration Guide

## Overview
The tDIL platform uses a comprehensive points-based gamification system to drive user engagement. This guide explains how to administer and monitor the system.

## Points Configuration

### Current Point Values (Configurable)
```javascript
CONNECTION: 50         // Connecting with another member
PROFILE_COMPLETE: 100  // Completing profile information
EVENT_ATTENDANCE: 75   // Attending platform events
JOB_APPLICATION: 25    // Applying to jobs
COMMUNITY_POST: 20     // Posting in community
PROFILE_VIEW: 5        // Viewing other profiles
LOGIN_STREAK: 15       // Daily login streaks
REFERRAL: 100          // Referring new members
REVIEW_SUBMITTED: 30   // Submitting reviews
```

### Level System
```javascript
Level 1 (Bronze):   0-499 points
Level 2 (Silver):   500-999 points
Level 3 (Gold):     1000-2499 points
Level 4 (Platinum): 2500-4999 points
Level 5 (Diamond):  5000-9999 points
Level 6 (Master):   10000+ points
```

## Admin API Endpoints

### 1. Award Points Manually
**Endpoint:** `POST /api/points/award`
**Admin Only:** Yes
**Purpose:** Manually award points to users for special activities

```bash
curl -X POST http://localhost:5001/api/points/award \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -d '{
    "userId": 123,
    "points": 200,
    "reason": "Winner of monthly contest"
  }'
```

### 2. View Points Configuration
**Endpoint:** `GET /api/points/config`
**Admin Only:** Yes
**Purpose:** View current point values and level thresholds

```bash
curl -X GET http://localhost:5001/api/points/config \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

### 3. Points System Statistics
**Endpoint:** `GET /api/points/stats`
**Admin Only:** Yes
**Purpose:** View comprehensive statistics about points usage

```bash
curl -X GET http://localhost:5001/api/points/stats \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

**Returns:**
- Total users and points awarded
- Average points per user
- Points activity by time period
- Level distribution
- Activity type breakdown

### 4. View Leaderboard
**Endpoint:** `GET /api/points/leaderboard?limit=50`
**Public:** Yes (but requires authentication)
**Purpose:** View top-scoring users

## Database Management

### Key Tables
1. **users** - Stores user points and levels
2. **points_history** - Complete audit trail of all point transactions
3. **connections** - User connections (awards points automatically)

### SQL Queries for Admin Tasks

#### View Top Users
```sql
SELECT firstName, lastName, points, level 
FROM users 
WHERE userType = 'member' 
ORDER BY points DESC 
LIMIT 20;
```

#### Points Activity This Month
```sql
SELECT activity_type, COUNT(*) as count, SUM(points) as total_points
FROM points_history 
WHERE created_at >= datetime('now', '-30 days')
GROUP BY activity_type 
ORDER BY total_points DESC;
```

#### User Points History
```sql
SELECT u.firstName, u.lastName, ph.points, ph.activity_type, ph.description, ph.created_at
FROM points_history ph
JOIN users u ON ph.user_id = u.id
WHERE ph.user_id = 123
ORDER BY ph.created_at DESC;
```

#### Bulk Points Update (Use Carefully)
```sql
-- Add bonus points to all active users
UPDATE users SET points = points + 100 
WHERE userType = 'member' AND is_active = 1;

-- Log the bulk update
INSERT INTO points_history (user_id, points, activity_type, description, created_at)
SELECT id, 100, 'MANUAL_AWARD', 'Holiday bonus - Admin bulk award', datetime('now')
FROM users WHERE userType = 'member' AND is_active = 1;
```

## Monitoring & Analytics

### Key Metrics to Track
1. **Engagement Rate** - % of users earning points daily/weekly
2. **Point Distribution** - Ensure healthy spread across activities
3. **Level Progression** - Monitor users advancing through levels
4. **Connection Growth** - Track network effect from connection points

### Daily Admin Checklist
- [ ] Review points statistics dashboard
- [ ] Check for any unusual point spikes or drops
- [ ] Monitor user level distribution
- [ ] Review recent high-value point awards

### Weekly Admin Tasks
- [ ] Analyze points activity trends
- [ ] Identify top contributors for recognition
- [ ] Review and adjust point values if needed
- [ ] Plan special point award campaigns

## Common Admin Tasks

### 1. Adjust Point Values
Edit `/backend/controllers/pointsController.js`:
```javascript
const POINT_VALUES = {
  CONNECTION: 75,        // Increased from 50
  PROFILE_COMPLETE: 150, // Increased from 100
  // ... other values
};
```

### 2. Create Special Events
Use the manual award endpoint to give bonus points:
```bash
# Award all users bonus points for a special event
# (Requires individual API calls or database update)
```

### 3. Level Adjustments
Modify level thresholds in the controller:
```javascript
const LEVEL_THRESHOLDS = [
  { level: 1, minPoints: 0, name: 'Bronze', color: '#CD7F32' },
  { level: 2, minPoints: 750, name: 'Silver', color: '#C0C0C0' }, // Increased
  // ... etc
];
```

### 4. Troubleshooting Point Issues
```sql
-- Find users with negative points (shouldn't happen)
SELECT * FROM users WHERE points < 0;

-- Find orphaned point history records
SELECT ph.* FROM points_history ph
LEFT JOIN users u ON ph.user_id = u.id
WHERE u.id IS NULL;

-- Recalculate user level based on points
UPDATE users SET level = (
  CASE 
    WHEN points >= 10000 THEN 6
    WHEN points >= 5000 THEN 5
    WHEN points >= 2500 THEN 4
    WHEN points >= 1000 THEN 3
    WHEN points >= 500 THEN 2
    ELSE 1
  END
) WHERE userType = 'member';
```

## Security Considerations

1. **Admin-Only Endpoints**: Ensure only admin users can access point management
2. **Rate Limiting**: Point award endpoints should be rate-limited
3. **Audit Trail**: All point changes are logged in points_history
4. **Data Validation**: Validate point amounts and reasons
5. **Backup Strategy**: Regular backups of points and user data

## Future Enhancements

### Planned Features
- [ ] Automated point decay for inactive users
- [ ] Seasonal point multipliers
- [ ] Achievement badges system
- [ ] Point redemption for real rewards
- [ ] Leaderboard competitions

### Integration Opportunities
- [ ] Email notifications for level-ups
- [ ] Slack/Discord bot for point announcements
- [ ] Analytics dashboard for real-time monitoring
- [ ] API webhooks for external integrations

## Support & Maintenance

### Regular Maintenance Tasks
- Database cleanup of old point history records
- Performance optimization of leaderboard queries
- User level recalculation verification
- Points system performance monitoring

### Emergency Procedures
1. **Points System Outage**: Disable point-earning activities
2. **Data Corruption**: Restore from backup and recalculate
3. **Exploit Detection**: Immediate point freezing and investigation

---

**Last Updated:** November 2024
**Version:** 1.0
**Contact:** admin@tdil.com
