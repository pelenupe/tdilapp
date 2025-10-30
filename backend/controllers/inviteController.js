const { query } = require('../config/database');
const crypto = require('crypto');

// Generate a new invite token
const generateToken = async (req, res) => {
  try {
    const { email, expiresInDays = 7 } = req.body;
    const createdBy = req.user.id;

    // Check if user has admin permissions (you can add role-based checks here)
    const userCheck = await query('SELECT userType FROM users WHERE id = $1', [createdBy]);
    if (!userCheck.length || (userCheck[0].usertype !== 'admin' && userCheck[0].usertype !== 'founder')) {
      return res.status(403).json({ message: 'Insufficient permissions to create invite tokens' });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const result = await query(
      'INSERT INTO invite_tokens (token, email, created_by, expires_at) VALUES ($1, $2, $3, $4) RETURNING *',
      [token, email, createdBy, expiresAt]
    );

    return res.status(201).json({
      message: 'Invite token created successfully',
      token: result[0].token,
      email: result[0].email,
      expiresAt: result[0].expires_at
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

    const result = await query(
      'SELECT * FROM invite_tokens WHERE token = $1 AND is_used = FALSE AND (expires_at IS NULL OR expires_at > NOW())',
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
    const result = await query(
      'UPDATE invite_tokens SET is_used = TRUE, used_by = $1, updated_at = NOW() WHERE token = $2 AND is_used = FALSE RETURNING *',
      [userId, token]
    );

    return result.length > 0;
  } catch (error) {
    console.error('Error marking token as used:', error);
    return false;
  }
};

// Get all tokens (admin only)
const getAllTokens = async (req, res) => {
  try {
    const createdBy = req.user.id;

    // Check admin permissions
    const userCheck = await query('SELECT userType FROM users WHERE id = $1', [createdBy]);
    if (!userCheck.length || (userCheck[0].usertype !== 'admin' && userCheck[0].usertype !== 'founder')) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const tokens = await query(`
      SELECT 
        it.*,
        creator.firstname || ' ' || creator.lastname as created_by_name,
        user_used.firstname || ' ' || user_used.lastname as used_by_name
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

    // Check admin permissions
    const userCheck = await query('SELECT userType FROM users WHERE id = $1', [userId]);
    if (!userCheck.length || (userCheck[0].usertype !== 'admin' && userCheck[0].usertype !== 'founder')) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const result = await query('DELETE FROM invite_tokens WHERE id = $1', [tokenId]);
    
    if (result.rowCount === 0) {
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
