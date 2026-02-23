const { query } = require('../config/database');

// Get or create cohort for a user based on alma mater and graduation year
const getOrCreateCohort = async (schoolName, graduationYear, userId) => {
  try {
    // Check if cohort exists
    let cohorts = await query(
      'SELECT * FROM cohorts WHERE schoolName = ? AND graduationYear = ?',
      [schoolName, graduationYear]
    );

    if (cohorts.length > 0) {
      return cohorts[0];
    }

    // Create new cohort
    const cohortName = `${schoolName} - Class of ${graduationYear}`;
    const result = await query(
      `INSERT INTO cohorts (name, schoolName, graduationYear, createdBy) 
       VALUES (?, ?, ?, ?)`,
      [cohortName, schoolName, graduationYear, userId]
    );

    const newCohort = await query(
      'SELECT * FROM cohorts WHERE id = ?',
      [result.lastID]
    );

    // Create group chat for cohort
    await query(
      `INSERT INTO group_chats (name, chat_type, cohort_id, createdBy) 
       VALUES (?, 'cohort', ?, ?)`,
      [cohortName, result.lastID, userId]
    );

    return newCohort[0];
  } catch (error) {
    console.error('Error in getOrCreateCohort:', error);
    throw error;
  }
};

// Add user to cohort
const addUserToCohort = async (req, res) => {
  try {
    const { cohortId, userId, role = 'member' } = req.body;

    // Check if already a member
    const existing = await query(
      'SELECT * FROM cohort_members WHERE cohort_id = ? AND user_id = ?',
      [cohortId, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'User already in cohort' });
    }

    // Add to cohort
    await query(
      'INSERT INTO cohort_members (cohort_id, user_id, role) VALUES (?, ?, ?)',
      [cohortId, userId, role]
    );

    // Update user's cohort_id
    await query('UPDATE users SET cohort_id = ? WHERE id = ?', [cohortId, userId]);

    // Add to cohort group chat
    const groupChats = await query(
      'SELECT id FROM group_chats WHERE cohort_id = ? AND chat_type = ?',
      [cohortId, 'cohort']
    );

    if (groupChats.length > 0) {
      await query(
        'INSERT OR IGNORE INTO group_chat_members (group_chat_id, user_id) VALUES (?, ?)',
        [groupChats[0].id, userId]
      );
    }

    res.json({ message: 'Added to cohort successfully' });
  } catch (error) {
    console.error('Error adding user to cohort:', error);
    res.status(500).json({ message: 'Error adding user to cohort' });
  }
};

// Get user's cohort
const getUserCohort = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's cohort from their profile
    const user = await query('SELECT cohort FROM users WHERE id = $1', [userId]);
    
    if (!user || !user[0] || !user[0].cohort) {
      return res.json(null);
    }

    const cohortName = user[0].cohort;

    // Count members in same cohort
    const memberCount = await query(
      'SELECT COUNT(*) as count FROM users WHERE cohort = $1',
      [cohortName]
    );

    // Get group chat for this cohort
    const groupChat = await query(
      'SELECT id FROM group_chats WHERE cohort = $1',
      [cohortName]
    );

    res.json({
      id: groupChat[0]?.id || 1,
      name: cohortName,
      school_name: cohortName.split(' - ')[0],
      graduation_year: cohortName.split(' ')[cohortName.split(' ').length - 1],
      member_count: memberCount[0].count
    });
  } catch (error) {
    console.error('Error getting user cohort:', error);
    res.status(500).json({ message: 'Error getting cohort' });
  }
};

// Get cohort members
const getCohortMembers = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's cohort
    const user = await query('SELECT cohort FROM users WHERE id = $1', [userId]);
    
    if (!user || !user[0] || !user[0].cohort) {
      return res.json([]);
    }

    const cohortName = user[0].cohort;

    // Get all members in same cohort
    const members = await query(
      `SELECT id, firstName as firstname, lastName as lastname, email, company, jobTitle as jobtitle, 
              profileImage as profile_image, points, level
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

// Get all cohorts
const getAllCohorts = async (req, res) => {
  try {
    const cohorts = await query(
      `SELECT c.*, COUNT(DISTINCT cm.user_id) as member_count
       FROM cohorts c
       LEFT JOIN cohort_members cm ON c.id = cm.cohort_id
       WHERE c.isActive = 1
       GROUP BY c.id
       ORDER BY c.graduationYear DESC, c.schoolName ASC`
    );

    res.json(cohorts);
  } catch (error) {
    console.error('Error getting all cohorts:', error);
    res.status(500).json({ message: 'Error getting cohorts' });
  }
};

// Create cohort event/meetup
const createCohortEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cohortId, title, description, eventDate, location, locationType, maxAttendees } = req.body;

    // Verify user is in cohort
    const membership = await query(
      'SELECT * FROM cohort_members WHERE cohort_id = ? AND user_id = ?',
      [cohortId, userId]
    );

    if (membership.length === 0) {
      return res.status(403).json({ message: 'Not a member of this cohort' });
    }

    // Create event
    const result = await query(
      `INSERT INTO cohort_events 
       (cohort_id, title, description, event_date, location, location_type, max_attendees, createdBy) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [cohortId, title, description, eventDate, location, locationType, maxAttendees, userId]
    );

    // Get group chat for cohort
    const groupChats = await query(
      'SELECT id FROM group_chats WHERE cohort_id = ? AND chat_type = ?',
      [cohortId, 'cohort']
    );

    // Post announcement in group chat
    if (groupChats.length > 0) {
      await query(
        `INSERT INTO group_messages (group_chat_id, sender_id, content, message_type, metadata) 
         VALUES (?, ?, ?, 'event', ?)`,
        [
          groupChats[0].id,
          userId,
          `📅 New event: ${title}`,
          JSON.stringify({ eventId: result.lastID, eventDate, location })
        ]
      );
    }

    const newEvent = await query('SELECT * FROM cohort_events WHERE id = ?', [result.lastID]);
    res.json(newEvent[0]);
  } catch (error) {
    console.error('Error creating cohort event:', error);
    res.status(500).json({ message: 'Error creating event' });
  }
};

// Get cohort events
const getCohortEvents = async (req, res) => {
  try {
    // Return empty array for now - no cohort_events table
    res.json([]);
  } catch (error) {
    console.error('Error getting cohort events:', error);
    res.status(500).json({ message: 'Error getting events' });
  }
};

// Register for cohort event
const registerForEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;

    // Check if already registered
    const existing = await query(
      'SELECT * FROM cohort_event_attendees WHERE cohort_event_id = ? AND user_id = ?',
      [eventId, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    // Register
    await query(
      'INSERT INTO cohort_event_attendees (cohort_event_id, user_id) VALUES (?, ?)',
      [eventId, userId]
    );

    res.json({ message: 'Registered successfully' });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ message: 'Error registering for event' });
  }
};

// Auto-assign user to cohort based on alma mater and graduation year
const autoAssignCohort = async (userId, almaMater, graduationYear) => {
  try {
    if (!almaMater || !graduationYear) {
      return null;
    }

    // Get or create cohort
    const cohort = await getOrCreateCohort(almaMater, graduationYear, userId);

    // Add user to cohort
    const existing = await query(
      'SELECT * FROM cohort_members WHERE cohort_id = ? AND user_id = ?',
      [cohort.id, userId]
    );

    if (existing.length === 0) {
      await query(
        'INSERT INTO cohort_members (cohort_id, user_id) VALUES (?, ?)',
        [cohort.id, userId]
      );

      // Update user's cohort_id
      await query('UPDATE users SET cohort_id = ? WHERE id = ?', [cohort.id, userId]);

      // Add to cohort group chat
      const groupChats = await query(
        'SELECT id FROM group_chats WHERE cohort_id = ? AND chat_type = ?',
        [cohort.id, 'cohort']
      );

      if (groupChats.length > 0) {
        await query(
          'INSERT OR IGNORE INTO group_chat_members (group_chat_id, user_id) VALUES (?, ?)',
          [groupChats[0].id, userId]
        );
      }
    }

    return cohort;
  } catch (error) {
    console.error('Error auto-assigning cohort:', error);
    return null;
  }
};

module.exports = {
  getOrCreateCohort,
  addUserToCohort,
  getUserCohort,
  getCohortMembers,
  getAllCohorts,
  createCohortEvent,
  getCohortEvents,
  registerForEvent,
  autoAssignCohort
};
