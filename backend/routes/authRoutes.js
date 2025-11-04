const express = require('express');
const { register, login, me, linkedinAuth } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/enhancedAuthMiddleware');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, me);
router.get('/linkedin', linkedinAuth); // later, frontend will open this for OAuth

module.exports = router;
