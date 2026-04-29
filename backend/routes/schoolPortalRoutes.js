// School Portal API - /api/school-portal/*
//
// Dedicated, external-facing API for participating school portals.
// Schools authenticate with their existing TDIL credentials (JWT Bearer) or
// with a per-school API key (X-API-Key header).
//
// All data is automatically scoped to the authenticated school's organisation.
//
// Base URL: /api/school-portal
//
// AUTH:
//   POST  /auth/login          - Login, returns JWT + API key
//   GET   /auth/verify         - Verify token is still valid
//   POST  /auth/api-key        - Generate / rotate a long-lived API key
//
// SCHOOL:
//   GET   /profile             - School profile & org details
//   GET   /dashboard           - Aggregate stats summary
//
// STUDENTS:
//   GET   /students            - Paginated student list
//   GET   /students/:id        - Single student detail
//   GET   /students/export.csv - CSV export (all students)
//
// CHECK-INS:
//   GET   /checkins            - Paginated check-ins at school location
//   GET   /checkins/stats      - Check-in analytics (daily trend, unique visitors)
//
// EVENTS:
//   GET   /events              - All upcoming / recent events
//   GET   /events/:id          - Event detail
//   GET   /events/:id/attendees  - School students who registered
//
// JOBS:
//   GET   /jobs                - All active job postings
//   GET   /jobs/:id            - Job detail + school-student applications
//
// COHORTS:
//   GET   /cohorts             - Cohorts linked to this school
//   GET   /cohorts/:name/members - Members in a specific cohort
//
// CONTENT:
//   GET   /announcements       - Recent announcements
//   GET   /leaderboard         - Points leaderboard (school students)
//
// ANALYTICS:
//   GET   /analytics/overview    - High-level engagement overview
//   GET   /analytics/engagement  - Daily engagement trend (last 90 days)
//   GET   /analytics/points      - Points distribution for school students

'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const router   = express.Router();

const { query, isPostgreSQL } = require('../config/database');

// Parameterised-query placeholder helper ($N for PG, ? for SQLite)
const p = (n) => isPostgreSQL ? `$${n}` : '?';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const slugify = (str) =>
  (str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-');

/** Sign a short-lived JWT for school portal sessions */
const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, userType: user.userType,
      company: user.company, org_id: user.org_id },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

/** Derive a deterministic API key from the user's hashed password + secret.
 *  Rotating the password automatically invalidates the old key.  */
const deriveApiKey = (userId, passwordHash) =>
  'spk_' + crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'tdil-secret')
    .update(`${userId}:${passwordHash}`)
    .digest('hex');

// ─── Authentication middleware ────────────────────────────────────────────────

/**
 * schoolAuth — accepts either:
 *   • Authorization: Bearer <jwt>
 *   • X-API-Key: spk_<hex>
 *
 * Sets req.schoolUser with { id, email, userType, company, org_id }
 */
const schoolAuth = async (req, res, next) => {
  try {
    // 1) Bearer JWT
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const rows = await query(
        `SELECT id, email, userType, company, org_id, isActive FROM users WHERE id = ${p(1)}`,
        [decoded.id]
      );
      if (!rows.length || !rows[0].isActive) return res.status(401).json({ message: 'Account not found or inactive.' });
      const u = rows[0];
      if (!['partner_school', 'admin', 'founder'].includes(u.userType)) {
        return res.status(403).json({ message: 'School portal access requires a partner_school account.' });
      }
      req.schoolUser = u;
      return next();
    }

    // 2) API key
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (apiKey && apiKey.startsWith('spk_')) {
      const rows = await query(
        `SELECT id, email, userType, company, org_id, password, isActive FROM users
         WHERE userType IN ('partner_school','admin','founder') AND isActive = 1`
      );
      const matched = rows.find(u => deriveApiKey(u.id, u.password) === apiKey);
      if (!matched) return res.status(401).json({ message: 'Invalid or expired API key.' });
      req.schoolUser = matched;
      return next();
    }

    return res.status(401).json({ message: 'Provide a Bearer token or X-API-Key header.' });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
    return res.status(500).json({ message: 'Auth error.', details: err.message });
  }
};

/**
 * Return the company-name pattern used to scope check-ins / org data.
 * Admins can pass ?company= to view any school.
 */
const getSchoolScope = (req) => {
  const isAdmin = ['admin', 'founder'].includes(req.schoolUser?.userType);
  if (isAdmin && req.query.company) return req.query.company;
  return req.schoolUser?.company || '';
};

// ─── AUTH routes (no schoolAuth required) ────────────────────────────────────

/**
 * POST /api/school-portal/auth/login
 * Body: { email, password }
 * Returns: { token, apiKey, user }
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email and password required.' });

    const rows = await query(
      `SELECT id, email, firstName, lastName, password, userType, company, org_id, isActive
       FROM users WHERE LOWER(email) = LOWER(${p(1)})`,
      [email]
    );
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials.' });
    const u = rows[0];

    if (!u.isActive) return res.status(403).json({ message: 'Account is inactive. Contact support.' });
    if (!['partner_school', 'admin', 'founder'].includes(u.userType)) {
      return res.status(403).json({ message: 'This API is for partner school accounts only.' });
    }

    const valid = await bcrypt.compare(password, u.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials.' });

    const token  = signToken(u);
    const apiKey = deriveApiKey(u.id, u.password);

    res.json({
      token,
      apiKey,
      expiresIn: '24h',
      user: {
        id: u.id, email: u.email,
        firstName: u.firstName, lastName: u.lastName,
        userType: u.userType, company: u.company, org_id: u.org_id
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login error.', details: err.message });
  }
});

/**
 * GET /api/school-portal/auth/verify
 * Returns basic info for the authenticated school (token / key check).
 */
router.get('/auth/verify', schoolAuth, (req, res) => {
  const u = req.schoolUser;
  res.json({
    valid: true,
    user: { id: u.id, email: u.email, userType: u.userType, company: u.company, org_id: u.org_id }
  });
});

/**
 * POST /api/school-portal/auth/api-key
 * Returns (or rotates) the API key for the authenticated school.
 * The key is derived — it updates automatically when the password changes.
 */
router.post('/auth/api-key', schoolAuth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, password FROM users WHERE id = ${p(1)}`, [req.schoolUser.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found.' });
    const apiKey = deriveApiKey(rows[0].id, rows[0].password);
    res.json({ apiKey, note: 'Include as X-API-Key header on every request. Rotating your password invalidates this key.' });
  } catch (err) {
    res.status(500).json({ message: 'Error generating API key.', details: err.message });
  }
});

// ─── All routes below require schoolAuth ─────────────────────────────────────
router.use(schoolAuth);

// ─── PROFILE ─────────────────────────────────────────────────────────────────

/**
 * GET /api/school-portal/profile
 * Returns school user profile merged with their org_profiles record.
 */
router.get('/profile', async (req, res) => {
  try {
    const uid = req.schoolUser.id;
    const users = await query(
      `SELECT u.id, u.email, u.firstName, u.lastName, u.company, u.jobTitle, u.bio,
              u.profileImage, u.calendly_url, u.school_zoom_url,
              u.school_contact_name, u.school_contact_email,
              u.school_materials_url, u.school_intro_video_url,
              u.school_featured, u.org_id, u.userType,
              o.name as org_name, o.description as org_description,
              o.website, o.linkedin_url, o.logo_url, o.slug as org_slug,
              o.contact_name as org_contact, o.contact_email as org_contact_email,
              o.calendly_url as org_calendly, o.zoom_url as org_zoom,
              o.materials_url as org_materials, o.intro_video_url as org_video,
              o.featured as org_featured
       FROM users u
       LEFT JOIN org_profiles o ON u.org_id = o.id
       WHERE u.id = ${p(1)}`,
      [uid]
    );
    if (!users.length) return res.status(404).json({ message: 'Profile not found.' });
    res.json({ profile: users[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

/**
 * GET /api/school-portal/dashboard
 * Aggregate stats: students, check-ins, events, jobs, points.
 */
router.get('/dashboard', async (req, res) => {
  try {
    const company = getSchoolScope(req);
    const pattern = `%${company}%`;

    // Check-in stats
    const [ciTotal] = await query(
      `SELECT COUNT(*) as count FROM checkins WHERE LOWER(location_name) LIKE LOWER(${p(1)})`,
      [pattern]
    );
    const [ciWeek] = await query(
      `SELECT COUNT(*) as count FROM checkins WHERE LOWER(location_name) LIKE LOWER(${p(1)})
       AND created_at >= ${isPostgreSQL ? "NOW() - INTERVAL '7 days'" : "datetime('now','-7 days')"}`,
      [pattern]
    );
    const [uniqueVisitors] = await query(
      `SELECT COUNT(DISTINCT user_id) as count FROM checkins WHERE LOWER(location_name) LIKE LOWER(${p(1)})`,
      [pattern]
    );

    // Students who have checked in here
    const [studentCount] = await query(
      `SELECT COUNT(DISTINCT u.id) as count
       FROM users u
       INNER JOIN checkins c ON c.user_id = u.id
       WHERE u.userType = 'member'
         AND LOWER(c.location_name) LIKE LOWER(${p(1)})`,
      [pattern]
    );

    // Active events
    const now = isPostgreSQL ? 'NOW()' : "datetime('now')";
    const [upcomingEvents] = await query(
      `SELECT COUNT(*) as count FROM events WHERE event_date >= ${now}`
    );

    // Active jobs
    let activeJobs = [{ count: 0 }];
    try {
      activeJobs = await query(`SELECT COUNT(*) as count FROM jobs WHERE is_active = 1`);
    } catch (_) {}

    // Total points awarded to students at this location
    const [pointsTotal] = await query(
      `SELECT COALESCE(SUM(points_awarded),0) as total
       FROM checkins WHERE LOWER(location_name) LIKE LOWER(${p(1)})`,
      [pattern]
    );

    // Recent activity (last 5 check-ins)
    const recentActivity = await query(
      `SELECT c.id, c.created_at, c.points_awarded,
              u.firstName, u.lastName, u.profileImage
       FROM checkins c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE LOWER(c.location_name) LIKE LOWER(${p(1)})
       ORDER BY c.created_at DESC
       LIMIT 5`,
      [pattern]
    );

    res.json({
      school: company,
      stats: {
        totalCheckIns:      parseInt(ciTotal?.count  || 0),
        checkInsThisWeek:   parseInt(ciWeek?.count   || 0),
        uniqueStudentVisitors: parseInt(uniqueVisitors?.count || 0),
        studentsEngaged:    parseInt(studentCount?.count || 0),
        upcomingEvents:     parseInt(upcomingEvents?.count || 0),
        activeJobs:         parseInt(activeJobs[0]?.count || 0),
        totalPointsAwarded: parseInt(pointsTotal?.total || 0),
      },
      recentActivity,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

// ─── STUDENTS ────────────────────────────────────────────────────────────────

/**
 * GET /api/school-portal/students
 * Query params: page, limit, search, cohort, sort (points|name|recent)
 *
 * "Students" = members who have checked in at this school's location.
 * Use ?all=1 (admin only) to return ALL members regardless.
 */
router.get('/students', async (req, res) => {
  try {
    const company = getSchoolScope(req);
    const pattern = `%${company}%`;
    const page    = Math.max(1, parseInt(req.query.page)  || 1);
    const limit   = Math.min(100, parseInt(req.query.limit) || 25);
    const offset  = (page - 1) * limit;
    const search  = req.query.search || '';
    const cohort  = req.query.cohort || '';
    const sortBy  = req.query.sort || 'recent'; // points | name | recent

    const isAdmin = ['admin', 'founder'].includes(req.schoolUser?.userType);
    const showAll = isAdmin && req.query.all === '1';

    let baseWhere = showAll
      ? `u.userType = 'member'`
      : `u.userType = 'member' AND EXISTS (
           SELECT 1 FROM checkins ci
           WHERE ci.user_id = u.id AND LOWER(ci.location_name) LIKE LOWER(${p(1)})
         )`;

    const params = showAll ? [] : [pattern];
    let pi = params.length + 1;

    if (search) {
      const like = `%${search}%`;
      baseWhere += ` AND (LOWER(u.firstName) LIKE LOWER(${p(pi)}) OR LOWER(u.lastName) LIKE LOWER(${p(pi+1)}) OR LOWER(u.email) LIKE LOWER(${p(pi+2)}))`;
      params.push(like, like, like);
      pi += 3;
    }
    if (cohort) {
      baseWhere += ` AND LOWER(u.cohort) = LOWER(${p(pi)})`;
      params.push(cohort);
      pi++;
    }

    const orderClause = {
      points: 'u.points DESC',
      name:   'u.lastName ASC, u.firstName ASC',
      recent: 'last_checkin DESC NULLS LAST',
    }[sortBy] || 'u.points DESC';

    const sql = `
      SELECT u.id, u.firstName, u.lastName, u.email, u.company,
             u.jobTitle, u.profileImage, u.points, u.level,
             u.cohort, u.slug, u.createdAt,
             COUNT(DISTINCT ci.id)  as total_checkins_here,
             MAX(ci.created_at)     as last_checkin,
             COALESCE(SUM(ci.points_awarded),0) as points_earned_here
      FROM users u
      LEFT JOIN checkins ci ON ci.user_id = u.id
        AND LOWER(ci.location_name) LIKE LOWER(${p(pi)})
      WHERE ${baseWhere}
      GROUP BY u.id, u.firstName, u.lastName, u.email, u.company,
               u.jobTitle, u.profileImage, u.points, u.level,
               u.cohort, u.slug, u.createdAt
      ORDER BY ${orderClause}
      LIMIT ${p(pi+1)} OFFSET ${p(pi+2)}
    `;
    params.push(pattern, limit, offset);

    const countSql = `
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      LEFT JOIN checkins ci ON ci.user_id = u.id
        AND LOWER(ci.location_name) LIKE LOWER(${p(pi)})
      WHERE ${baseWhere}
    `;
    const countParams = [...params.slice(0, pi), pattern];

    const [students, totalResult] = await Promise.all([
      query(sql, params),
      query(countSql, countParams),
    ]);

    res.json({
      students,
      total:      parseInt(totalResult[0]?.count || 0),
      page,
      limit,
      totalPages: Math.ceil(parseInt(totalResult[0]?.count || 0) / limit),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

/**
 * GET /api/school-portal/students/export.csv
 * Returns all students as CSV.
 */
router.get('/students/export.csv', async (req, res) => {
  try {
    const company = getSchoolScope(req);
    const pattern = `%${company}%`;

    const students = await query(
      `SELECT u.id, u.firstName, u.lastName, u.email, u.company,
              u.jobTitle, u.cohort, u.points, u.level, u.createdAt,
              COUNT(DISTINCT ci.id) as checkins_at_school,
              MAX(ci.created_at)    as last_visit
       FROM users u
       INNER JOIN checkins ci ON ci.user_id = u.id
         AND LOWER(ci.location_name) LIKE LOWER(${p(1)})
       WHERE u.userType = 'member'
       GROUP BY u.id, u.firstName, u.lastName, u.email, u.company,
                u.jobTitle, u.cohort, u.points, u.level, u.createdAt
       ORDER BY u.lastName, u.firstName`,
      [pattern]
    );

    const headers = ['ID','First Name','Last Name','Email','Company','Job Title',
                     'Cohort','Points','Level','Member Since','Visits','Last Visit'];
    const rows = students.map(s => [
      s.id, s.firstName, s.lastName, s.email,
      `"${(s.company||'').replace(/"/g,'""')}"`,
      `"${(s.jobTitle||'').replace(/"/g,'""')}"`,
      `"${(s.cohort||'').replace(/"/g,'""')}"`,
      s.points, s.level,
      s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '',
      s.checkins_at_school, s.last_visit || '',
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="students-${slugify(company)}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

/**
 * GET /api/school-portal/students/:id
 * Full detail for a single student.
 */
router.get('/students/:id', async (req, res) => {
  try {
    const company = getSchoolScope(req);
    const pattern = `%${company}%`;
    const { id }  = req.params;

    const rows = await query(
      `SELECT u.id, u.firstName, u.lastName, u.email, u.company,
              u.jobTitle, u.bio, u.profileImage, u.points, u.level,
              u.cohort, u.slug, u.linkedinUrl, u.createdAt
       FROM users u
       WHERE u.id = ${p(1)} AND u.userType = 'member'`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Student not found.' });

    const student = rows[0];

    // Check-ins at this school
    const checkins = await query(
      `SELECT id, location_name, points_awarded, created_at
       FROM checkins
       WHERE user_id = ${p(1)} AND LOWER(location_name) LIKE LOWER(${p(2)})
       ORDER BY created_at DESC
       LIMIT 20`,
      [id, pattern]
    );

    // Connections count
    let connectionCount = 0;
    try {
      const [cc] = await query(
        `SELECT COUNT(*) as count FROM connections
         WHERE (user_id = ${p(1)} OR connected_user_id = ${p(2)}) AND status = 'accepted'`,
        [id, id]
      );
      connectionCount = parseInt(cc?.count || 0);
    } catch (_) {}

    res.json({
      student,
      checkinsAtSchool: checkins,
      totalCheckinsAtSchool: checkins.length,
      connectionCount,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

// ─── CHECK-INS ───────────────────────────────────────────────────────────────

/**
 * GET /api/school-portal/checkins
 * Paginated list of check-ins at this school's location.
 */
router.get('/checkins', async (req, res) => {
  try {
    const company = getSchoolScope(req);
    const pattern = `%${company}%`;
    const page    = Math.max(1, parseInt(req.query.page)  || 1);
    const limit   = Math.min(100, parseInt(req.query.limit) || 25);
    const offset  = (page - 1) * limit;

    const [checkins, totalResult] = await Promise.all([
      query(
        `SELECT c.id, c.location_name, c.points_awarded, c.created_at,
                u.id as student_id, u.firstName, u.lastName,
                u.profileImage, u.cohort, u.points as total_points
         FROM checkins c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE LOWER(c.location_name) LIKE LOWER(${p(1)})
         ORDER BY c.created_at DESC
         LIMIT ${p(2)} OFFSET ${p(3)}`,
        [pattern, limit, offset]
      ),
      query(
        `SELECT COUNT(*) as count FROM checkins
         WHERE LOWER(location_name) LIKE LOWER(${p(1)})`,
        [pattern]
      ),
    ]);

    res.json({
      checkins,
      total:      parseInt(totalResult[0]?.count || 0),
      page,
      limit,
      totalPages: Math.ceil(parseInt(totalResult[0]?.count || 0) / limit),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

/**
 * GET /api/school-portal/checkins/stats
 * Daily trend for the last 90 days + top visitors.
 */
router.get('/checkins/stats', async (req, res) => {
  try {
    const company = getSchoolScope(req);
    const pattern = `%${company}%`;
    const days    = Math.min(365, parseInt(req.query.days) || 90);

    const trendSql = isPostgreSQL
      ? `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM checkins
         WHERE LOWER(location_name) LIKE LOWER(${p(1)})
           AND created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY DATE(created_at)
         ORDER BY date ASC`
      : `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM checkins
         WHERE LOWER(location_name) LIKE LOWER(${p(1)})
           AND created_at >= datetime('now','-${days} days')
         GROUP BY DATE(created_at)
         ORDER BY date ASC`;

    const [trend, topVisitors] = await Promise.all([
      query(trendSql, [pattern]),
      query(
        `SELECT u.id, u.firstName, u.lastName, u.profileImage, u.cohort,
                COUNT(c.id) as visit_count,
                COALESCE(SUM(c.points_awarded),0) as points_earned,
                MAX(c.created_at) as last_visit
         FROM checkins c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE LOWER(c.location_name) LIKE LOWER(${p(1)})
         GROUP BY u.id, u.firstName, u.lastName, u.profileImage, u.cohort
         ORDER BY visit_count DESC
         LIMIT 10`,
        [pattern]
      ),
    ]);

    res.json({ trend, topVisitors, periodDays: days, school: company });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

// ─── EVENTS ──────────────────────────────────────────────────────────────────

/**
 * GET /api/school-portal/events
 * Query params: upcoming=1 | past=1, limit, page
 */
router.get('/events', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const now    = isPostgreSQL ? 'NOW()' : "datetime('now')";

    let where = '';
    if (req.query.upcoming === '1') where = `WHERE e.event_date >= ${now}`;
    if (req.query.past     === '1') where = `WHERE e.event_date <  ${now}`;

    const events = await query(
      `SELECT e.id, e.title, e.description, e.event_date, e.location,
              e.image_url, e.max_attendees, e.points_value, e.event_type,
              COUNT(DISTINCT er.user_id) as registered_count
       FROM events e
       LEFT JOIN event_registrations er ON er.event_id = e.id
       ${where}
       GROUP BY e.id, e.title, e.description, e.event_date,
                e.location, e.image_url, e.max_attendees, e.points_value, e.event_type
       ORDER BY e.event_date ${req.query.past === '1' ? 'DESC' : 'ASC'}
       LIMIT ${p(1)} OFFSET ${p(2)}`,
      [limit, offset]
    );

    res.json({ events, page, limit });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

/**
 * GET /api/school-portal/events/:id
 * Event detail.
 */
router.get('/events/:id', async (req, res) => {
  try {
    const rows = await query(
      `SELECT e.*, COUNT(DISTINCT er.user_id) as registered_count
       FROM events e
       LEFT JOIN event_registrations er ON er.event_id = e.id
       WHERE e.id = ${p(1)}
       GROUP BY e.id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Event not found.' });
    res.json({ event: rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

/**
 * GET /api/school-portal/events/:id/attendees
 * Members from this school who registered for the event.
 */
router.get('/events/:id/attendees', async (req, res) => {
  try {
    const company = getSchoolScope(req);
    const pattern = `%${company}%`;

    const attendees = await query(
      `SELECT u.id, u.firstName, u.lastName, u.email,
              u.profileImage, u.cohort, er.registered_at
       FROM event_registrations er
       INNER JOIN users u ON er.user_id = u.id
       WHERE er.event_id = ${p(1)}
         AND EXISTS (
           SELECT 1 FROM checkins ci
           WHERE ci.user_id = u.id
             AND LOWER(ci.location_name) LIKE LOWER(${p(2)})
         )
       ORDER BY er.registered_at DESC`,
      [req.params.id, pattern]
    );

    res.json({ attendees, total: attendees.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

// ─── JOBS ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/school-portal/jobs
 * All active job postings visible to members.
 */
router.get('/jobs', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const jobs = await query(
      `SELECT id, title, company, description, location, type, salary_range,
              application_url, posted_by, is_active, created_at
       FROM jobs
       WHERE is_active = 1
       ORDER BY created_at DESC
       LIMIT ${p(1)} OFFSET ${p(2)}`,
      [limit, offset]
    );

    res.json({ jobs, page, limit });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

/**
 * GET /api/school-portal/jobs/:id
 * Job detail + applications from school students.
 */
router.get('/jobs/:id', async (req, res) => {
  try {
    const company = getSchoolScope(req);
    const pattern = `%${company}%`;

    const rows = await query(`SELECT * FROM jobs WHERE id = ${p(1)}`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Job not found.' });

    // Applications from school students
    let applications = [];
    try {
      applications = await query(
        `SELECT a.id, a.status, a.applied_at,
                u.id as student_id, u.firstName, u.lastName,
                u.email, u.profileImage, u.cohort
         FROM applications a
         INNER JOIN users u ON a.user_id = u.id
         WHERE a.job_id = ${p(1)}
           AND EXISTS (
             SELECT 1 FROM checkins ci
             WHERE ci.user_id = u.id
               AND LOWER(ci.location_name) LIKE LOWER(${p(2)})
           )
         ORDER BY a.applied_at DESC`,
        [req.params.id, pattern]
      );
    } catch (_) {
      // applications table may not exist in all environments
    }

    res.json({ job: rows[0], applications, applicantCount: applications.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

// ─── COHORTS ─────────────────────────────────────────────────────────────────

/**
 * GET /api/school-portal/cohorts
 * Cohorts that contain students who have visited this school.
 */
router.get('/cohorts', async (req, res) => {
  try {
    const company = getSchoolScope(req);
    const pattern = `%${company}%`;

    const cohorts = await query(
      `SELECT u.cohort, COUNT(DISTINCT u.id) as member_count,
              AVG(u.points) as avg_points,
              MAX(ci.created_at) as latest_activity
       FROM users u
       INNER JOIN checkins ci ON ci.user_id = u.id
         AND LOWER(ci.location_name) LIKE LOWER(${p(1)})
       WHERE u.userType = 'member' AND u.cohort IS NOT NULL AND u.cohort != ''
       GROUP BY u.cohort
       ORDER BY member_count DESC`,
      [pattern]
    );

    res.json({ cohorts });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

/**
 * GET /api/school-portal/cohorts/:name/members
 * Members in a specific cohort who have also visited this school.
 */
router.get('/cohorts/:name/members', async (req, res) => {
  try {
    const company     = getSchoolScope(req);
    const pattern     = `%${company}%`;
    const cohortName  = decodeURIComponent(req.params.name);

    const members = await query(
      `SELECT u.id, u.firstName, u.lastName, u.email,
              u.profileImage, u.points, u.level, u.cohort, u.slug,
              COUNT(DISTINCT ci.id) as visits_at_school,
              MAX(ci.created_at)    as last_visit
       FROM users u
       LEFT JOIN checkins ci ON ci.user_id = u.id
         AND LOWER(ci.location_name) LIKE LOWER(${p(1)})
       WHERE u.cohort = ${p(2)} AND u.userType = 'member'
       GROUP BY u.id, u.firstName, u.lastName, u.email,
                u.profileImage, u.points, u.level, u.cohort, u.slug
       ORDER BY u.points DESC`,
      [pattern, cohortName]
    );

    res.json({ cohort: cohortName, members, total: members.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

// ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────────

/**
 * GET /api/school-portal/announcements
 * Recent announcements (public feed).
 */
router.get('/announcements', async (req, res) => {
  try {
    const limit  = Math.min(50, parseInt(req.query.limit) || 10);
    const offset = (Math.max(1, parseInt(req.query.page) || 1) - 1) * limit;

    const rows = await query(
      `SELECT a.id, a.title, a.content, a.image_url, a.created_at,
              u.firstName, u.lastName
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       ORDER BY a.created_at DESC
       LIMIT ${p(1)} OFFSET ${p(2)}`,
      [limit, offset]
    );

    res.json({ announcements: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────

/**
 * GET /api/school-portal/leaderboard
 * Points leaderboard for students who have visited this school.
 * Query: limit (max 50)
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const company = getSchoolScope(req);
    const pattern = `%${company}%`;
    const limit   = Math.min(50, parseInt(req.query.limit) || 10);

    const rows = await query(
      `SELECT u.id, u.firstName, u.lastName, u.profileImage,
              u.points, u.level, u.cohort, u.slug,
              COUNT(DISTINCT ci.id) as visits_at_school
       FROM users u
       INNER JOIN checkins ci ON ci.user_id = u.id
         AND LOWER(ci.location_name) LIKE LOWER(${p(1)})
       WHERE u.userType = 'member'
       GROUP BY u.id, u.firstName, u.lastName, u.profileImage,
                u.points, u.level, u.cohort, u.slug
       ORDER BY u.points DESC
       LIMIT ${p(2)}`,
      [pattern, limit]
    );

    res.json({ leaderboard: rows, school: company });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

/**
 * GET /api/school-portal/analytics/overview
 * High-level engagement metrics.
 */
router.get('/analytics/overview', async (req, res) => {
  try {
    const company = getSchoolScope(req);
    const pattern = `%${company}%`;

    const [
      totalCheckins,
      uniqueStudents,
      pointsAwarded,
      avgPointsPerVisit,
      monthlyCheckins,
      newStudentsThisMonth,
    ] = await Promise.all([
      query(`SELECT COUNT(*) as v FROM checkins WHERE LOWER(location_name) LIKE LOWER(${p(1)})`, [pattern]),
      query(`SELECT COUNT(DISTINCT user_id) as v FROM checkins WHERE LOWER(location_name) LIKE LOWER(${p(1)})`, [pattern]),
      query(`SELECT COALESCE(SUM(points_awarded),0) as v FROM checkins WHERE LOWER(location_name) LIKE LOWER(${p(1)})`, [pattern]),
      query(`SELECT COALESCE(AVG(points_awarded),0) as v FROM checkins WHERE LOWER(location_name) LIKE LOWER(${p(1)})`, [pattern]),
      query(
        `SELECT COUNT(*) as v FROM checkins
         WHERE LOWER(location_name) LIKE LOWER(${p(1)})
           AND created_at >= ${isPostgreSQL ? "NOW() - INTERVAL '30 days'" : "datetime('now','-30 days')"}`,
        [pattern]
      ),
      query(
        `SELECT COUNT(DISTINCT u.id) as v
         FROM users u
         INNER JOIN checkins ci ON ci.user_id = u.id
           AND LOWER(ci.location_name) LIKE LOWER(${p(1)})
         WHERE u.userType = 'member'
           AND u.createdAt >= ${isPostgreSQL ? "NOW() - INTERVAL '30 days'" : "datetime('now','-30 days')"}`,
        [pattern]
      ),
    ]);

    // Cohort breakdown
    const cohortBreakdown = await query(
      `SELECT u.cohort, COUNT(DISTINCT u.id) as students, SUM(u.points) as total_points
       FROM users u
       INNER JOIN checkins ci ON ci.user_id = u.id
         AND LOWER(ci.location_name) LIKE LOWER(${p(1)})
       WHERE u.userType = 'member' AND u.cohort IS NOT NULL AND u.cohort != ''
       GROUP BY u.cohort
       ORDER BY students DESC`,
      [pattern]
    );

    res.json({
      school: company,
      overview: {
        totalCheckIns:       parseInt(totalCheckins[0]?.v  || 0),
        uniqueStudents:      parseInt(uniqueStudents[0]?.v || 0),
        totalPointsAwarded:  parseInt(pointsAwarded[0]?.v  || 0),
        avgPointsPerVisit:   parseFloat((avgPointsPerVisit[0]?.v || 0)).toFixed(1),
        checkInsLast30Days:  parseInt(monthlyCheckins[0]?.v || 0),
        newStudentsThisMonth:parseInt(newStudentsThisMonth[0]?.v || 0),
      },
      cohortBreakdown,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

/**
 * GET /api/school-portal/analytics/engagement
 * Daily engagement trend.
 * Query: days (default 90, max 365)
 */
router.get('/analytics/engagement', async (req, res) => {
  try {
    const company = getSchoolScope(req);
    const pattern = `%${company}%`;
    const days    = Math.min(365, parseInt(req.query.days) || 90);

    const trendSql = isPostgreSQL
      ? `SELECT DATE(created_at) as date,
                COUNT(*) as checkins,
                COUNT(DISTINCT user_id) as unique_visitors
         FROM checkins
         WHERE LOWER(location_name) LIKE LOWER(${p(1)})
           AND created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY DATE(created_at)
         ORDER BY date ASC`
      : `SELECT DATE(created_at) as date,
                COUNT(*) as checkins,
                COUNT(DISTINCT user_id) as unique_visitors
         FROM checkins
         WHERE LOWER(location_name) LIKE LOWER(${p(1)})
           AND created_at >= datetime('now','-${days} days')
         GROUP BY DATE(created_at)
         ORDER BY date ASC`;

    const trend = await query(trendSql, [pattern]);
    res.json({ trend, periodDays: days, school: company });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

/**
 * GET /api/school-portal/analytics/points
 * Points distribution for school students.
 */
router.get('/analytics/points', async (req, res) => {
  try {
    const company = getSchoolScope(req);
    const pattern = `%${company}%`;

    const distribution = await query(
      `SELECT
         CASE
           WHEN u.points = 0          THEN '0'
           WHEN u.points < 100        THEN '1-99'
           WHEN u.points < 500        THEN '100-499'
           WHEN u.points < 1000       THEN '500-999'
           WHEN u.points < 5000       THEN '1000-4999'
           ELSE '5000+'
         END as range,
         COUNT(*) as students,
         AVG(u.points) as avg_points
       FROM users u
       INNER JOIN checkins ci ON ci.user_id = u.id
         AND LOWER(ci.location_name) LIKE LOWER(${p(1)})
       WHERE u.userType = 'member'
       GROUP BY range
       ORDER BY MIN(u.points)`,
      [pattern]
    );

    const [summary] = await query(
      `SELECT
         AVG(u.points) as avg_points,
         MAX(u.points) as max_points,
         MIN(u.points) as min_points,
         SUM(u.points) as total_points
       FROM users u
       INNER JOIN checkins ci ON ci.user_id = u.id
         AND LOWER(ci.location_name) LIKE LOWER(${p(1)})
       WHERE u.userType = 'member'`,
      [pattern]
    );

    res.json({ distribution, summary, school: company });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', details: err.message });
  }
});

// ─── API info ─────────────────────────────────────────────────────────────────

/**
 * GET /api/school-portal
 * Returns available endpoints (unauthenticated).
 */
router.get('/', (req, res) => {
  res.json({
    name: 'TDIL School Portal API',
    version: '1.0.0',
    description: 'External API for participating school portal access.',
    authentication: {
      methods: ['Bearer JWT', 'X-API-Key header'],
      loginEndpoint: 'POST /api/school-portal/auth/login',
      note: 'Login with your partner_school credentials to receive a JWT and API key.'
    },
    endpoints: {
      auth: [
        'POST /api/school-portal/auth/login',
        'GET  /api/school-portal/auth/verify',
        'POST /api/school-portal/auth/api-key',
      ],
      school: [
        'GET  /api/school-portal/profile',
        'GET  /api/school-portal/dashboard',
      ],
      students: [
        'GET  /api/school-portal/students',
        'GET  /api/school-portal/students/export.csv',
        'GET  /api/school-portal/students/:id',
      ],
      checkins: [
        'GET  /api/school-portal/checkins',
        'GET  /api/school-portal/checkins/stats',
      ],
      events: [
        'GET  /api/school-portal/events',
        'GET  /api/school-portal/events/:id',
        'GET  /api/school-portal/events/:id/attendees',
      ],
      jobs: [
        'GET  /api/school-portal/jobs',
        'GET  /api/school-portal/jobs/:id',
      ],
      cohorts: [
        'GET  /api/school-portal/cohorts',
        'GET  /api/school-portal/cohorts/:name/members',
      ],
      content: [
        'GET  /api/school-portal/announcements',
        'GET  /api/school-portal/leaderboard',
      ],
      analytics: [
        'GET  /api/school-portal/analytics/overview',
        'GET  /api/school-portal/analytics/engagement',
        'GET  /api/school-portal/analytics/points',
      ],
    },
  });
});

module.exports = router;
