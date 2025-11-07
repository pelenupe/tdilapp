const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { useToken } = require('./inviteController');

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, company, jobTitle, inviteToken } = req.body;

    // Check if invite token is provided
    if (!inviteToken) {
      return res.status(400).json({ 
        message: 'An invite token is required to register. Please contact an administrator for an invitation.' 
      });
    }

    // Validate invite token (compatible with both SQLite and PostgreSQL)
    const { isPostgreSQL } = require('../config/database');
    const dateCheck = isPostgreSQL ? 'expires_at > NOW()' : 'expires_at > datetime(\'now\')';
    const booleanCheck = isPostgreSQL ? 'is_used = FALSE' : 'is_used = 0';
    
    const tokenCheck = await query(
      `SELECT * FROM invite_tokens WHERE token = ? AND ${booleanCheck} AND (expires_at IS NULL OR ${dateCheck})`,
      [inviteToken]
    );

    if (!tokenCheck.length) {
      return res.status(400).json({ 
        message: 'Invalid or expired invite token. Please contact an administrator for a new invitation.' 
      });
    }

    const inviteTokenData = tokenCheck[0];

    // If token is associated with a specific email, validate it matches
    if (inviteTokenData.email && inviteTokenData.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ 
        message: 'This invite token is associated with a different email address.' 
      });
    }

    // Check if email already registered
    const existingUsers = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and return id
    const inserted = await query(
      `INSERT INTO users (email, password, firstName, lastName, company, jobTitle, points, level, userType)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1, 'member')`,
      [email, hashedPassword, firstName, lastName, company || '', jobTitle || '']
    );

    const newUserId = inserted[0].id;

    // Mark invite token as used
    const tokenUsed = await useToken(inviteToken, newUserId);
    if (!tokenUsed) {
      console.error('Failed to mark invite token as used:', inviteToken);
      // Continue anyway since user is already created
    }

    const jwtToken = jwt.sign(
      { id: newUserId, email: email },
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
        level: 1
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

    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        jobTitle: user.jobTitle,
        points: user.points,
        level: user.level,
        userType: user.userType || 'member'
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
      'SELECT id, email, firstName, lastName, company, jobTitle, points, level, userType FROM users WHERE id = ?',
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
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        jobTitle: user.jobTitle,
        points: user.points,
        level: user.level,
        userType: user.userType || 'member'
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
