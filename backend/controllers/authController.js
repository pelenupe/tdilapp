const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, company, jobTitle } = req.body;

    // Check if email already registered
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, existingUser) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error during registration.' });
      }

      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use.' });
      }

      try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const stmt = db.prepare(`
          INSERT INTO users (email, password, firstName, lastName, company, jobTitle, points, level) 
          VALUES (?, ?, ?, ?, ?, ?, 0, 1)
        `);
        
        stmt.run([email, hashedPassword, firstName, lastName, company || '', jobTitle || ''], function(err) {
          if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Server error during registration.' });
          }

          // Issue JWT
          const token = jwt.sign(
            { id: this.lastID, email: email }, 
            process.env.JWT_SECRET || 'your-secret-key', 
            { expiresIn: '7d' }
          );

          res.status(201).json({ 
            token,
            user: {
              id: this.lastID,
              email: email,
              firstName: firstName,
              lastName: lastName,
              company: company || '',
              jobTitle: jobTitle || '',
              points: 0,
              level: 1
            }
          });
        });
        stmt.finalize();
      } catch (hashError) {
        console.error(hashError);
        res.status(500).json({ message: 'Server error during registration.' });
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

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error during login.' });
      }

      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials.' });
      }

      try {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, userType: user.userType }, 
          process.env.JWT_SECRET || 'your-secret-key', 
          { expiresIn: '7d' }
        );

        res.json({ 
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
      } catch (compareError) {
        console.error(compareError);
        res.status(500).json({ message: 'Server error during login.' });
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
