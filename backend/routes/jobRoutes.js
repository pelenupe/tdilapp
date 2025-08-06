const express = require('express');
const { postJob, getJobs, applyJob, getMyApplications } = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Jobs
router.post('/', protect, postJob); // Employers post jobs
router.get('/', protect, getJobs); // All users can view jobs

// Applications
router.post('/apply', protect, applyJob);
router.get('/applications', protect, getMyApplications);

module.exports = router;
