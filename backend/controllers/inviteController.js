const { query, isPostgreSQL } = require('../config/database');
const crypto = require('crypto');

// Generate a new invite token
const generateToken = async (req, res) => {
  try {
    const { email, expiresInDays = 7 } = req.body;
    const createdBy = req.user.id;

    // Check if user has admin permissions (compatible with both databases)
    const userCheck = await query('SELECT userType FROM users WHERE id = ?', [createdBy]);
    const userType = userCheck[0]?.userType?.toLowerCase();
    if (!userCheck.length || (userType !== 'admin' && userType !== 'founder')) {
      return res.status(403).json({ message: 'Insufficient permissions to create invite tokens' });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    const expiresAtString = expiresAt.toISOString();

    // Insert token (compatible with both databases)
    const result = await query(
      'INSERT INTO invite_tokens (token, email, created_by, expires_at) VALUES (?, ?, ?, ?)',
      [token, email, createdBy, expiresAtString]
    );

    // Get the inserted token for response
    const insertedToken = await query('SELECT * FROM invite_tokens WHERE token = ?', [token]);

    return res.status(201).json({
      message: 'Invite token created successfully',
      token: insertedToken[0].token,
      email: insertedToken[0].email,
      expiresAt: insertedToken[0].expires_at
    });

  } catch (error) {
    console.error('Error generating invite token:', error);
    return res.status(500).json({ message: 'Error generating invite token' });
  }
};

// Validate an invite token
const validateToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Database-compatible date and boolean checks
    const dateCheck = isPostgreSQL ? 'expires_at > NOW()' : 'expires_at > datetime(\'now\')';
    const booleanCheck = isPostgreSQL ? 'is_used = FALSE' : 'is_used = 0';

    const result = await query(
      `SELECT * FROM invite_tokens WHERE token = ? AND ${booleanCheck} AND (expires_at IS NULL OR ${dateCheck})`,
      [token]
    );

    if (!result.length) {
      return res.status(404).json({ message: 'Invalid or expired invite token' });
    }

    return res.json({
      valid: true,
      email: result[0].email,
      message: 'Token is valid'
    });

  } catch (error) {
    console.error('Error validating invite token:', error);
    return res.status(500).json({ message: 'Error validating token' });
  }
};

// Mark token as used (called during registration)
const useToken = async (token, userId) => {
  try {
    // Database-compatible boolean and timestamp
    const booleanValue = isPostgreSQL ? 'TRUE' : '1';
    const timestampValue = isPostgreSQL ? 'NOW()' : 'datetime(\'now\')';
    const booleanCheck = isPostgreSQL ? 'is_used = FALSE' : 'is_used = 0';
    
    const result = await query(
      `UPDATE invite_tokens SET is_used = ${booleanValue}, used_by = ? WHERE token = ? AND ${booleanCheck}`,
      [userId, token]
    );

    return isPostgreSQL ? result.rowCount > 0 : result.changes > 0;
  } catch (error) {
    console.error('Error marking token as used:', error);
    return false;
  }
};

// Get all tokens (admin only)
const getAllTokens = async (req, res) => {
  try {
    const createdBy = req.user.id;

    // Check admin permissions (compatible with both databases)
    const userCheck = await query('SELECT userType FROM users WHERE id = ?', [createdBy]);
    const userType = userCheck[0]?.userType?.toLowerCase();
    if (!userCheck.length || (userType !== 'admin' && userType !== 'founder')) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Database-compatible query for getting tokens with user names
    const concatOperator = isPostgreSQL ? '||' : '||';
    const tokens = await query(`
      SELECT 
        it.*,
        creator.firstName ${concatOperator} ' ' ${concatOperator} creator.lastName as created_by_name,
        user_used.firstName ${concatOperator} ' ' ${concatOperator} user_used.lastName as used_by_name
      FROM invite_tokens it
      LEFT JOIN users creator ON it.created_by = creator.id
      LEFT JOIN users user_used ON it.used_by = user_used.id
      ORDER BY it.created_at DESC
    `);

    return res.json(tokens);

  } catch (error) {
    console.error('Error fetching invite tokens:', error);
    return res.status(500).json({ message: 'Error fetching invite tokens' });
  }
};

// Delete/revoke token (admin only)
const revokeToken = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const userId = req.user.id;

    // Check admin permissions (compatible with both databases)
    const userCheck = await query('SELECT userType FROM users WHERE id = ?', [userId]);
    const userType = userCheck[0]?.userType?.toLowerCase();
    if (!userCheck.length || (userType !== 'admin' && userType !== 'founder')) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const result = await query('DELETE FROM invite_tokens WHERE id = ?', [tokenId]);
    
    // Check result based on database type
    const deletedCount = isPostgreSQL ? result.rowCount : result.changes;
    if (deletedCount === 0) {
      return res.status(404).json({ message: 'Token not found' });
    }

    return res.json({ message: 'Token revoked successfully' });

  } catch (error) {
    console.error('Error revoking token:', error);
    return res.status(500).json({ message: 'Error revoking token' });
  }
};

module.exports = { 
  generateToken, 
  validateToken, 
  useToken, 
  getAllTokens, 
  revokeToken 
};
