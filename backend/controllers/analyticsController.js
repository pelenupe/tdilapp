const { query } = require('../config/database');

// Get partner school analytics
const getPartnerSchoolAnalytics = async (req, res) => {
  try {
    const partnerId = req.user.id;

    // Verify user is partner school
    if (req.user.userType !== 'partner_school') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const schoolName = req.user.company;

    // Get analytics data
    const analytics = await query(
      `SELECT 
        COUNT(DISTINCT pc.connected_user_id) as total_connections,
        COUNT(DISTINCT CASE WHEN pc.connection_type = 'almaMater' THEN pc.connected_user_id END) as alumni_connections,
        COUNT(DISTINCT lc.user_id) as total_checkins,
        COUNT(DISTINCT CASE WHEN lc.checked_in_at >= datetime('now', '-30 days') THEN lc.user_id END) as checkins_last_30_days,
        COUNT(DISTINCT CASE WHEN lc.checked_in_at >= datetime('now', '-7 days') THEN lc.user_id END) as checkins_last_7_days,
        COUNT(DISTINCT u.id) as total_alumni
       FROM users p
       LEFT JOIN partner_connections pc ON p.id = pc.partner_id
       LEFT JOIN location_checkins lc ON p.id = lc.partner_id
       LEFT JOIN users u ON u.almaMater = p.company
       WHERE p.id = ?`,
      [partnerId]
    );

    // Get recent check-ins
    const recentCheckins = await query(
      `SELECT lc.*, u.slug, u.firstName, u.lastName, u.profileImage, u.almaMater
       FROM location_checkins lc
       INNER JOIN users u ON lc.user_id = u.id
       WHERE lc.partner_id = ?
       ORDER BY lc.checked_in_at DESC
       LIMIT 20`,
      [partnerId]
    );

    // Get connected alumni
    const connectedAlumni = await query(
      `SELECT u.id, u.slug, u.firstName, u.lastName, u.profileImage, u.points, u.level,
              u.graduationYear, pc.connected_at
       FROM partner_connections pc
       INNER JOIN users u ON pc.connected_user_id = u.id
       WHERE pc.partner_id = ? AND pc.connection_type = 'almaMater'
       ORDER BY pc.connected_at DESC
       LIMIT 50`,
      [partnerId]
    );

    // Get alumni by graduation year
    const alumniByYear = await query(
      `SELECT graduationYear, COUNT(*) as count
       FROM users
       WHERE almaMater = ?
       GROUP BY graduationYear
       ORDER BY graduationYear DESC`,
      [schoolName]
    );

    res.json({
      summary: analytics[0],
      recentCheckins,
      connectedAlumni,
      alumniByYear
    });
  } catch (error) {
    console.error('Error getting partner school analytics:', error);
    res.status(500).json({ message: 'Error getting analytics' });
  }
};

// Get sponsor analytics
const getSponsorAnalytics = async (req, res) => {
  try {
    const sponsorId = req.user.id;

    // Verify user is sponsor
    if (req.user.userType !== 'sponsor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get analytics data
    const analytics = await query(
      `SELECT 
        COUNT(DISTINCT pc.connected_user_id) as total_connections,
        COUNT(DISTINCT lc.user_id) as total_checkins,
        COUNT(DISTINCT CASE WHEN lc.checked_in_at >= datetime('now', '-30 days') THEN lc.user_id END) as checkins_last_30_days,
        COUNT(DISTINCT CASE WHEN lc.checked_in_at >= datetime('now', '-7 days') THEN lc.user_id END) as checkins_last_7_days,
        COUNT(DISTINCT CASE WHEN lc.checked_in_at >= datetime('now', '-1 days') THEN lc.user_id END) as checkins_today
       FROM users s
       LEFT JOIN partner_connections pc ON s.id = pc.partner_id
       LEFT JOIN location_checkins lc ON s.id = lc.partner_id
       WHERE s.id = ?`,
      [sponsorId]
    );

    // Get recent check-ins
    const recentCheckins = await query(
      `SELECT lc.*, u.slug, u.firstName, u.lastName, u.profileImage, u.company, u.jobTitle
       FROM location_checkins lc
       INNER JOIN users u ON lc.user_id = u.id
       WHERE lc.partner_id = ?
       ORDER BY lc.checked_in_at DESC
       LIMIT 20`,
      [sponsorId]
    );

    // Get connected members
    const connectedMembers = await query(
      `SELECT u.id, u.slug, u.firstName, u.lastName, u.profileImage, u.points, u.level,
              u.company, u.jobTitle, pc.connected_at
       FROM partner_connections pc
       INNER JOIN users u ON pc.connected_user_id = u.id
       WHERE pc.partner_id = ?
       ORDER BY pc.connected_at DESC
       LIMIT 50`,
      [sponsorId]
    );

    // Get check-ins by day (last 30 days)
    const checkinsByDay = await query(
      `SELECT DATE(checked_in_at) as date, COUNT(*) as count
       FROM location_checkins
       WHERE partner_id = ? AND checked_in_at >= datetime('now', '-30 days')
       GROUP BY DATE(checked_in_at)
       ORDER BY date DESC`,
      [sponsorId]
    );

    res.json({
      summary: analytics[0],
      recentCheckins,
      connectedMembers,
      checkinsByDay
    });
  } catch (error) {
    console.error('Error getting sponsor analytics:', error);
    res.status(500).json({ message: 'Error getting analytics' });
  }
};

// Record location check-in
const recordCheckIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const { locationName, locationType, partnerId, latitude, longitude } = req.body;

    // Award points for check-in
    const pointsAwarded = 10;
    await query('UPDATE users SET points = points + ? WHERE id = ?', [pointsAwarded, userId]);

    // Record check-in
    const result = await query(
      `INSERT INTO location_checkins 
       (user_id, location_name, location_type, partner_id, latitude, longitude, points_awarded) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, locationName, locationType, partnerId, latitude, longitude, pointsAwarded]
    );

    // Log points
    await query(
      `INSERT INTO points_history (userid, points, type, reason) 
       VALUES (?, ?, 'CHECK_IN', ?)`,
      [userId, pointsAwarded, `Checked in at ${locationName}`]
    );

    res.json({
      message: 'Check-in recorded',
      pointsAwarded,
      checkInId: result.lastID
    });
  } catch (error) {
    console.error('Error recording check-in:', error);
    res.status(500).json({ message: 'Error recording check-in' });
  }
};

// Create partner connection (for alma mater auto-connect)
const createPartnerConnection = async (userId, partnerId, connectionType = 'direct_connect') => {
  try {
    await query(
      `INSERT OR IGNORE INTO partner_connections (partner_id, connected_user_id, connection_type) 
       VALUES (?, ?, ?)`,
      [partnerId, userId, connectionType]
    );
  } catch (error) {
    console.error('Error creating partner connection:', error);
  }
};

// Auto-connect to alma mater partner school
const autoConnectAlmaMater = async (userId, almaMater) => {
  try {
    if (!almaMater) return;

    // Find partner school with matching company name
    const partnerSchools = await query(
      `SELECT id FROM users WHERE userType = 'partner_school' AND company = ?`,
      [almaMater]
    );

    if (partnerSchools.length > 0) {
      const partnerId = partnerSchools[0].id;
      
      // Create partner connection
      await createPartnerConnection(userId, partnerId, 'almaMater');

      // Create regular connection
      await query(
        `INSERT OR IGNORE INTO connections (user_id, connected_user_id, status) 
         VALUES (?, ?, 'connected')`,
        [userId, partnerId]
      );

      console.log(`Auto-connected user ${userId} to alma mater partner school ${partnerId}`);
    }
  } catch (error) {
    console.error('Error auto-connecting to alma mater:', error);
  }
};

// Get analytics summary for admin
const getAdminAnalytics = async (req, res) => {
  try {
    // Verify admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Overall stats
    const overallStats = await query(
      `SELECT 
        COUNT(DISTINCT CASE WHEN userType = 'member' THEN id END) as total_members,
        COUNT(DISTINCT CASE WHEN userType = 'partner_school' THEN id END) as total_partners,
        COUNT(DISTINCT CASE WHEN userType = 'sponsor' THEN id END) as total_sponsors,
        COUNT(DISTINCT cohort_id) as total_cohorts,
        (SELECT COUNT(*) FROM connections WHERE status = 'connected') as total_connections,
        (SELECT COUNT(*) FROM location_checkins) as total_checkins,
        (SELECT COUNT(*) FROM cohort_events) as total_events
       FROM users`
    );

    // Cohort summary
    const cohortSummary = await query(
      `SELECT * FROM cohort_summary ORDER BY member_count DESC LIMIT 10`
    );

    // Partner school summary
    const partnerSummary = await query(
      `SELECT * FROM partner_school_analytics ORDER BY total_alumni DESC LIMIT 10`
    );

    // Sponsor summary
    const sponsorSummary = await query(
      `SELECT * FROM sponsor_analytics ORDER BY total_checkins DESC LIMIT 10`
    );

    res.json({
      overall: overallStats[0],
      topCohorts: cohortSummary,
      topPartnerSchools: partnerSummary,
      topSponsors: sponsorSummary
    });
  } catch (error) {
    console.error('Error getting admin analytics:', error);
    res.status(500).json({ message: 'Error getting analytics' });
  }
};

// Get students for partner school
const getPartnerSchoolStudents = async (req, res) => {
  try {
    const partnerId = req.user.id;

    // Verify user is partner school
    if (req.user.userType !== 'partner_school') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const schoolName = req.user.company;

    // Get students who listed this school as alma mater or current school
    const students = await query(
      `SELECT u.id, u.firstName, u.lastName, u.email, u.profileImage, u.points, u.level,
              u.company, u.jobTitle, u.graduationYear, u.almaMater, u.currentSchool,
              u.createdAt, u.lastActive,
              CASE 
                WHEN u.almaMater = ? THEN 'alumni'
                WHEN u.currentSchool = ? THEN 'current'
                ELSE 'other'
              END as student_type
       FROM users u
       WHERE u.userType = 'member' 
       AND (u.almaMater = ? OR u.currentSchool = ?)
       ORDER BY u.points DESC`,
      [schoolName, schoolName, schoolName, schoolName]
    );

    // Get activity for each student
    for (let student of students) {
      // Get recent activity
      const activity = await query(
        `SELECT type, points, reason, created_at
         FROM points_history
         WHERE userid = ?
         ORDER BY created_at DESC
         LIMIT 10`,
        [student.id]
      );
      student.recent_activity = activity;

      // Get check-ins at this school
      const checkins = await query(
        `SELECT COUNT(*) as count, MAX(checked_in_at) as last_checkin
         FROM location_checkins
         WHERE user_id = ? AND partner_id = ?`,
        [student.id, partnerId]
      );
      student.checkin_count = checkins[0]?.count || 0;
      student.last_checkin = checkins[0]?.last_checkin;
    }

    res.json(students);
  } catch (error) {
    console.error('Error getting partner school students:', error);
    res.status(500).json({ message: 'Error getting students' });
  }
};

module.exports = {
  getPartnerSchoolAnalytics,
  getSponsorAnalytics,
  recordCheckIn,
  createPartnerConnection,
  autoConnectAlmaMater,
  getAdminAnalytics,
  getPartnerSchoolStudents
};
