const express = require('express');
const router = express.Router();
const { query, isPostgreSQL } = require('../config/database');
const { protect } = require('../middleware/authMiddleware');

const p = (n) => isPostgreSQL ? `$${n}` : '?';

// Middleware: allow portal user types + admin/founder
const portalOnly = (req, res, next) => {
  const allowed = ['partner_school', 'employer', 'sponsor', 'admin', 'founder'];
  if (!allowed.includes(req.user?.userType)) {
    return res.status(403).json({ message: 'Access restricted to portal users.' });
  }
  next();
};

// Helper: get the company to filter by (admin can override via query param)
const getCompany = (req) => {
  const isAdmin = ['admin', 'founder'].includes(req.user?.userType);
  if (isAdmin && req.query.company) return req.query.company;
  return req.user?.company || '';
};

// GET /api/portal/me — return portal user info + their company context
router.get('/me', protect, portalOnly, async (req, res) => {
  try {
    const users = await query(
      `SELECT id, email, firstName, lastName, company, jobTitle, userType, profileImage
       FROM users WHERE id = ${p(1)}`,
      [req.user.id]
    );
    if (!users.length) return res.status(404).json({ message: 'User not found' });
    res.json({ user: users[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// GET /api/portal/stats — summary stats for this portal user's location/company
router.get('/stats', protect, portalOnly, async (req, res) => {
  try {
    const company = getCompany(req);
    if (!company) return res.json({ totalCheckins: 0, uniqueVisitors: 0, totalPointsAwarded: 0, thisWeek: 0, thisMonth: 0 });

    // Check-ins where location_name matches company (case-insensitive)
    const locationFilter = isPostgreSQL
      ? `LOWER(location_name) LIKE LOWER(${p(1)})`
      : `LOWER(location_name) LIKE LOWER(${p(1)})`;

    const pattern = `%${company}%`;

    const totalResult = await query(
      `SELECT COUNT(*) as count FROM checkins WHERE ${locationFilter}`,
      [pattern]
    );

    const uniqueResult = await query(
      `SELECT COUNT(DISTINCT user_id) as count FROM checkins WHERE ${locationFilter}`,
      [pattern]
    );

    const weekResult = await query(
      `SELECT COUNT(*) as count FROM checkins WHERE ${locationFilter}
       AND created_at >= ${isPostgreSQL ? "NOW() - INTERVAL '7 days'" : "datetime('now', '-7 days')"}`,
      [pattern]
    );

    const monthResult = await query(
      `SELECT COUNT(*) as count FROM checkins WHERE ${locationFilter}
       AND created_at >= ${isPostgreSQL ? "NOW() - INTERVAL '30 days'" : "datetime('now', '-30 days')"}`,
      [pattern]
    );

    const pointsResult = await query(
      `SELECT COALESCE(SUM(points_awarded), 0) as total FROM checkins WHERE ${locationFilter}`,
      [pattern]
    );

    res.json({
      totalCheckins: parseInt(totalResult[0]?.count || 0),
      uniqueVisitors: parseInt(uniqueResult[0]?.count || 0),
      thisWeek: parseInt(weekResult[0]?.count || 0),
      thisMonth: parseInt(monthResult[0]?.count || 0),
      totalPointsAwarded: parseInt(pointsResult[0]?.total || 0),
    });
  } catch (err) {
    console.error('Portal stats error:', err);
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// GET /api/portal/checkins — paginated check-in list for this location
router.get('/checkins', protect, portalOnly, async (req, res) => {
  try {
    const company = getCompany(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const pattern = `%${company}%`;

    if (!company) return res.json({ checkins: [], total: 0 });

    const checkins = await query(
      `SELECT c.id, c.user_id, c.location_name, c.points_awarded, c.created_at,
              u.firstName, u.lastName, u.profileImage, u.company as user_company, u.jobTitle
       FROM checkins c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE LOWER(c.location_name) LIKE LOWER(${p(1)})
       ORDER BY c.created_at DESC
       LIMIT ${p(2)} OFFSET ${p(3)}`,
      [pattern, limit, offset]
    );

    const totalResult = await query(
      `SELECT COUNT(*) as count FROM checkins WHERE LOWER(location_name) LIKE LOWER(${p(1)})`,
      [pattern]
    );

    res.json({
      checkins,
      total: parseInt(totalResult[0]?.count || 0),
      page,
      totalPages: Math.ceil(parseInt(totalResult[0]?.count || 0) / limit)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// GET /api/portal/top-visitors — top members by check-in count at this location
router.get('/top-visitors', protect, portalOnly, async (req, res) => {
  try {
    const company = getCompany(req);
    if (!company) return res.json([]);
    const pattern = `%${company}%`;

    const rows = await query(
      `SELECT u.id, u.firstName, u.lastName, u.profileImage, u.company as user_company,
              u.jobTitle, u.points,
              COUNT(c.id) as visit_count,
              COALESCE(SUM(c.points_awarded), 0) as points_earned_here,
              MAX(c.created_at) as last_visit
       FROM checkins c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE LOWER(c.location_name) LIKE LOWER(${p(1)})
       GROUP BY u.id, u.firstName, u.lastName, u.profileImage, u.company, u.jobTitle, u.points
       ORDER BY visit_count DESC
       LIMIT 10`,
      [pattern]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// GET /api/portal/checkin-trend — daily check-in counts for the past 30 days
router.get('/checkin-trend', protect, portalOnly, async (req, res) => {
  try {
    const company = getCompany(req);
    if (!company) return res.json([]);
    const pattern = `%${company}%`;

    let rows;
    if (isPostgreSQL) {
      rows = await query(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM checkins
         WHERE LOWER(location_name) LIKE LOWER(${p(1)})
           AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [pattern]
      );
    } else {
      rows = await query(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM checkins
         WHERE LOWER(location_name) LIKE LOWER(${p(1)})
           AND created_at >= datetime('now', '-30 days')
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [pattern]
      );
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// ─── School Profile GET/PUT ───────────────────────────────────────────────────

// GET /api/portal/school-profile  — return full school profile (editable fields)
router.get('/school-profile', protect, portalOnly, async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, email, firstName, lastName, company, jobTitle, bio, profileImage,
              calendly_url, resume_url,
              school_intro_video_url, school_zoom_url, school_contact_name,
              school_contact_email, school_materials_url, school_featured
       FROM users WHERE id = ${p(1)}`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json({ school: rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// PUT /api/portal/school-profile  — school updates their own profile
router.put('/school-profile', protect, portalOnly, async (req, res) => {
  try {
    const {
      bio, jobTitle, calendly_url, resume_url,
      school_intro_video_url, school_zoom_url,
      school_contact_name, school_contact_email, school_materials_url
    } = req.body;

    const updates = [];
    const vals = [];
    let i = 1;

    const addField = (col, val) => {
      if (val !== undefined) { updates.push(`${col} = ${p(i++)}`); vals.push(val || null); }
    };

    addField('bio',                   bio);
    addField('jobTitle',              jobTitle);
    addField('calendly_url',          calendly_url);
    addField('resume_url',            resume_url);
    addField('school_intro_video_url', school_intro_video_url);
    addField('school_zoom_url',        school_zoom_url);
    addField('school_contact_name',    school_contact_name);
    addField('school_contact_email',   school_contact_email);
    addField('school_materials_url',   school_materials_url);

    if (!updates.length) return res.status(400).json({ message: 'Nothing to update' });

    vals.push(req.user.id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ${p(i)}`, vals);

    const updated = await query(
      `SELECT id, company, bio, jobTitle, calendly_url, resume_url,
              school_intro_video_url, school_zoom_url, school_contact_name,
              school_contact_email, school_materials_url
       FROM users WHERE id = ${p(1)}`,
      [req.user.id]
    );
    res.json({ message: 'Profile updated', school: updated[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// GET /api/portal/all-schools  — public list of partner schools (for member PartnerSchools page)
// Joins org_profiles when available so the latest shared profile data is returned
router.get('/all-schools', async (req, res) => {
  try {
    const schools = await query(
      `SELECT u.id, u.email, u.firstName, u.lastName, u.company, u.jobTitle, u.bio,
              u.profileImage, u.calendly_url, u.resume_url, u.org_id,
              u.school_intro_video_url, u.school_zoom_url, u.school_contact_name,
              u.school_contact_email, u.school_materials_url, u.school_featured,
              o.name as org_name, o.description as org_description,
              o.website as org_website, o.linkedin_url as org_linkedin,
              o.contact_name as org_contact_name, o.contact_email as org_contact_email,
              o.calendly_url as org_calendly_url, o.zoom_url as org_zoom_url,
              o.materials_url as org_materials_url, o.intro_video_url as org_intro_video_url,
              o.logo_url, o.featured as org_featured
       FROM users u
       LEFT JOIN org_profiles o ON u.org_id = o.id
       WHERE u.userType = 'partner_school'
       ORDER BY COALESCE(o.featured, u.school_featured, 0) DESC, COALESCE(o.name, u.company) ASC`
    );
    // Merge org_profiles data over user-table data when available
    const merged = schools.map(s => ({
      ...s,
      company: s.org_name || s.company,
      bio: s.org_description || s.bio,
      school_intro_video_url: s.org_intro_video_url || s.school_intro_video_url,
      school_zoom_url: s.org_zoom_url || s.school_zoom_url,
      school_contact_name: s.org_contact_name || s.school_contact_name,
      school_contact_email: s.org_contact_email || s.school_contact_email,
      school_materials_url: s.org_materials_url || s.school_materials_url,
      calendly_url: s.org_calendly_url || s.calendly_url,
      school_featured: s.org_featured || s.school_featured,
      website: s.org_website,
      linkedin_url: s.org_linkedin,
    }));
    res.json(merged);
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// GET /api/portal/org-detail/:orgId  — public full org profile (school/sponsor/employer)
router.get('/org-detail/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    // Try org_profiles first
    const orgs = await query(`SELECT * FROM org_profiles WHERE id = ${p(1)}`, [orgId]);
    if (orgs.length) {
      // Get users linked to this org
      const users = await query(
        `SELECT id, firstName, lastName, email, jobTitle FROM users WHERE org_id = ${p(1)}`,
        [orgId]
      );
      return res.json({ org: orgs[0], users });
    }
    // Fallback: treat orgId as a user_id for old schools not yet linked to org_profiles
    const schoolUsers = await query(
      `SELECT id, email, firstName, lastName, company, jobTitle, bio, profileImage,
              calendly_url, school_intro_video_url, school_zoom_url, school_contact_name,
              school_contact_email, school_materials_url, school_featured, org_id
       FROM users WHERE id = ${p(1)} AND userType = 'partner_school'`,
      [orgId]
    );
    if (schoolUsers.length) {
      const u = schoolUsers[0];
      // Shape to look like an org_profile
      return res.json({
        org: {
          id: null,
          org_type: 'partner_school',
          name: u.company,
          description: u.bio,
          contact_name: u.school_contact_name,
          contact_email: u.school_contact_email,
          calendly_url: u.calendly_url,
          zoom_url: u.school_zoom_url,
          materials_url: u.school_materials_url,
          intro_video_url: u.school_intro_video_url,
          logo_url: u.profileImage,
          featured: u.school_featured,
          _user_id: u.id
        },
        users: [{ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, jobTitle: u.jobTitle }]
      });
    }
    res.status(404).json({ message: 'Profile not found' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// PUT /api/portal/admin/feature/:schoolId  — admin toggles featured flag for a school
router.put('/admin/feature/:schoolId', protect, async (req, res) => {
  try {
    const isAdmin = ['admin', 'founder'].includes(req.user?.userType);
    if (!isAdmin) return res.status(403).json({ message: 'Admin access required' });

    const { featured } = req.body;
    await query(
      `UPDATE users SET school_featured = ${p(1)} WHERE id = ${p(2)} AND userType = 'partner_school'`,
      [featured ? 1 : 0, req.params.schoolId]
    );
    res.json({ message: `School ${featured ? 'featured' : 'unfeatured'}` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// ─── Org Profile (school / sponsor / employer) ───────────────────────────────

// Helper: find or create org record for the current user
const getOrCreateOrg = async (user) => {
  // 1) If user already has org_id, return that org
  if (user.org_id) {
    const rows = await query(`SELECT * FROM org_profiles WHERE id = ${p(1)}`, [user.org_id]);
    if (rows.length) return rows[0];
  }
  // 2) Try to find by company name + type
  if (user.company) {
    const rows = await query(
      `SELECT * FROM org_profiles WHERE LOWER(name) = LOWER(${p(1)}) AND org_type = ${p(2)}`,
      [user.company, user.userType]
    );
    if (rows.length) {
      // Link user to found org
      await query(`UPDATE users SET org_id = ${p(1)} WHERE id = ${p(2)}`, [rows[0].id, user.id]);
      return rows[0];
    }
  }
  // 3) Create new org
  const name = user.company || `${user.firstName} ${user.lastName}`;
  await query(
    `INSERT INTO org_profiles (org_type, name, contact_name, contact_email)
     VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)})`,
    [user.userType, name, `${user.firstName} ${user.lastName}`, user.email]
  );
  const created = await query(
    `SELECT * FROM org_profiles WHERE LOWER(name)=LOWER(${p(1)}) AND org_type=${p(2)} ORDER BY id DESC LIMIT 1`,
    [name, user.userType]
  );
  if (created.length) {
    await query(`UPDATE users SET org_id = ${p(1)} WHERE id = ${p(2)}`, [created[0].id, user.id]);
    return created[0];
  }
  return null;
};

// GET /api/portal/org-profile
router.get('/org-profile', protect, portalOnly, async (req, res) => {
  try {
    const userRows = await query(
      `SELECT id, email, firstName, lastName, company, jobTitle, userType, org_id FROM users WHERE id = ${p(1)}`,
      [req.user.id]
    );
    if (!userRows.length) return res.status(404).json({ message: 'User not found' });
    const user = userRows[0];
    const org = await getOrCreateOrg(user);
    res.json({ org: org || null });
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// PUT /api/portal/org-profile
router.put('/org-profile', protect, portalOnly, async (req, res) => {
  try {
    const userRows = await query(
      `SELECT id, email, firstName, lastName, company, jobTitle, userType, org_id FROM users WHERE id = ${p(1)}`,
      [req.user.id]
    );
    if (!userRows.length) return res.status(404).json({ message: 'User not found' });
    const user = userRows[0];
    const org = await getOrCreateOrg(user);
    if (!org) return res.status(500).json({ message: 'Could not create org profile' });

    const allowed = ['name','description','website','linkedin_url','logo_url',
                     'contact_name','contact_email','phone',
                     'calendly_url','zoom_url','materials_url','intro_video_url','featured'];
    const updates = [];
    const vals = [];
    let i = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = ${p(i++)}`);
        vals.push(req.body[key] ?? null);
      }
    }
    if (!updates.length) return res.status(400).json({ message: 'Nothing to update' });

    vals.push(org.id);
    await query(
      `UPDATE org_profiles SET ${updates.join(', ')}, updated_at = ${isPostgreSQL ? 'NOW()' : "datetime('now')"} WHERE id = ${p(i)}`,
      vals
    );

    // Also sync company name back to user record if name changed
    if (req.body.name && req.body.name !== user.company) {
      await query(`UPDATE users SET company = ${p(1)} WHERE org_id = ${p(2)}`, [req.body.name, org.id]);
    }

    const updated = await query(`SELECT * FROM org_profiles WHERE id = ${p(1)}`, [org.id]);
    res.json({ message: 'Profile updated', org: updated[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// GET /api/portal/all-orgs?type=partner_school|sponsor|employer  (public)
router.get('/all-orgs', async (req, res) => {
  try {
    const { type } = req.query;
    const rows = type
      ? await query(`SELECT * FROM org_profiles WHERE org_type = ${p(1)} ORDER BY featured DESC, name ASC`, [type])
      : await query(`SELECT * FROM org_profiles ORDER BY org_type, featured DESC, name ASC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// ─── Admin: manage org profiles & create org users ───────────────────────────

// GET /api/portal/admin/orgs
router.get('/admin/orgs', protect, async (req, res) => {
  try {
    if (!['admin','founder'].includes(req.user?.userType)) return res.status(403).json({ message: 'Admin only' });
    const rows = await query(`SELECT o.*, COUNT(u.id) as user_count
      FROM org_profiles o LEFT JOIN users u ON u.org_id = o.id
      GROUP BY o.id ORDER BY o.org_type, o.name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// POST /api/portal/admin/orgs — admin creates a new org profile
router.post('/admin/orgs', protect, async (req, res) => {
  try {
    if (!['admin','founder'].includes(req.user?.userType)) return res.status(403).json({ message: 'Admin only' });
    const { org_type, name, description, website, linkedin_url, contact_name, contact_email, phone } = req.body;
    if (!org_type || !name) return res.status(400).json({ message: 'org_type and name required' });
    await query(
      `INSERT INTO org_profiles (org_type, name, description, website, linkedin_url, contact_name, contact_email, phone)
       VALUES (${p(1)},${p(2)},${p(3)},${p(4)},${p(5)},${p(6)},${p(7)},${p(8)})`,
      [org_type, name, description||null, website||null, linkedin_url||null, contact_name||null, contact_email||null, phone||null]
    );
    const created = await query(
      `SELECT * FROM org_profiles WHERE name=${p(1)} AND org_type=${p(2)} ORDER BY id DESC LIMIT 1`,
      [name, org_type]
    );
    res.json({ message: 'Org created', org: created[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// POST /api/portal/admin/create-org-user — admin creates a user account for a school/sponsor/employer
router.post('/admin/create-org-user', protect, async (req, res) => {
  try {
    if (!['admin','founder'].includes(req.user?.userType)) return res.status(403).json({ message: 'Admin only' });
    const { email, firstName, lastName, password, userType, org_id, company, jobTitle } = req.body;
    if (!email || !firstName || !lastName || !password || !userType) {
      return res.status(400).json({ message: 'email, firstName, lastName, password, userType required' });
    }
    const allowed = ['partner_school','sponsor','employer','member','admin'];
    if (!allowed.includes(userType)) return res.status(400).json({ message: 'Invalid userType' });

    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);

    const existing = await query(`SELECT id FROM users WHERE LOWER(email)=LOWER(${p(1)})`, [email]);
    if (existing.length) return res.status(409).json({ message: 'Email already in use' });

    await query(
      `INSERT INTO users (email, firstName, lastName, password, userType, company, jobTitle, org_id, isActive, emailVerified)
       VALUES (${p(1)},${p(2)},${p(3)},${p(4)},${p(5)},${p(6)},${p(7)},${p(8)},1,1)`,
      [email, firstName, lastName, hash, userType, company||null, jobTitle||null, org_id||null]
    );
    const user = await query(
      `SELECT id, email, firstName, lastName, userType, company, org_id FROM users WHERE LOWER(email)=LOWER(${p(1)})`,
      [email]
    );
    res.json({ message: 'User created', user: user[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

module.exports = router;
