const express = require('express');
const { postJob, getJobs, getJob, deleteJob, applyJob, getMyApplications, getMyJobs } = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Jobs - Public can view, authenticated can post
router.get('/', getJobs);  // All users can view jobs
router.get('/my-jobs', protect, getMyJobs);  // Get jobs I posted
router.get('/:id', getJob);  // Get single job
router.post('/', protect, postJob);  // Any logged-in user can post jobs
router.delete('/:id', protect, deleteJob);  // Owner or admin can delete

// Applications
router.post('/apply', protect, applyJob);
router.get('/applications/my', protect, getMyApplications);

module.exports = router;
