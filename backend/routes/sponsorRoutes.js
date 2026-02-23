const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/enhancedAuthMiddleware');
const {
  listSponsors,
  createSponsor,
  updateSponsor,
  createSponsorLocation,
  getNearbySponsors
} = require('../controllers/sponsorController');

router.use(authenticateToken);

// Member-facing
router.get('/nearby', getNearbySponsors);

// Admin-facing management
router.get('/', listSponsors);
router.post('/', createSponsor);
router.put('/:id', updateSponsor);
router.post('/:id/locations', createSponsorLocation);

module.exports = router;
