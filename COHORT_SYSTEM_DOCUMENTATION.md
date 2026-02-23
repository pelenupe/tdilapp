# Cohort & Group Chat System - Complete Documentation

## Overview
This document describes the comprehensive cohort, group chat, and analytics system implemented for tDIL. This feature allows members to be organized into cohorts based on their alma mater and graduation year, with dedicated group chats, event scheduling, and analytics for partner schools and sponsors.

## Backend Implementation Status: ✅ COMPLETE

### Database Schema (Migration 005)

#### New Tables Created:
1. **cohorts** - Groups of users from same school/year
2. **cohort_members** - Many-to-many relationship
3. **group_chats** - Chat rooms (cohort, direct, custom)
4. **group_chat_members** - Chat membership
5. **group_messages** - Chat messages
6. **cohort_events** - Events/meetups scheduled by cohorts
7. **cohort_event_attendees** - Event registration
8. **location_checkins** - Check-in tracking for analytics
9. **partner_connections** - Track connections to partners/sponsors

#### New User Fields:
- `alma_mater` - School name
- `graduation_year` - Graduation year
- `cohort_id` - Reference to cohort

#### Analytics Views:
- `partner_school_analytics` - Real-time partner school metrics
- `sponsor_analytics` - Real-time sponsor metrics
- `cohort_summary` - Cohort statistics

### Controllers Implemented

#### 1. CohortController (`backend/controllers/cohortController.js`)
- `getOrCreateCohort()` - Auto-create cohorts
- `addUserToCohort()` - Add members
- `getUserCohort()` - Get user's cohort
- `getCohortMembers()` - List members
- `getAllCohorts()` - List all cohorts
- `createCohortEvent()` - Schedule meetups
- `getCohortEvents()` - List events
- `registerForEvent()` - RSVP to events
- `autoAssignCohort()` - Auto-assign on registration

#### 2. GroupChatController (`backend/controllers/groupChatController.js`)
- `getUserGroupChats()` - List user's chats
- `getGroupChatMessages()` - Get messages with pagination
- `sendGroupMessage()` - Send message
- `createGroupChat()` - Create custom group
- `addMemberToChat()` - Add members
- `getGroupChatMembers()` - List members
- `leaveGroupChat()` - Leave chat
- `getOrCreateDirectChat()` - 1-on-1 messaging

#### 3. AnalyticsController (`backend/controllers/analyticsController.js`)
- `getPartnerSchoolAnalytics()` - Partner school dashboard data
- `getSponsorAnalytics()` - Sponsor dashboard data
- `recordCheckIn()` - Log location check-ins
- `createPartnerConnection()` - Track connections
- `autoConnectAlmaMater()` - Auto-connect to alma mater
- `getAdminAnalytics()` - System-wide analytics

### API Routes

#### Cohorts (`/api/cohorts`)
```
GET    /my-cohort              - Get user's cohort
GET    /                       - List all cohorts
GET    /:cohortId/members      - List cohort members
POST   /add-member             - Add user to cohort
POST   /events                 - Create cohort event
GET    /:cohortId/events       - List cohort events
POST   /events/:eventId/register - Register for event
```

#### Group Chats (`/api/chats`)
```
GET    /                       - List user's chats
POST   /                       - Create custom group chat
POST   /direct                 - Get/create direct chat
GET    /:chatId/messages       - Get messages
POST   /:chatId/messages       - Send message
GET    /:chatId/members        - List chat members
POST   /:chatId/members        - Add member to chat
DELETE /:chatId/leave          - Leave chat
```

#### Analytics (`/api/analytics`)
```
GET    /partner-school         - Partner school analytics
GET    /sponsor                - Sponsor analytics
GET    /admin                  - Admin system analytics
POST   /checkin                - Record location check-in
```

## Key Features

### 1. Automatic Cohort Assignment
When a user registers or updates their profile with alma mater and graduation year:
- System finds or creates cohort: "School Name - Class of YYYY"
- User is automatically added to cohort
- User gains access to cohort group chat
- If alma mater matches a partner school, auto-connects

### 2. Group Chat Types
- **Cohort Chats**: Automatic for each cohort, can't leave
- **Direct Chats**: 1-on-1 messaging between users
- **Custom Chats**: Create groups with any members

### 3. Cohort Events/Meetups
- Members can schedule events for their cohort
- Events posted to cohort chat automatically
- RSVP tracking
- Supports in-person, virtual, and hybrid events

### 4. Partner School Analytics Dashboard
Shows:
- Total connections (all + alumni-specific)
- Check-in statistics (all-time, 30-day, 7-day)
- Total alumni count
- Recent check-ins with user details
- Connected alumni list
- Alumni breakdown by graduation year

### 5. Sponsor Analytics Dashboard
Shows:
- Total connections
- Check-in statistics (today, 7-day, 30-day)
- Recent check-ins with user details
- Connected members list
- Check-ins by day (30-day chart)

### 6. Location Check-ins
- Members can check in at partner schools/sponsors
- Awards 10 points per check-in
- Tracked for analytics
- Supports GPS coordinates

## Frontend Implementation Needed

### Priority 1: Core Cohort Features

#### 1. Update Registration/Profile
**Files**: 
- `tdil-frontend/src/pages/Register.jsx`
- `tdil-frontend/src/pages/Profile.jsx`

**Changes**:
```jsx
// Add to registration form
<input name="alma_mater" placeholder="Alma Mater" />
<input name="graduation_year" type="number" placeholder="Graduation Year" />

// Update API call to include these fields
const response = await API.post('/auth/register', {
  ...formData,
  almaMater,
  graduationYear
});
```

#### 2. Create Cohort Page
**File**: `tdil-frontend/src/pages/MyCohort.jsx`

**Features**:
- Display cohort name and info
- List cohort members (with avatars, points, levels)
- Show upcoming cohort events
- Button to create new event
- Link to cohort group chat

**API Calls**:
```javascript
// Get cohort
const cohort = await API.get('/cohorts/my-cohort');

// Get members
const members = await API.get(`/cohorts/${cohort.id}/members`);

// Get events
const events = await API.get(`/cohorts/${cohort.id}/events`);
```

#### 3. Create Group Chat Interface
**File**: `tdil-frontend/src/pages/GroupChats.jsx`

**Components**:
- Chat list sidebar (shows all chats with unread counts)
- Message area (scrollable, real-time)
- Message input box
- Member list

**Features**:
- Real-time messaging (could integrate with existing Socket.IO)
- Unread message indicators
- Create new custom groups
- Direct message any user

**API Calls**:
```javascript
// Get chats
const chats = await API.get('/chats');

// Get messages
const messages = await API.get(`/chats/${chatId}/messages`);

// Send message
await API.post(`/chats/${chatId}/messages`, { content, messageType: 'text' });
```

### Priority 2: Partner/Sponsor Dashboards

#### 4. Partner School Dashboard
**File**: `tdil-frontend/src/pages/PartnerSchoolDashboard.jsx`

**Sections**:
- Summary cards (total connections, alumni, check-ins)
- Alumni by year chart
- Recent check-ins table
- Connected alumni list

**API Call**:
```javascript
const analytics = await API.get('/analytics/partner-school');
```

#### 5. Sponsor Dashboard
**File**: `tdil-frontend/src/pages/SponsorDashboard.jsx`

**Sections**:
- Summary cards (connections, check-ins)
- Check-ins trend chart (30 days)
- Recent check-ins table
- Connected members list

**API Call**:
```javascript
const analytics = await API.get('/analytics/sponsor');
```

### Priority 3: Event Features

#### 6. Cohort Event Creation
**Component**: Modal or Page for event creation

**Fields**:
- Title, Description
- Date/Time
- Location (or Virtual link)
- Location Type (in-person/virtual/hybrid)
- Max Attendees

**API Call**:
```javascript
await API.post('/cohorts/events', {
  cohortId,
  title,
  description,
  eventDate,
  location,
  locationType,
  maxAttendees
});
```

#### 7. Check-in Feature
**Component**: Check-in button/modal on partner school/sponsor profiles

**API Call**:
```javascript
await API.post('/analytics/checkin', {
  locationName: 'School/Sponsor Name',
  locationType: 'partner_school' | 'sponsor',
  partnerId,
  latitude,
  longitude
});
```

### Navigation Updates

Add to sidebar/navigation:
```jsx
<Link to="/my-cohort">My Cohort</Link>
<Link to="/chats">Group Chats</Link>
{user.userType === 'partner_school' && (
  <Link to="/analytics/school">Analytics</Link>
)}
{user.userType === 'sponsor' && (
  <Link to="/analytics/sponsor">Analytics</Link>
)}
```

## Auto-Connection Logic

### When User Registers/Updates Profile:
1. If `alma_mater` provided:
   - Find or create cohort
   - Add user to cohort
   - Add user to cohort group chat
   - Check if partner school exists with matching name
   - If found, auto-connect user to partner school
   - Create `partner_connection` record

### Registration Flow Update Needed:
```javascript
// In authController.js register function
const { almaMater, graduationYear, ...rest } = userData;

// Create user
const newUser = await createUser(rest);

// Auto-assign cohort
if (almaMater && graduationYear) {
  await autoAssignCohort(newUser.id, almaMater, graduationYear);
  await autoConnectAlmaMater(newUser.id, almaMater);
}
```

## Testing Checklist

### Backend (Already Complete ✅)
- [x] Database migration runs successfully
- [x] All API endpoints return correct data
- [x] Cohort auto-creation works
- [x] Group chat creation works
- [x] Analytics queries return data
- [x] Check-in records properly

### Frontend (To Be Implemented)
- [ ] Registration includes alma mater fields
- [ ] Profile shows cohort information
- [ ] My Cohort page displays correctly
- [ ] Group chat interface works
- [ ] Can send/receive messages
- [ ] Can create cohort events
- [ ] Can RSVP to events
- [ ] Partner school dashboard shows analytics
- [ ] Sponsor dashboard shows analytics
- [ ] Check-in awards points
- [ ] Auto-connection to alma mater works

## Deployment Steps

1. **Database Migration**:
   ```bash
   npm run migrate
   ```

2. **Restart Backend**:
   ```bash
   pm2 restart tdil
   ```

3. **Build Frontend** (after implementing UI):
   ```bash
   cd tdil-frontend
   npm run build
   cp -r dist/* /var/www/tdilapp/
   ```

## Next Steps

### Immediate (Backend Complete ✅):
1. ✅ Database schema created
2. ✅ Controllers implemented
3. ✅ Routes configured
4. ✅ Server.js updated

### Short Term (Frontend Implementation):
1. Update registration to collect alma mater
2. Build My Cohort page
3. Build Group Chat interface
4. Add partner/sponsor dashboards

### Long Term (Enhancements):
1. Real-time chat with Socket.IO
2. Push notifications for new messages
3. File/image sharing in chats
4. Event calendar view
5. Advanced analytics charts
6. Mobile app integration

## API Response Examples

### Get My Cohort
```json
{
  "id": 1,
  "name": "Harvard University - Class of 2020",
  "school_name": "Harvard University",
  "graduation_year": 2020,
  "member_count": 45,
  "description": "...",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Get Group Chats
```json
[
  {
    "id": 1,
    "name": "Harvard University - Class of 2020",
    "chat_type": "cohort",
    "member_count": 45,
    "last_message": "Hey everyone!",
    "last_message_at": "2024-01-15T10:30:00Z",
    "unread_count": 3
  }
]
```

### Partner School Analytics
```json
{
  "summary": {
    "total_connections": 150,
    "alumni_connections": 120,
    "total_checkins": 450,
    "checkins_last_30_days": 45,
    "total_alumni": 200
  },
  "recentCheckins": [...],
  "connectedAlumni": [...],
  "alumniByYear": [...]
}
```

## Support

For questions or issues with this system:
1. Check this documentation
2. Review API response examples
3. Test endpoints with Postman/curl
4. Check server logs for errors

---

**Status**: Backend Complete ✅ | Frontend In Progress ⏳
**Last Updated**: 2026-02-20
**Version**: 1.0.0
