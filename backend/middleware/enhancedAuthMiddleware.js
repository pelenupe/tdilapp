const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { query } = require('../config/database');

// Enhanced authentication middleware with session management
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // For simple JWT tokens (no session tracking), just validate user exists and is active
    const userCheck = await query(
      'SELECT id, email, usertype, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userCheck.length === 0) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userCheck[0];
    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Account deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    req.user = {
      id: decoded.id,
      email: user.email,
      userType: decoded.userType || user.usertype,
      sessionId: null // Simple JWT doesn't have sessions
    };

    // Update last activity (non-critical - silently ignore errors)
    try {
      await query(
        'UPDATE users SET updatedat = NOW() WHERE id = $1',
        [decoded.id]
      );
    } catch (updateErr) {
      // Column may not exist - non-critical, just log
      console.log('Note: updatedat column not available');
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.userType)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// Rate limiting for authentication endpoints
const authRateLimit = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Disable trust proxy validation to allow running behind nginx
  validate: { trustProxy: false },
  handler: (req, res) => {
    // Log suspicious activity
    logAuditEvent(null, 'RATE_LIMIT_EXCEEDED', 'auth', null, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    }, req.ip, req.get('User-Agent'));

    res.status(429).json({
      error: 'Too many authentication attempts, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) / 1000 / 60)
    });
  }
});

// Password strength validation
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate secure tokens
const generateTokens = async (userId, userType, sessionId) => {
  const accessToken = jwt.sign(
    { 
      id: userId, 
      userType,
      sessionId,
      type: 'access'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { 
      id: userId, 
      sessionId,
      type: 'refresh'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

// Create user session
const createUserSession = async (userId, refreshToken, req) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  const sessionResult = await query(
    `INSERT INTO user_sessions 
     (user_id, refresh_token, expires_at) 
     VALUES ($1, $2, $3)`,
    [
      userId,
      refreshToken,
      expiresAt.toISOString()
    ]
  );

  return sessionResult[0].id;
};

// Refresh token middleware
const refreshTokenMiddleware = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ 
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ 
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Check if session exists and is active
    const session = await query(
      `SELECT us.*, u.usertype, u.is_active 
       FROM user_sessions us 
       JOIN users u ON us.user_id = u.id 
       WHERE us.id = $1 AND us.refresh_token = $2 AND us.is_active = TRUE AND us.expires_at > NOW()`,
      [decoded.sessionId, refreshToken]
    );

    if (session.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid or expired refresh token',
        code: 'REFRESH_TOKEN_INVALID'
      });
    }

    if (!session[0].is_active) {
      return res.status(401).json({ 
        error: 'Account deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    req.user = {
      id: decoded.id,
      userType: session[0].usertype,
      sessionId: decoded.sessionId
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid refresh token',
        code: 'REFRESH_TOKEN_INVALID'
      });
    }

    console.error('Refresh token error:', error);
    return res.status(500).json({ 
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
};

// Logout and invalidate session
const logoutUser = async (userId, sessionId) => {
  try {
    await query(
      'UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1 AND id = $2',
      [userId, sessionId]
    );
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
};

// Logout all sessions for user
const logoutAllSessions = async (userId) => {
  try {
    await query(
      'UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1',
      [userId]
    );
    return true;
  } catch (error) {
    console.error('Logout all sessions error:', error);
    return false;
  }
};

// Audit logging function
const logAuditEvent = async (userId, action, resourceType, resourceId, details, ipAddress, userAgent) => {
  try {
    await query(
      `INSERT INTO audit_log 
       (user_id, action, resource_type, resource_id, details, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, action, resourceType, resourceId, JSON.stringify(details), ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

// Clean up expired sessions (should be run periodically)
const cleanupExpiredSessions = async () => {
  try {
    const result = await query(
      'UPDATE user_sessions SET is_active = FALSE WHERE expires_at < NOW() AND is_active = TRUE'
    );
    console.log(`Cleaned up ${result.rowCount || 0} expired sessions`);
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authRateLimit,
  validatePasswordStrength,
  generateTokens,
  createUserSession,
  refreshTokenMiddleware,
  logoutUser,
  logoutAllSessions,
  logAuditEvent,
  cleanupExpiredSessions
};
