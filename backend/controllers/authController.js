const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, company, jobTitle } = req.body;

    // Check if email already registered
    const existingUsers = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and return id
    const inserted = await query(
      `INSERT INTO users (email, password, firstName, lastName, company, jobTitle, points, level)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 1)
       RETURNING id`,
      [email, hashedPassword, firstName, lastName, company || '', jobTitle || '']
    );

    const newUserId = inserted[0].id;

    const token = jwt.sign(
      { id: newUserId, email: email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
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

    const users = await query('SELECT * FROM users WHERE email = $1', [email]);
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

// LinkedIn OAuth Placeholder
const linkedinAuth = async (req, res) => {
  // Here you'd handle OAuth handshake with LinkedIn API
  res.json({ message: 'LinkedIn OAuth not yet implemented.' });
};

module.exports = { register, login, linkedinAuth };
