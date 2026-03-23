# CRITICAL PRODUCTION DEPLOYMENT - NUMERIC ID FIX

**Status:** All numeric profile ID references have been eliminated from code. BUT the database slugs need to be fixed.

---

## THE PROBLEM

The migrations that created the `slug` columns did NOT use the same normalization logic as the frontend/backend code. This causes a mismatch:

- **Migration logic**: Simple `LOWER(firstname || '-' || lastname)` 
- **App logic**: Proper Unicode normalization with diacritics removal (NFD)

Result: Profile URLs like `/profile/john-smith` work, but `/profile/João-Nascimento` would fail to find the user because the slug in the database is different from what the app generates.

---

## DEPLOYMENT STEPS

### Step 1: Deploy Code to Digital Ocean

```bash
ssh root@104.131.63.244 'cd /opt/tdil-prod && git pull origin main && cd tdil-frontend && npm run build && cd .. && pm2 restart tdil-api'
```

### Step 2: Regenerate ALL User Slugs with Proper Normalization

```bash
ssh root@104.131.63.244 'cd /opt/tdil-prod && node scripts/fix-user-slugs.js'
```

**Expected Output:**
```
🔄 Fixing ALL user slugs with proper normalization...
Found XXX users to process
✅ Fixed 100/XXX users
✅ COMPLETE: Fixed XXX user slugs, skipped 0
All users now have slugs matching the frontend/backend logic!
```

### Step 3: Regenerate ALL Organization Slugs with Proper Normalization

```bash
ssh root@104.131.63.244 'cd /opt/tdil-prod && node scripts/fix-org-slugs.js'
```

**Expected Output:**
```
🔄 Fixing ALL org_profiles slugs with proper normalization...
Found XXX organizations to process
✅ COMPLETE: Fixed XXX org slugs, skipped 0
All organizations now have slugs matching the frontend/backend logic!
```

### Step 4: Restart the Application

```bash
ssh root@104.131.63.244 'cd /opt/tdil-prod && pm2 restart tdil-api'
```

### Step 5: Verify No Numeric Profile URLs

Test these URLs in your browser - they should all load the correct profiles:

1. **Member profile (slug format):**
   - `https://tdilapp.com/profile/firstname-lastname`
   - Should load member's full profile page

2. **Organization profile (slug format):**
   - `https://tdilapp.com/org/school-name`
   - Should load organization profile

3. **Test in Dashboard, Directory, Leaderboard:**
   - Click member avatar/name
   - Should navigate to `/profile/firstname-lastname` (NOT numeric ID)
   - URL should update before page loads

4. **Test in PartnerSchools:**
   - Click school card
   - Should navigate to `/org/school-slug-name` (NOT numeric ID)

---

## WHAT WAS FIXED

### Code Changes (4 commits)
1. **badd2e2**: Initial slug implementation in backend/frontend
2. **7a45038**: Eliminated all numeric ID profile links from pages
3. **8dfacd8**: Fixed email notifications and GroupChat sender links
4. **61c607a**: Added critical slug normalization scripts

### Frontend Files
- ✅ Dashboard.jsx - activity feed links use `activity.userSlug`
- ✅ Directory.jsx - member card links use `getMemberSlug()`
- ✅ Community.jsx - member links use `getMemberSlug()`
- ✅ Leaderboard.jsx - rank links use `getMemberSlug()`
- ✅ MyCohort.jsx - member navigation uses `slugify()`
- ✅ AdminDashboard.jsx - admin user links use `getMemberSlug()`
- ✅ PartnerSchools.jsx - org links use `getOrgSlug()`
- ✅ GroupChats.jsx - message sender clicks use `slugify()`

### Backend Files
- ✅ memberController.js - getProfile accepts numeric ID or slug
- ✅ pointsController.js - leaderboard includes slug field
- ✅ activityRoutes.js - all activity endpoints return `userSlug`
- ✅ portalRoutes.js - org profiles support numeric ID or slug lookup
- ✅ emailService.js - connection emails use `fromSlug` in URLs
- ✅ connectionController.js - passes slug to email function

### Database
- ✅ Migration 016: Added slug column and index to users table
- ✅ Migration 015: Added slug column and index to org_profiles table
- ✅ fix-user-slugs.js: Properly regenerates ALL user slugs
- ✅ fix-org-slugs.js: Properly regenerates ALL org slugs

---

## VERIFICATION CHECKLIST

After deployment, verify these:

- [ ] No `/profile/\d+` URLs appear in browser history or network logs
- [ ] All profile links are `/profile/{firstName-lastName}`
- [ ] All org links are `/org/{school-name}`
- [ ] Dashboard activity feed links use slug format
- [ ] GroupChat message sender names are clickable (navigate to slug profile)
- [ ] Email notifications contain slug URLs (not numeric IDs)
- [ ] Admin users can view slug-based profile links
- [ ] Leaderboard rank clicks use slug URLs
- [ ] Partner school directory shows slug-based profile links

---

## Rollback (if needed)

If something goes wrong:

```bash
# Rollback to previous commit
ssh root@104.131.63.244 'cd /opt/tdil-prod && git reset --hard 8dfacd8 && git pull origin 8dfacd8 && cd tdil-frontend && npm run build && cd .. && pm2 restart tdil-api'
```

---

## PRODUCTION SERVER INFO

- **IP**: 104.131.63.244  
- **App Path**: /opt/tdil-prod
- **URL**: https://tdilapp.com
- **Process Manager**: PM2 (process name: tdil-api)
- **Database**: PostgreSQL (on same droplet)

---

**Status: Ready for deployment** ✅
