const express = require('express');
const requireAuth = require('../middleware/auth');
const { changePassword, getCurrentUser, updateCurrentUser } = require('../controllers/userController');

const router = express.Router();

router.get('/me', requireAuth, getCurrentUser);
router.patch('/me', requireAuth, updateCurrentUser);
router.post('/me/password', requireAuth, changePassword);

module.exports = router;