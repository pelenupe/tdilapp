const { query } = require('../config/database');
const { uploadFile } = require('../services/s3Service');

// Fetch all members (with optional filters)
const getMembers = async (req, res) => {
  try {
    const { school, role, skills } = req.query;

    let sql = `SELECT id, email, firstname, lastname, company, jobtitle, points, level, usertype, bio, profile_image FROM users WHERE 1=1`;
    const params = [];

    if (role) {
      sql += ' AND usertype = $' + (params.length + 1);
      params.push(role);
    }
    const members = await query(sql, params);
    
    // Transform to camelCase for frontend
    const transformedMembers = members.map(m => ({
      id: m.id,
      email: m.email,
      firstName: m.firstname,
      lastName: m.lastname,
      company: m.company,
      jobTitle: m.jobtitle,
      points: m.points,
      level: m.level,
      userType: m.usertype,
      bio: m.bio,
      profileImage: m.profile_image
    }));
    
    return res.json(transformedMembers);
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
      'SELECT id, email, firstname, lastname, company, jobtitle, points, level, usertype, bio, profile_image FROM users WHERE id = $1',
      [userId]
    );
    const user = users[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Transform to camelCase for frontend
    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstname,
      lastName: user.lastname,
      company: user.company,
      jobTitle: user.jobtitle,
      points: user.points,
      level: user.level,
      userType: user.usertype,
      bio: user.bio,
      profileImage: user.profile_image
    });
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
      updates.push(`firstname = $${params.length + 1}`);
      params.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push(`lastname = $${params.length + 1}`);
      params.push(lastName);
    }
    if (company !== undefined) {
      updates.push(`company = $${params.length + 1}`);
      params.push(company);
    }
    if (jobTitle !== undefined) {
      updates.push(`jobtitle = $${params.length + 1}`);
      params.push(jobTitle);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${params.length + 1}`);
      params.push(bio);
    }

    // Handle profileImage from frontend (either profileImage or profilePicUrl)
    if (profileImage !== undefined || profilePicUrl !== undefined) {
      updates.push(`profile_image = $${params.length + 1}`);
      params.push(profileImage || profilePicUrl || null);
    }

    // Handle file uploads (if sent as multipart) - Upload to S3
    if (req.files && req.files.profilePic) {
      try {
        const uploadedUrl = await uploadFile(req.files.profilePic[0]);
        updates.push(`profile_image = $${params.length + 1}`);
        params.push(uploadedUrl);
        console.log('Profile picture uploaded to S3:', uploadedUrl);
      } catch (error) {
        console.error('S3 upload error:', error);
        return res.status(500).json({ message: 'Failed to upload profile picture' });
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(userId);
    const updateSql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`;
    await query(updateSql, params);

    const updatedUsers = await query(
      'SELECT id, email, firstname, lastname, company, jobtitle, points, level, usertype, bio, profile_image FROM users WHERE id = $1',
      [userId]
    );
    const user = updatedUsers[0];
    
    // Transform to camelCase for frontend
    return res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstname,
        lastName: user.lastname,
        company: user.company,
        jobTitle: user.jobtitle,
        points: user.points,
        level: user.level,
        userType: user.usertype,
        bio: user.bio,
        profileImage: user.profile_image
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

module.exports = { getMembers, getProfile, updateProfile };
