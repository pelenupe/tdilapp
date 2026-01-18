const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { useToken, getTokenInfo } = require('./inviteController');
const { awardPoints } = require('./pointsController');

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, company, jobTitle, inviteToken } = req.body;

    // Check if invite token is provided
    if (!inviteToken) {
      return res.status(400).json({ 
        message: 'An invite token is required to register. Please contact an administrator for an invitation.' 
      });
    }

    // Get token info (supports both reusable and single-use tokens)
    const tokenInfo = await getTokenInfo(inviteToken);

    if (!tokenInfo) {
      return res.status(400).json({ 
        message: 'Invalid or expired invite token. Please contact an administrator for a new invitation.' 
      });
    }

    // If token is associated with a specific email, validate it matches
    if (tokenInfo.email && tokenInfo.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ 
        message: 'This invite token is associated with a different email address.' 
      });
    }

    // Check if email already registered
    const existingUsers = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Use the user type from the invite token
    const userType = tokenInfo.userType || 'member';

    // Create user with the user type from the invite token (RETURNING id is required for PostgreSQL)
    const inserted = await query(
      `INSERT INTO users (email, password, firstname, lastname, company, jobtitle, points, level, usertype)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 1, $7)
       RETURNING id`,
      [email, hashedPassword, firstName, lastName, company || '', jobTitle || '', userType]
    );

    const newUserId = inserted[0].id;

    // Mark invite token as used (or increment count for reusable tokens)
    const tokenUsed = await useToken(inviteToken, newUserId);
    if (!tokenUsed) {
      console.error('Failed to mark invite token as used:', inviteToken);
      // Continue anyway since user is already created
    }

    const jwtToken = jwt.sign(
      { id: newUserId, email: email, userType: userType },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token: jwtToken,
      user: {
        id: newUserId,
        email,
        firstName,
        lastName,
        company: company || '',
        jobTitle: jobTitle || '',
        points: 0,
        level: 1,
        userType: userType
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const users = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = users[0];
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Award points for login (LOGIN_STREAK logic can be enhanced later)
    try {
      // TEMPORARILY DISABLED TO TEST LOGIN
      // await awardPoints(user.id, 'LOGIN_STREAK', 'Daily login bonus');
      console.log('Points awarding temporarily disabled for testing');
    } catch (pointsError) {
      console.error('Error awarding login points:', pointsError);
      // Continue with login even if points award fails
    }

    // Get updated user data after points award
    const updatedUsers = await query('SELECT * FROM users WHERE id = $1', [user.id]);
    const updatedUser = updatedUsers[0];

    const token = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, userType: updatedUser.usertype },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstname,
        lastName: updatedUser.lastname,
        company: updatedUser.company,
        jobTitle: updatedUser.jobtitle,
        points: updatedUser.points,
        level: updatedUser.level,
        userType: updatedUser.usertype || 'member',
        profileImage: updatedUser.profile_image
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// Get current user information
const me = async (req, res) => {
  try {
    // User info is attached by auth middleware
    const userId = req.user.id;

    const users = await query(
      'SELECT id, email, firstname, lastname, company, jobtitle, points, level, usertype, profile_image FROM users WHERE id = $1',
      [userId]
    );
    
    if (!users.length) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstname,
        lastName: user.lastname,
        company: user.company,
        jobTitle: user.jobtitle,
        points: user.points,
        level: user.level,
        userType: user.usertype || 'member',
        profileImage: user.profile_image
      }
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// LinkedIn OAuth Placeholder
const linkedinAuth = async (req, res) => {
  // Here you'd handle OAuth handshake with LinkedIn API
  res.json({ message: 'LinkedIn OAuth not yet implemented.' });
};

module.exports = { register, login, me, linkedinAuth };
