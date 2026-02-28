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
router.get('/all-schools', async (req, res) => {
  try {
    const schools = await query(
      `SELECT id, email, firstName, lastName, company, jobTitle, bio, profileImage,
              calendly_url, resume_url,
              school_intro_video_url, school_zoom_url, school_contact_name,
              school_contact_email, school_materials_url, school_featured
       FROM users
       WHERE userType = 'partner_school'
       ORDER BY school_featured DESC, company ASC`
    );
    res.json(schools);
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

module.exports = router;
