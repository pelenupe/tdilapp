const express = require('express');
const { generateToken, validateToken, getAllTokens, revokeToken } = require('../controllers/inviteController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// POST /api/invites/generate - Generate new invite token (admin only)
router.post('/generate', protect, generateToken);

// GET /api/invites/validate/:token - Validate invite token (public)
router.get('/validate/:token', validateToken);

// GET /api/invites - Get all invite tokens (admin only)
router.get('/', protect, getAllTokens);

// DELETE /api/invites/:tokenId - Revoke/delete invite token (admin only)
router.delete('/:tokenId', protect, revokeToken);

module.exports = router;
