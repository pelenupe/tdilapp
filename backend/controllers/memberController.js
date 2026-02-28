const { query } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

// Fetch all members (with optional filters)
const getMembers = async (req, res) => {
  try {
    const { school, role, skills } = req.query;

    let sql = `SELECT id, email, firstName, lastName, company, jobTitle, points, level, userType, bio, profileImage, cohort, prefix, suffix, linkedin_url, calendly_url, resume_url, partner_school_name, partner_school_status FROM users WHERE 1=1`;
    const params = [];

    if (role) {
      sql += ' AND usertype = $' + (params.length + 1);
      params.push(role);
    }
    const members = await query(sql, params);
    
    return res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching members' });
  }
};

// Fetch a single profile
const getProfile = async (req, res) => {
  try {
    // If req.params.id is undefined (from /me route) or 'me', use the authenticated user's ID
    const userId = (!req.params.id || req.params.id === 'me') ? req.user.id : req.params.id;
    
    const users = await query(
      'SELECT id, email, firstName, lastName, company, jobTitle, points, level, userType, bio, profileImage, cohort, prefix, suffix, linkedin_url, calendly_url, resume_url, partner_school_name, partner_school_status FROM users WHERE id = $1',
      [userId]
    );
    const user = users[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, company, jobTitle, bio, profileImage, profilePicUrl } = req.body;
    const userId = req.user.id;

    // Build update query dynamically based on provided fields
    const updates = [];
    const params = [];

    if (firstName !== undefined) {
      updates.push(`firstName = $${params.length + 1}`);
      params.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push(`lastName = $${params.length + 1}`);
      params.push(lastName);
    }
    if (company !== undefined) {
      updates.push(`company = $${params.length + 1}`);
      params.push(company);
    }
    if (jobTitle !== undefined) {
      updates.push(`jobTitle = $${params.length + 1}`);
      params.push(jobTitle);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${params.length + 1}`);
      params.push(bio);
    }
    if (req.body.prefix !== undefined) {
      updates.push(`prefix = $${params.length + 1}`);
      params.push(req.body.prefix || null);
    }
    if (req.body.suffix !== undefined) {
      updates.push(`suffix = $${params.length + 1}`);
      params.push(req.body.suffix || null);
    }
    if (req.body.linkedin_url !== undefined) {
      updates.push(`linkedin_url = $${params.length + 1}`);
      params.push(req.body.linkedin_url || null);
    }
    if (req.body.calendly_url !== undefined) {
      updates.push(`calendly_url = $${params.length + 1}`);
      params.push(req.body.calendly_url || null);
    }
    if (req.body.resume_url !== undefined) {
      updates.push(`resume_url = $${params.length + 1}`);
      params.push(req.body.resume_url || null);
    }
    if (req.body.partner_school_name !== undefined) {
      updates.push(`partner_school_name = $${params.length + 1}`);
      params.push(req.body.partner_school_name || null);
    }
    if (req.body.partner_school_status !== undefined) {
      updates.push(`partner_school_status = $${params.length + 1}`);
      params.push(req.body.partner_school_status || null);
    }

    // Handle profileImage from frontend (either profileImage or profilePicUrl)
    if (profileImage !== undefined || profilePicUrl !== undefined) {
      updates.push(`profileImage = $${params.length + 1}`);
      params.push(profileImage || profilePicUrl || null);
    }

    // Handle file uploads (if sent as multipart) - Save locally
    if (req.files && req.files.profilePic && req.files.profilePic[0]) {
      try {
        const file = req.files.profilePic[0];
        const uploadDir = path.join(__dirname, '../../data/uploads/profile-pics');
        
        // Ensure directory exists
        await fs.mkdir(uploadDir, { recursive: true });
        
        // Generate unique filename
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const filename = `${timestamp}${ext}`;
        const filepath = path.join(uploadDir, filename);
        
        // Write file
        await fs.writeFile(filepath, file.buffer);
        
        // Store relative path in database
        const relativeUrl = `/uploads/profile-pics/${filename}`;
        updates.push(`profileImage = $${params.length + 1}`);
        params.push(relativeUrl);
        console.log('Profile picture uploaded locally:', relativeUrl);
      } catch (error) {
        console.error('File upload error:', error);
        return res.status(500).json({ message: 'Failed to upload profile picture', error: error.message });
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(userId);
    const updateSql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`;
    await query(updateSql, params);

    const updatedUsers = await query(
      'SELECT id, email, firstName, lastName, company, jobTitle, points, level, userType, bio, profileImage, cohort, prefix, suffix, linkedin_url, calendly_url, resume_url, partner_school_name, partner_school_status FROM users WHERE id = $1',
      [userId]
    );
    const user = updatedUsers[0];
    
    return res.json({ 
      message: 'Profile updated successfully',
      user: user
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

module.exports = { getMembers, getProfile, updateProfile };
