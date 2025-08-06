const { User } = require('../models');
const { uploadFile } = require('../services/s3Service');

// Fetch all members (with optional filters)
const getMembers = async (req, res) => {
  try {
    const { school, role, skills } = req.query;

    const where = {};
    if (role) where.role = role;
    // school and skills filtering can be enhanced later if needed

    const members = await User.findAll({
      where,
      attributes: { exclude: ['password'] }
    });

    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching members' });
  }
};

// Fetch a single profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Update profile (bio, photo, resume)
const updateProfile = async (req, res) => {
  try {
    const { bio } = req.body;
    let updateData = { bio };

    // Handle file uploads
    if (req.files) {
      if (req.files.profilePic) {
        const profilePicUrl = await uploadFile(req.files.profilePic[0]);
        updateData.profilePicUrl = profilePicUrl;
      }
      if (req.files.resume) {
        const resumeUrl = await uploadFile(req.files.resume[0]);
        updateData.resumeUrl = resumeUrl;
      }
    }

    await User.update(updateData, { where: { id: req.user.id } });

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

module.exports = { getMembers, getProfile, updateProfile };
