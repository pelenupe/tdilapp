const { query, isPostgreSQL } = require('../config/database');
const crypto = require('crypto');

// Generate a new invite token
const generateToken = async (req, res) => {
  try {
    const { email, expiresInDays, userType = 'member', isReusable = false } = req.body;
    const createdBy = req.user.id;

    // Check if user has admin permissions
    const userCheck = await query('SELECT usertype FROM users WHERE id = $1', [createdBy]);
    const creatorUserType = userCheck[0]?.usertype?.toLowerCase();
    if (!userCheck.length || (creatorUserType !== 'admin' && creatorUserType !== 'founder')) {
      return res.status(403).json({ message: 'Insufficient permissions to create invite tokens' });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiration date (null if not specified - never expires)
    let expiresAtString = null;
    if (expiresInDays) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      expiresAtString = expiresAt.toISOString();
    }

    // Insert token with user_type and is_reusable
    await query(
      'INSERT INTO invite_tokens (token, email, created_by, expires_at, user_type, is_reusable) VALUES ($1, $2, $3, $4, $5, $6)',
      [token, email || null, createdBy, expiresAtString, userType, isReusable]
    );

    // Get the inserted token for response
    const insertedToken = await query('SELECT * FROM invite_tokens WHERE token = $1', [token]);

    return res.status(201).json({
      message: 'Invite token created successfully',
      token: insertedToken[0].token,
      email: insertedToken[0].email,
      userType: insertedToken[0].user_type,
      isReusable: insertedToken[0].is_reusable,
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

    // For reusable tokens, don't check is_used
    // For single-use tokens, check is_used = FALSE
    const result = await query(
      `SELECT * FROM invite_tokens 
       WHERE token = $1 
       AND (is_reusable = TRUE OR is_used = FALSE)
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [token]
    );

    if (!result.length) {
      return res.status(404).json({ message: 'Invalid or expired invite token' });
    }

    return res.json({
      valid: true,
      email: result[0].email,
      userType: result[0].user_type,
      isReusable: result[0].is_reusable,
      message: 'Token is valid'
    });

  } catch (error) {
    console.error('Error validating invite token:', error);
    return res.status(500).json({ message: 'Error validating token' });
  }
};

// Mark token as used (called during registration)
// For reusable tokens, just increment use_count
// For single-use tokens, mark as used
const useToken = async (token, userId) => {
  try {
    // First check if token is reusable
    const tokenCheck = await query('SELECT is_reusable FROM invite_tokens WHERE token = $1', [token]);
    
    if (!tokenCheck.length) {
      return false;
    }

    if (tokenCheck[0].is_reusable) {
      // For reusable tokens, just increment the use count
      await query(
        'UPDATE invite_tokens SET use_count = COALESCE(use_count, 0) + 1 WHERE token = $1',
        [token]
      );
    } else {
      // For single-use tokens, mark as used
      await query(
        'UPDATE invite_tokens SET is_used = TRUE, used_by = $1 WHERE token = $2 AND is_used = FALSE',
        [userId, token]
      );
    }

    return true;
  } catch (error) {
    console.error('Error marking token as used:', error);
    return false;
  }
};

// Get token info (for registration - returns user_type)
const getTokenInfo = async (token) => {
  try {
    const result = await query(
      `SELECT * FROM invite_tokens 
       WHERE token = $1 
       AND (is_reusable = TRUE OR is_used = FALSE)
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [token]
    );
    
    if (!result.length) {
      return null;
    }
    
    return {
      id: result[0].id,
      token: result[0].token,
      email: result[0].email,
      userType: result[0].user_type || 'member',
      isReusable: result[0].is_reusable,
      expiresAt: result[0].expires_at
    };
  } catch (error) {
    console.error('Error getting token info:', error);
    return null;
  }
};

// Get all tokens (admin only)
const getAllTokens = async (req, res) => {
  try {
    const createdBy = req.user.id;

    // Check admin permissions
    const userCheck = await query('SELECT usertype FROM users WHERE id = $1', [createdBy]);
    const userType = userCheck[0]?.usertype?.toLowerCase();
    if (!userCheck.length || (userType !== 'admin' && userType !== 'founder')) {
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

    // Transform to camelCase for frontend
    const transformedTokens = tokens.map(t => ({
      id: t.id,
      token: t.token,
      email: t.email,
      userType: t.user_type,
      isReusable: t.is_reusable,
      useCount: t.use_count || 0,
      isUsed: t.is_used,
      expiresAt: t.expires_at,
      createdAt: t.created_at,
      createdByName: t.created_by_name,
      usedByName: t.used_by_name
    }));

    return res.json(transformedTokens);

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
    const userCheck = await query('SELECT usertype FROM users WHERE id = $1', [userId]);
    const userType = userCheck[0]?.usertype?.toLowerCase();
    if (!userCheck.length || (userType !== 'admin' && userType !== 'founder')) {
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

// Get permanent tokens for display (public - returns just the tokens for each user type)
const getPermanentTokens = async (req, res) => {
  try {
    const tokens = await query(
      `SELECT token, user_type, use_count FROM invite_tokens 
       WHERE is_reusable = TRUE 
       ORDER BY user_type`
    );

    const tokenMap = {};
    tokens.forEach(t => {
      tokenMap[t.user_type] = {
        token: t.token,
        useCount: t.use_count || 0
      };
    });

    return res.json(tokenMap);

  } catch (error) {
    console.error('Error fetching permanent tokens:', error);
    return res.status(500).json({ message: 'Error fetching tokens' });
  }
};

module.exports = { 
  generateToken, 
  validateToken, 
  useToken,
  getTokenInfo,
  getAllTokens, 
  revokeToken,
  getPermanentTokens
};
