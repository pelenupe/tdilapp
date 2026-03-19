const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getPartnerSchoolAnalytics,
  getSponsorAnalytics,
  recordCheckIn,
  getAdminAnalytics,
  getPartnerSchoolStudents
} = require('../controllers/analyticsController');

// All routes require authentication
router.use(protect);

// Partner school analytics
router.get('/partner-school', getPartnerSchoolAnalytics);
router.get('/partner-school/students', getPartnerSchoolStudents);

// Sponsor analytics
router.get('/sponsor', getSponsorAnalytics);

// Admin analytics
router.get('/admin', getAdminAnalytics);

// Record check-in
router.post('/checkin', recordCheckIn);

module.exports = router;
