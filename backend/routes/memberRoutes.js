const express = require('express');
const { getMembers, getProfile, updateProfile } = require('../controllers/memberController');
const { authenticateToken } = require('../middleware/enhancedAuthMiddleware');
const multer = require('multer');
const router = express.Router();

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// All routes require authentication
router.use(authenticateToken);

// GET /api/members - Get all members
router.get('/', getMembers);

// GET /api/members/me - Get current user's profile
router.get('/me', (req, res) => getProfile(req, res));

// GET /api/members/:id - Get specific member profile
router.get('/:id', getProfile);

// PUT /api/members/update - Update current user's profile
router.put('/update', upload.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'resume', maxCount: 1 }
]), updateProfile);

module.exports = router;
