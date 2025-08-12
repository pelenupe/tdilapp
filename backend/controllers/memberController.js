const { db } = require('../config/database');

// Fetch all members (with optional filters)
const getMembers = async (req, res) => {
  try {
    const { school, role, skills } = req.query;

    let query = 'SELECT id, email, firstName, lastName, company, jobTitle, points, level, userType, bio, profilePicUrl FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND userType = ?';
      params.push(role);
    }

    db.all(query, params, (err, members) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error fetching members' });
      }
      res.json(members);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching members' });
  }
};

// Fetch a single profile
const getProfile = async (req, res) => {
  try {
    const userId = req.params.id === 'me' ? req.user.id : req.params.id;
    
    db.get(
      'SELECT id, email, firstName, lastName, company, jobTitle, points, level, userType, bio, profilePicUrl FROM users WHERE id = ?',
      [userId],
      (err, user) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Error fetching profile' });
        }
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, company, jobTitle, bio } = req.body;
    const userId = req.user.id;

    // Build update query dynamically based on provided fields
    const updates = [];
    const params = [];

    if (firstName !== undefined) {
      updates.push('firstName = ?');
      params.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('lastName = ?');
      params.push(lastName);
    }
    if (company !== undefined) {
      updates.push('company = ?');
      params.push(company);
    }
    if (jobTitle !== undefined) {
      updates.push('jobTitle = ?');
      params.push(jobTitle);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(bio);
    }

    // Handle file uploads (simplified for now - can enhance later)
    if (req.files && req.files.profilePic) {
      // For now, just store a placeholder. In production, upload to S3 or similar
      updates.push('profilePicUrl = ?');
      params.push('/uploads/profile-pics/' + Date.now() + '.jpg');
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(userId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

    db.run(query, params, function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error updating profile' });
      }

      // Fetch updated user data
      db.get(
        'SELECT id, email, firstName, lastName, company, jobTitle, points, level, userType, bio, profilePicUrl FROM users WHERE id = ?',
        [userId],
        (err, updatedUser) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error fetching updated profile' });
          }
          res.json({ 
            message: 'Profile updated successfully',
            user: updatedUser 
          });
        }
      );
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

module.exports = { getMembers, getProfile, updateProfile };
