const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { query, isPostgreSQL } = require('../config/database');
const {
  getUserCohort,
  getCohortMembers,
  getAllCohorts,
  addUserToCohort,
  createCohortEvent,
  getCohortEvents,
  registerForEvent
} = require('../controllers/cohortController');

const p = (n) => isPostgreSQL ? `$${n}` : '?';

// Admin-only middleware
const adminOnly = (req, res, next) => {
  const allowed = ['admin', 'founder'];
  if (!allowed.includes(req.user?.userType)) {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};

// Official tDIL cohort names — alphabetically sorted, no duplicates
const OFFICIAL_COHORTS = [
  'Alumni Association Leadership',
  'Chicago/Detroit/St. Louis',
  'Chicago/Detroit/St. Louis 1','Chicago/Detroit/St. Louis 2',
  'Chicago/Detroit/St. Louis 3','Chicago/Detroit/St. Louis 4',
  'Indiana',
  'Indiana 1','Indiana 2','Indiana 3','Indiana 4','Indiana 5',
  'Indiana 6','Indiana 7','Indiana 8','Indiana 9','Indiana 10',
  'Ohio',
  'Ohio 1','Ohio 2','Ohio 3','Ohio 4','Ohio 5','Ohio 6',
  'South',
  'South 1','South 2','South 3','South 4',
  'TDIL Alumni Association',
];

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC — list cohort names (used on signup page, no auth required)
// Returns cohorts from both users.cohort and the admin-managed cohort_list
// ─────────────────────────────────────────────────────────────────────────────
router.get('/names', async (req, res) => {
  try {
    // Cohorts currently assigned to at least one user
    const fromUsers = await query(
      `SELECT DISTINCT cohort as name, COUNT(*) as member_count
       FROM users
       WHERE cohort IS NOT NULL AND cohort != ''
       GROUP BY cohort
       ORDER BY member_count DESC, cohort ASC`
    );

    // Admin-managed cohort names not yet assigned to anyone
    let fromList = [];
    try {
      const usedNames = fromUsers.map(r => r.name);
      if (usedNames.length > 0) {
        const placeholders = usedNames.map((_, i) => p(i + 1)).join(', ');
        fromList = await query(
          `SELECT name, 0 as member_count
           FROM cohort_list
           WHERE is_active = TRUE AND name NOT IN (${placeholders})
           ORDER BY name ASC`,
          usedNames
        );
      } else {
        fromList = await query(
          `SELECT name, 0 as member_count
           FROM cohort_list
           WHERE is_active = TRUE
           ORDER BY name ASC`
        );
      }
    } catch (_) {
      // cohort_list table may not exist yet — that's fine
    }

    // Build a count map from DB users
    const countMap = {};
    fromUsers.forEach(r => { countMap[r.name] = parseInt(r.member_count || 0); });

    // Merge: official first, then DB users not in official list, then admin cohort_list
    const dbNames = fromUsers.map(r => r.name);
    const listNames = fromList.map(r => r.name);
    const extraDB = dbNames.filter(n => !OFFICIAL_COHORTS.includes(n) && !listNames.includes(n));
    const extraList = listNames.filter(n => !OFFICIAL_COHORTS.includes(n));

    const allNames = [...OFFICIAL_COHORTS, ...extraDB, ...extraList];
    const combined = allNames.map(name => ({ name, memberCount: countMap[name] || 0 }));

    res.json(combined);
  } catch (err) {
    console.error('Error fetching cohort names:', err);
    // Fallback: just return official list
    res.json(OFFICIAL_COHORTS.map(name => ({ name, memberCount: 0 })));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// All routes below require authentication
// ─────────────────────────────────────────────────────────────────────────────
router.use(protect);

// Get user's cohort
router.get('/my-cohort', getUserCohort);

// POST /cohorts/group-chat — create (or return existing) group chat for user's cohort
router.post('/group-chat', async (req, res) => {
  try {
    const userId = req.user.id;
    const users = await query(`SELECT cohort FROM users WHERE id = ${p(1)}`, [userId]);
    const cohortName = users[0]?.cohort;
    if (!cohortName) return res.status(400).json({ message: 'You are not in a cohort' });

    // Check if a group chat already exists for this cohort
    let chats = await query(`SELECT id, name FROM group_chats WHERE cohort = ${p(1)}`, [cohortName]);
    if (!chats.length) {
      // Create it
      const ins = await query(
        `INSERT INTO group_chats (name, chat_type, cohort, created_by) VALUES (${p(1)}, 'cohort', ${p(2)}, ${p(3)})`,
        [cohortName, cohortName, userId]
      );
      const newId = ins[0]?.id ?? ins.lastID ?? ins[0]?.lastID;
      chats = await query(`SELECT id, name FROM group_chats WHERE id = ${p(1)}`, [newId]);
    }

    // Add user to the chat (ignore duplicate)
    try {
      await query(
        `INSERT INTO group_chat_members (group_chat_id, user_id) VALUES (${p(1)}, ${p(2)})`,
        [chats[0].id, userId]
      );
    } catch (_) { /* already member */ }

    res.json({ id: chats[0].id, name: chats[0].name });
  } catch (err) {
    console.error('Error creating/fetching cohort group chat:', err);
    res.status(500).json({ message: 'Error with group chat' });
  }
});

// Update current user's own cohort
router.put('/my-cohort', async (req, res) => {
  try {
    const { cohort } = req.body;
    const userId = req.user.id;
    await query(`UPDATE users SET cohort = ${p(1)} WHERE id = ${p(2)}`, [cohort || null, userId]);
    res.json({ message: 'Cohort updated successfully', cohort: cohort || null });
  } catch (err) {
    console.error('Error updating cohort:', err);
    res.status(500).json({ message: 'Error updating cohort' });
  }
});

// Get all cohorts
router.get('/', getAllCohorts);

// Get cohort members
router.get('/:cohortId/members', getCohortMembers);

// Add user to cohort
router.post('/add-member', addUserToCohort);

// Cohort events
router.post('/events', createCohortEvent);
router.get('/:cohortId/events', getCohortEvents);
router.post('/events/:eventId/register', registerForEvent);

// Get members of any cohort by name (for browsing other cohorts)
router.get('/members-by-name/:name', async (req, res) => {
  try {
    const cohortName = decodeURIComponent(req.params.name);
    const members = await query(
      `SELECT id, firstName as firstname, lastName as lastname, email, company,
              jobTitle as jobtitle, profileImage as profile_image, points, level
       FROM users
       WHERE cohort = ${p(1)}
       ORDER BY points DESC`,
      [cohortName]
    );
    res.json(members);
  } catch (err) {
    console.error('Error getting cohort members by name:', err);
    res.status(500).json({ message: 'Error getting cohort members' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /admin/users — all members with cohort info
router.get('/admin/users', adminOnly, async (req, res) => {
  try {
    const search = req.query.search || '';
    let sql = `SELECT id, firstName, lastName, email, cohort, userType, points, level, profileImage
               FROM users`;
    const params = [];

    if (search) {
      sql += ` WHERE (LOWER(firstName) LIKE ${p(1)} OR LOWER(lastName) LIKE ${p(2)} OR LOWER(email) LIKE ${p(3)})`;
      const like = `%${search.toLowerCase()}%`;
      params.push(like, like, like);
    }

    sql += ` ORDER BY lastName ASC, firstName ASC`;
    const users = await query(sql, params);
    res.json(users);
  } catch (err) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// PUT /admin/users/:userId/cohort — update a specific user's cohort
router.put('/admin/users/:userId/cohort', adminOnly, async (req, res) => {
  try {
    const { cohort } = req.body;
    const { userId } = req.params;
    await query(`UPDATE users SET cohort = ${p(1)} WHERE id = ${p(2)}`, [cohort || null, userId]);
    res.json({ message: 'User cohort updated successfully', userId, cohort: cohort || null });
  } catch (err) {
    console.error('Error updating user cohort:', err);
    res.status(500).json({ message: 'Error updating user cohort' });
  }
});

// GET /admin/cohort-list — get admin-managed cohort name list
router.get('/admin/cohort-list', adminOnly, async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, name, description, is_active, created_at
       FROM cohort_list
       ORDER BY name ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching cohort list:', err);
    res.json([]);
  }
});

// POST /admin/cohort-list — add a new cohort name
router.post('/admin/cohort-list', adminOnly, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Cohort name is required' });
    }

    // Check for duplicate
    const existing = await query(
      `SELECT id FROM cohort_list WHERE LOWER(name) = LOWER(${p(1)})`,
      [name.trim()]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'A cohort with this name already exists' });
    }

    const result = await query(
      `INSERT INTO cohort_list (name, description, created_by) VALUES (${p(1)}, ${p(2)}, ${p(3)}) RETURNING id`,
      [name.trim(), description || null, req.user.id]
    );
    res.status(201).json({ message: 'Cohort created', id: result[0]?.id, name: name.trim() });
  } catch (err) {
    console.error('Error creating cohort:', err);
    res.status(500).json({ message: 'Error creating cohort' });
  }
});

// DELETE /admin/cohort-list/:id — remove a cohort from the managed list
router.delete('/admin/cohort-list/:id', adminOnly, async (req, res) => {
  try {
    await query(`DELETE FROM cohort_list WHERE id = ${p(1)}`, [req.params.id]);
    res.json({ message: 'Cohort removed from list' });
  } catch (err) {
    console.error('Error deleting cohort:', err);
    res.status(500).json({ message: 'Error deleting cohort' });
  }
});

module.exports = router;
