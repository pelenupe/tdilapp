const { query } = require('../config/database');

// ─── Helper: get or create a cohort (used internally) ────────────────────────
const getOrCreateCohort = async (schoolName, graduationYear, userId) => {
  try {
    let existing = await query(
      `SELECT * FROM cohorts WHERE "schoolName" = $1 AND "graduationYear" = $2 LIMIT 1`,
      [schoolName, graduationYear]
    ).catch(() => []);

    if (existing.length > 0) return existing[0];

    const cohortName = `${schoolName} - Class of ${graduationYear}`;
    const result = await query(
      `INSERT INTO cohorts (name, "schoolName", "graduationYear", "createdBy", "isActive")
       VALUES ($1, $2, $3, $4, true) RETURNING id`,
      [cohortName, schoolName, graduationYear, userId]
    );
    const newCohortId = result[0].id;
    const newCohort = await query('SELECT * FROM cohorts WHERE id = $1', [newCohortId]);

    // Best-effort: create group chat for this cohort
    try {
      await query(
        `INSERT INTO group_chats (name, chat_type, cohort_id, "createdBy") VALUES ($1, 'cohort', $2, $3)`,
        [cohortName, newCohortId, userId]
      );
    } catch (_) { /* non-fatal */ }

    return newCohort[0];
  } catch (error) {
    console.error('Error in getOrCreateCohort:', error);
    throw error;
  }
};

// ─── GET /api/cohorts/names  (PUBLIC – no auth) ───────────────────────────────
// Used on signup page and profile dropdown to list selectable cohort names.
// Merges admin-managed cohort_list + existing user cohort strings.
const getCohortNames = async (req, res) => {
  try {
    const names = new Map(); // name → { id, name }

    // 1. Admin-managed cohort_list table (migration 009)
    try {
      const rows = await query(
        `SELECT id, name FROM cohort_list WHERE is_active = TRUE ORDER BY name ASC`
      );
      rows.forEach(r => {
        if (r.name) names.set(r.name, { id: r.id, name: r.name });
      });
    } catch (_) { /* table may not exist on older DBs */ }

    // 2. Existing user cohort strings (organic cohorts already in use)
    try {
      const rows = await query(
        `SELECT DISTINCT cohort AS name FROM users
         WHERE cohort IS NOT NULL AND cohort <> ''
         ORDER BY cohort ASC`
      );
      rows.forEach((r, i) => {
        if (r.name && !names.has(r.name)) {
          names.set(r.name, { id: `u_${i}`, name: r.name });
        }
      });
    } catch (_) { /* continue */ }

    const sorted = [...names.values()].sort((a, b) => a.name.localeCompare(b.name));
    res.json(sorted);
  } catch (error) {
    console.error('Error getting cohort names:', error);
    res.json([]); // Always return array so signup still works
  }
};

// ─── GET /api/cohorts/my-cohort ───────────────────────────────────────────────
const getUserCohort = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await query('SELECT cohort FROM users WHERE id = $1', [userId]);

    if (!rows || !rows[0] || !rows[0].cohort) {
      return res.json(null);
    }

    const cohortName = rows[0].cohort;

    const memberCount = await query(
      'SELECT COUNT(*) AS count FROM users WHERE cohort = $1',
      [cohortName]
    );

    res.json({
      id: null,
      name: cohortName,
      school_name: cohortName.split(' - ')[0] || cohortName,
      graduation_year: cohortName.split(' ').pop(),
      member_count: parseInt(memberCount[0]?.count || 0)
    });
  } catch (error) {
    console.error('Error getting user cohort:', error);
    res.status(500).json({ message: 'Error getting cohort' });
  }
};

// ─── PUT /api/cohorts/my-cohort  (self-service cohort update) ────────────────
const updateMyCohort = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cohort } = req.body; // string name or null/empty to clear

    await query('UPDATE users SET cohort = $1 WHERE id = $2', [cohort || null, userId]);

    res.json({ message: 'Cohort updated successfully', cohort: cohort || null });
  } catch (error) {
    console.error('Error updating cohort:', error);
    res.status(500).json({ message: 'Error updating cohort' });
  }
};

// ─── GET /api/cohorts/:cohortId/members ───────────────────────────────────────
// Returns all members who share the requesting user's cohort string.
const getCohortMembers = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await query('SELECT cohort FROM users WHERE id = $1', [userId]);

    if (!rows || !rows[0] || !rows[0].cohort) {
      return res.json([]);
    }

    const cohortName = rows[0].cohort;
    const members = await query(
      `SELECT id, "firstName" AS firstname, "lastName" AS lastname, email, company,
              "jobTitle" AS jobtitle, "profileImage" AS profile_image, points, level
       FROM users
       WHERE cohort = $1
       ORDER BY points DESC`,
      [cohortName]
    );

    res.json(members);
  } catch (error) {
    console.error('Error getting cohort members:', error);
    res.status(500).json({ message: 'Error getting cohort members' });
  }
};

// ─── GET /api/cohorts/ ────────────────────────────────────────────────────────
const getAllCohorts = async (req, res) => {
  try {
    // Aggregate distinct cohort strings from users (no separate cohorts table required)
    const rows = await query(
      `SELECT cohort AS name, COUNT(*) AS member_count
       FROM users
       WHERE cohort IS NOT NULL AND cohort <> ''
       GROUP BY cohort
       ORDER BY member_count DESC, cohort ASC`
    );
    res.json(rows.map(r => ({ name: r.name, memberCount: parseInt(r.member_count || 0) })));
  } catch (error) {
    console.error('Error getting all cohorts:', error);
    res.status(500).json({ message: 'Error getting cohorts' });
  }
};

// ─── POST /api/cohorts/add-member  (admin use) ───────────────────────────────
const addUserToCohort = async (req, res) => {
  try {
    const { userId, cohort } = req.body;
    if (!userId || !cohort) {
      return res.status(400).json({ message: 'userId and cohort are required' });
    }

    await query('UPDATE users SET cohort = $1 WHERE id = $2', [cohort, userId]);
    res.json({ message: 'Added to cohort successfully' });
  } catch (error) {
    console.error('Error adding user to cohort:', error);
    res.status(500).json({ message: 'Error adding user to cohort' });
  }
};

// ─── ADMIN: GET /api/cohorts/admin/users ─────────────────────────────────────
const adminGetUsersWithCohorts = async (req, res) => {
  try {
    if (!['admin', 'founder'].includes(req.user?.userType)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const users = await query(
      `SELECT id, "firstName" AS "firstName", "lastName" AS "lastName",
              email, cohort, "userType"
       FROM users
       ORDER BY "lastName" ASC, "firstName" ASC`
    );

    res.json(users);
  } catch (error) {
    console.error('Error getting users with cohorts:', error);
    res.status(500).json({ message: 'Error getting users' });
  }
};

// ─── ADMIN: PUT /api/cohorts/admin/users/:userId ──────────────────────────────
const adminUpdateUserCohort = async (req, res) => {
  try {
    if (!['admin', 'founder'].includes(req.user?.userType)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { userId } = req.params;
    const { cohort } = req.body;

    const found = await query('SELECT id FROM users WHERE id = $1', [userId]);
    if (!found || found.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await query('UPDATE users SET cohort = $1 WHERE id = $2', [cohort || null, userId]);

    res.json({ message: 'User cohort updated', userId, cohort: cohort || null });
  } catch (error) {
    console.error('Error admin updating user cohort:', error);
    res.status(500).json({ message: 'Error updating user cohort' });
  }
};

// ─── ADMIN: POST /api/cohorts/admin/cohort-list ───────────────────────────────
// Add a new cohort name to the admin-managed cohort_list table
const adminCreateCohortName = async (req, res) => {
  try {
    if (!['admin', 'founder'].includes(req.user?.userType)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Cohort name is required' });
    }

    try {
      const result = await query(
        `INSERT INTO cohort_list (name, description, created_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET is_active = TRUE
         RETURNING id, name, description, is_active`,
        [name.trim(), description || null, req.user.id]
      );
      res.status(201).json({ message: 'Cohort name created', cohort: result[0] });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ message: 'A cohort with this name already exists' });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error creating cohort name:', error);
    res.status(500).json({ message: 'Error creating cohort name' });
  }
};

// ─── ADMIN: DELETE /api/cohorts/admin/cohort-list/:id ─────────────────────────
const adminDeleteCohortName = async (req, res) => {
  try {
    if (!['admin', 'founder'].includes(req.user?.userType)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    await query('UPDATE cohort_list SET is_active = FALSE WHERE id = $1', [id]).catch(() => {});
    res.json({ message: 'Cohort name removed' });
  } catch (error) {
    console.error('Error deleting cohort name:', error);
    res.status(500).json({ message: 'Error deleting cohort name' });
  }
};

// ─── Cohort events (stubs) ────────────────────────────────────────────────────
const createCohortEvent = async (req, res) => {
  res.status(501).json({ message: 'Cohort events not yet supported' });
};

const getCohortEvents = async (req, res) => {
  res.json([]);
};

const registerForEvent = async (req, res) => {
  res.status(501).json({ message: 'Cohort events not yet supported' });
};

// ─── Internal helper: auto-assign cohort on registration ─────────────────────
const autoAssignCohort = async (userId, almaMater, graduationYear) => {
  try {
    if (!almaMater || !graduationYear) return null;
    const cohort = await getOrCreateCohort(almaMater, graduationYear, userId);
    if (cohort) {
      await query('UPDATE users SET cohort = $1 WHERE id = $2', [cohort.name, userId]);
    }
    return cohort;
  } catch (error) {
    console.error('Error auto-assigning cohort:', error);
    return null;
  }
};

module.exports = {
  getOrCreateCohort,
  getCohortNames,
  getUserCohort,
  updateMyCohort,
  getCohortMembers,
  getAllCohorts,
  addUserToCohort,
  adminGetUsersWithCohorts,
  adminUpdateUserCohort,
  adminCreateCohortName,
  adminDeleteCohortName,
  createCohortEvent,
  getCohortEvents,
  registerForEvent,
  autoAssignCohort
};
