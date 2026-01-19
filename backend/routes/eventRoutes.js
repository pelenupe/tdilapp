const express = require('express');
const { query } = require('../config/database');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Get all events
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT e.*, u.firstname || ' ' || u.lastname as "createdByName"
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      ORDER BY e.date ASC
    `;
    
    const rows = await query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch events', details: err.message });
  }
});

// Get upcoming events
router.get('/upcoming', async (req, res) => {
  try {
    const sql = `
      SELECT e.*, u.firstname || ' ' || u.lastname as "createdByName"
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.date >= NOW()
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
    const { title, description, date, location, category, max_attendees, points } = req.body;
    const createdBy = req.user.id;

    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required' });
    }

    const result = await query(
      `INSERT INTO events (title, description, date, location, category, max_attendees, points, created_by, current_attendees) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0) RETURNING id`,
      [title, description || null, date, location || null, category || 'in-person', max_attendees || 50, points || 50, createdBy]
    );

    const eventId = result[0]?.id;

    res.status(201).json({
      message: 'Event created successfully',
      eventId: eventId,
      event: { id: eventId, title, description, date, location, category, max_attendees, points, created_by: createdBy }
    });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Failed to create event', details: err.message });
  }
});

// Register for an event
router.post('/:id/register', protect, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    // Check if already registered
    const existing = await query(
      'SELECT id FROM event_registrations WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    // Check event capacity
    const event = await query('SELECT max_attendees, current_attendees FROM events WHERE id = $1', [eventId]);
    if (event.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event[0].current_attendees >= event[0].max_attendees) {
      return res.status(400).json({ message: 'Event is full' });
    }

    // Register user
    await query(
      'INSERT INTO event_registrations (event_id, user_id, registered_at) VALUES ($1, $2, NOW())',
      [eventId, userId]
    );

    // Update attendee count
    await query(
      'UPDATE events SET current_attendees = current_attendees + 1 WHERE id = $1',
      [eventId]
    );

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
    const sql = `
      SELECT e.*, u.firstname || ' ' || u.lastname as "createdByName"
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1
    `;
    
    const rows = await query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({ error: 'Failed to fetch event', details: err.message });
  }
});

// Delete event (authenticated, creator or admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userType = req.user.userType;

    // Check if user is owner or admin
    const event = await query('SELECT created_by FROM events WHERE id = $1', [id]);
    if (event.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event[0].created_by !== userId && userType !== 'admin' && userType !== 'founder') {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    await query('DELETE FROM events WHERE id = $1', [id]);
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: 'Failed to delete event', details: err.message });
  }
});

module.exports = router;
