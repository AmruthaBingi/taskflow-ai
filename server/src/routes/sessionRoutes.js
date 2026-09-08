const express = require('express');
const requireAuth = require('../middleware/auth');
const { getCurrentUser } = require('../controllers/userController');

const router = express.Router();

router.get('/', requireAuth, getCurrentUser);

module.exports = router;