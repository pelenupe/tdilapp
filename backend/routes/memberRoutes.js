const express = require('express');
const { getMembers, getProfile, updateProfile } = require('../controllers/memberController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const router = express.Router();

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/', protect, getMembers);
router.get('/:id', protect, getProfile);
router.put('/update', protect, upload.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'resume', maxCount: 1 }
]), updateProfile);

module.exports = router;
