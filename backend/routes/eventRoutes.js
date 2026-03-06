const express = require('express');
const { query, isPostgreSQL } = require('../config/database');
const { protect } = require('../middleware/authMiddleware');
const { createNotification } = require('./notificationRoutes');
const router = express.Router();

// Helper: positional placeholder
const p = (n) => isPostgreSQL ? `$${n}` : '?';

// Ensure event_registrations table exists
const ensureRegTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS event_registrations (
      id ${isPostgreSQL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      registered_at ${isPostgreSQL ? 'TIMESTAMP DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
      UNIQUE(event_id, user_id)
    )
  `);
};

// Get all events (filter cohort-only events for non-members)
router.get('/', async (req, res) => {
  try {
    // Get user's cohort if authenticated
    let userCohort = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const userRows = await query(`SELECT cohort FROM users WHERE id = ${p(1)}`, [decoded.id]);
        userCohort = userRows[0]?.cohort || null;
      } catch (_) { /* not authenticated — only show public */ }
    }

    // Also get user id for is_registered check
    let userId = null;
    const authHeader2 = req.headers.authorization;
    if (authHeader2 && authHeader2.startsWith('Bearer ')) {
      try {
        const jwt2 = require('jsonwebtoken');
        const dec2 = jwt2.verify(authHeader2.split(' ')[1], process.env.JWT_SECRET || 'your-secret-key');
        userId = dec2.id;
      } catch (_) {}
    }

    let sql, params;
    if (userId && userCohort) {
      sql = `
        SELECT e.*,
               u.firstname || ' ' || u.lastname as createdByName,
               CASE WHEN er.user_id IS NOT NULL THEN 1 ELSE 0 END as is_registered
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN event_registrations er ON er.event_id = e.id AND er.user_id = ${p(1)}
        WHERE e.visibility = 'public' OR e.visibility IS NULL
           OR (e.visibility = 'cohort' AND e.cohort_name = ${p(2)})
        ORDER BY e.date ASC
      `;
      params = [userId, userCohort];
    } else if (userId) {
      sql = `
        SELECT e.*,
               u.firstname || ' ' || u.lastname as createdByName,
               CASE WHEN er.user_id IS NOT NULL THEN 1 ELSE 0 END as is_registered
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN event_registrations er ON er.event_id = e.id AND er.user_id = ${p(1)}
        WHERE e.visibility = 'public' OR e.visibility IS NULL
        ORDER BY e.date ASC
      `;
      params = [userId];
    } else {
      sql = `
        SELECT e.*,
               u.firstname || ' ' || u.lastname as createdByName,
               0 as is_registered
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.visibility = 'public' OR e.visibility IS NULL
        ORDER BY e.date ASC
      `;
      params = [];
    }
    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch events', details: err.message });
  }
});

// Get upcoming events (next 5)
router.get('/upcoming', async (req, res) => {
  try {
    const sql = `
      SELECT e.*,
             u.firstname || ' ' || u.lastname as createdByName
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE (e.visibility = 'public' OR e.visibility IS NULL)
        AND e.date >= ${isPostgreSQL ? 'NOW()' : "datetime('now')"}
      ORDER BY e.date ASC
      LIMIT 5
    `;
    const rows = await query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching upcoming events:', err);
    res.status(500).json({ error: 'Failed to fetch upcoming events', details: err.message });
  }
});

// Create a new event (authenticated users only)
router.post('/', protect, async (req, res) => {
  try {
    const {
      title, description, date, location, category,
      max_attendees, points, visibility, cohort_name, image_url
    } = req.body;
    const createdBy = req.user.id;

    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required' });
    }

    const vis = visibility || 'public';
    // For cohort events, get the creator's cohort if not specified
    let cohortName = null;
    if (vis === 'cohort') {
      if (cohort_name) {
        cohortName = cohort_name;
      } else {
        const userRows = await query(`SELECT cohort FROM users WHERE id = ${p(1)}`, [createdBy]);
        cohortName = userRows[0]?.cohort || null;
      }
    }

    const sql = `
      INSERT INTO events
        (title, description, date, location, category, maxAttendees, points,
         created_by, current_attendees, visibility, cohort_name, image_url)
      VALUES
        (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)},
         ${p(8)}, 0, ${p(9)}, ${p(10)}, ${p(11)})
      ${isPostgreSQL ? 'RETURNING id' : ''}
    `;

    const result = await query(sql, [
      title,
      description || null,
      date,
      location || null,
      category || 'in-person',
      max_attendees || 50,
      points || 50,
      createdBy,
      vis,
      cohortName,
      image_url || null
    ]);

    const eventId = result[0]?.id;

    res.status(201).json({
      message: 'Event created successfully',
      eventId,
      event: { id: eventId, title, date, visibility: vis, cohort_name: cohortName }
    });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Failed to create event', details: err.message });
  }
});

// Register for an event
router.post('/:id/register', protect, async (req, res) => {
  try {
    await ensureRegTable();
    const eventId = req.params.id;
    const userId = req.user.id;

    // Get event details
    const event = await query(
      `SELECT maxAttendees, current_attendees, visibility, cohort_name FROM events WHERE id = ${p(1)}`,
      [eventId]
    );
    if (event.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Cohort access check
    if (event[0].visibility === 'cohort' && event[0].cohort_name) {
      const userRows = await query(`SELECT cohort FROM users WHERE id = ${p(1)}`, [userId]);
      const userCohort = userRows[0]?.cohort;
      if (userCohort !== event[0].cohort_name) {
        return res.status(403).json({ message: 'This event is restricted to cohort members only.' });
      }
    }

    // Check if already registered
    const existing = await query(
      `SELECT id FROM event_registrations WHERE event_id = ${p(1)} AND user_id = ${p(2)}`,
      [eventId, userId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    // Check capacity
    const maxAtt = event[0].maxAttendees || event[0].max_attendees || 50;
    if ((event[0].current_attendees || 0) >= maxAtt) {
      return res.status(400).json({ message: 'Event is full' });
    }

    // Register
    await query(
      `INSERT INTO event_registrations (event_id, user_id) VALUES (${p(1)}, ${p(2)})`,
      [eventId, userId]
    );

    // Update count
    await query(
      `UPDATE events SET current_attendees = current_attendees + 1 WHERE id = ${p(1)}`,
      [eventId]
    );

    // Notify event creator (async, don't block response)
    try {
      const eventFull = await query(
        `SELECT title, created_by FROM events WHERE id = ${p(1)}`, [eventId]
      );
      const registrant = await query(
        `SELECT firstname, lastname FROM users WHERE id = ${p(1)}`, [userId]
      );
      if (eventFull[0]?.created_by && eventFull[0].created_by !== userId) {
        const name = registrant[0] ? `${registrant[0].firstname} ${registrant[0].lastname}` : 'Someone';
        await createNotification({
          userId: eventFull[0].created_by,
          type: 'event_registration',
          title: '🎟️ New Event Registration',
          message: `${name} registered for "${eventFull[0].title}"`,
          referenceId: parseInt(eventId),
          referenceType: 'event'
        });
      }
    } catch (_) { /* notification failure is non-fatal */ }

    res.json({ message: 'Successfully registered for event' });
  } catch (err) {
    console.error('Error registering for event:', err);
    res.status(500).json({ error: 'Failed to register', details: err.message });
  }
});

// Get single event by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await query(
      `SELECT e.*, u.firstname || ' ' || u.lastname as createdByName
       FROM events e LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = ${p(1)}`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({ error: 'Failed to fetch event', details: err.message });
  }
});

// Cancel registration
router.delete('/:id/register', protect, async (req, res) => {
  try {
    await ensureRegTable();
    const eventId = req.params.id;
    const userId = req.user.id;

    const existing = await query(
      `SELECT id FROM event_registrations WHERE event_id = ${p(1)} AND user_id = ${p(2)}`,
      [eventId, userId]
    );
    if (existing.length === 0) {
      return res.status(400).json({ message: 'You are not registered for this event.' });
    }

    await query(
      `DELETE FROM event_registrations WHERE event_id = ${p(1)} AND user_id = ${p(2)}`,
      [eventId, userId]
    );
    await query(
      `UPDATE events SET current_attendees = MAX(0, current_attendees - 1) WHERE id = ${p(1)}`,
      [eventId]
    );

    res.json({ message: 'Registration cancelled successfully.' });
  } catch (err) {
    console.error('Error cancelling registration:', err);
    res.status(500).json({ error: 'Failed to cancel registration', details: err.message });
  }
});

// Update event (creator or admin only)
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userType = req.user.userType || req.user.usertype;

    const event = await query(`SELECT created_by FROM events WHERE id = ${p(1)}`, [id]);
    if (event.length === 0) return res.status(404).json({ error: 'Event not found' });

    if (event[0].created_by !== userId && userType !== 'admin' && userType !== 'founder') {
      return res.status(403).json({ error: 'Not authorized to edit this event' });
    }

    const { title, description, date, location, category, max_attendees, points, visibility, cohort_name, image_url, signup_url } = req.body;

    const updates = [];
    const vals = [];
    let i = 1;

    const addF = (col, val) => { if (val !== undefined) { updates.push(`${col} = ${p(i++)}`); vals.push(val); } };
    addF('title', title);
    addF('description', description);
    addF('date', date);
    addF('location', location);
    addF('category', category);
    addF('maxAttendees', max_attendees);
    addF('points', points);
    addF('visibility', visibility);
    addF('cohort_name', cohort_name);
    addF('image_url', image_url);
    addF('signup_url', signup_url);

    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

    vals.push(id);
    await query(`UPDATE events SET ${updates.join(', ')} WHERE id = ${p(i)}`, vals);
    const updated = await query(`SELECT * FROM events WHERE id = ${p(1)}`, [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'Failed to update event', details: err.message });
  }
});

// Delete event (creator or admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userType = req.user.userType || req.user.usertype;

    const event = await query(`SELECT created_by FROM events WHERE id = ${p(1)}`, [id]);
    if (event.length === 0) return res.status(404).json({ error: 'Event not found' });

    if (event[0].created_by !== userId && userType !== 'admin' && userType !== 'founder') {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    await query(`DELETE FROM events WHERE id = ${p(1)}`, [id]);
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: 'Failed to delete event', details: err.message });
  }
});

module.exports = router;
