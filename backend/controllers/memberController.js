const { query } = require('../config/database');
const { uploadFile } = require('../services/s3Service');

// Fetch all members (with optional filters)
const getMembers = async (req, res) => {
  try {
    const { school, role, skills } = req.query;

    let sql = 'SELECT id, email, firstName, lastName, company, jobTitle, points, level, userType, bio, profileImage FROM users WHERE 1=1';
    const params = [];

    if (role) {
      sql += ' AND userType = ?';
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
    const userId = req.params.id === 'me' ? req.user.id : req.params.id;
    
    const users = await query(
      'SELECT id, email, firstName, lastName, company, jobTitle, points, level, userType, bio, profileImage FROM users WHERE id = ?',
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
      updates.push(`firstName = ?`);
      params.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push(`lastName = ?`);
      params.push(lastName);
    }
    if (company !== undefined) {
      updates.push(`company = ?`);
      params.push(company);
    }
    if (jobTitle !== undefined) {
      updates.push(`jobTitle = ?`);
      params.push(jobTitle);
    }
    if (bio !== undefined) {
      updates.push(`bio = ?`);
      params.push(bio);
    }

    // Handle profileImage from frontend (either profileImage or profilePicUrl)
    if (profileImage !== undefined || profilePicUrl !== undefined) {
      updates.push(`profileImage = ?`);
      params.push(profileImage || profilePicUrl || null);
    }

    // Handle file uploads (if sent as multipart) - Upload to S3
    if (req.files && req.files.profilePic) {
      try {
        const profilePicUrl = await uploadFile(req.files.profilePic[0]);
        updates.push(`profileImage = ?`);
        params.push(profilePicUrl);
        console.log('Profile picture uploaded to S3:', profilePicUrl);
      } catch (error) {
        console.error('S3 upload error:', error);
        return res.status(500).json({ message: 'Failed to upload profile picture' });
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(userId);
    const updateSql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await query(updateSql, params);

    const updatedUsers = await query(
      'SELECT id, email, firstName, lastName, company, jobTitle, points, level, userType, bio, profileImage FROM users WHERE id = ?',
      [userId]
    );
    const updatedUser = updatedUsers[0];
    return res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

module.exports = { getMembers, getProfile, updateProfile };
