const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/enhancedAuthMiddleware');
const {
  createConnection,
  getUserConnections,
  getConnectionStats,
  checkConnectionStatus,
  getConnectionStatuses,
  removeConnection
} = require('../controllers/connectionController');

// All connection routes require authentication
router.use(authenticateToken);

// POST /api/connections - Create a new connection
router.post('/', createConnection);

// GET /api/connections - Get user's connections
router.get('/', getUserConnections);

// GET /api/connections/stats - Get connection stats
router.get('/stats', getConnectionStats);

// GET /api/connections/status/:targetUserId - Check connection status with specific user
router.get('/status/:targetUserId', checkConnectionStatus);

// POST /api/connections/statuses - Get connection statuses for multiple users (batch)
router.post('/statuses', getConnectionStatuses);

// DELETE /api/connections/:targetUserId - Remove/disconnect from a user
router.delete('/:targetUserId', removeConnection);

module.exports = router;
