const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/enhancedAuthMiddleware');
const {
  createConnection,
  getUserConnections,
  getConnectionStats
} = require('../controllers/connectionController');

// All connection routes require authentication
router.use(authenticateToken);

// POST /api/connections - Create a new connection
router.post('/', createConnection);

// GET /api/connections - Get user's connections
router.get('/', getUserConnections);

// GET /api/connections/stats - Get connection stats
router.get('/stats', getConnectionStats);

module.exports = router;
