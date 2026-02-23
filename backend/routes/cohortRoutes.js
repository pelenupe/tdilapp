const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getUserCohort,
  getCohortMembers,
  getAllCohorts,
  addUserToCohort,
  createCohortEvent,
  getCohortEvents,
  registerForEvent
} = require('../controllers/cohortController');

// All routes require authentication
router.use(protect);

// Get user's cohort
router.get('/my-cohort', getUserCohort);

// Get all cohorts
router.get('/', getAllCohorts);

// Get cohort members
router.get('/:cohortId/members', getCohortMembers);

// Add user to cohort
router.post('/add-member', addUserToCohort);

// Cohort events
router.post('/events', createCohortEvent);
router.get('/:cohortId/events', getCohortEvents);
router.post('/events/:eventId/register', registerForEvent);

module.exports = router;
