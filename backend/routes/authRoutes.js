const express = require('express');
const { register, login, linkedinAuth } = require('../controllers/authController');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/linkedin', linkedinAuth); // later, frontend will open this for OAuth

module.exports = router;
