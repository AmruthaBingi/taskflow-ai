const express = require('express');
const requireAuth = require('../middleware/auth');
const { insights, prioritySuggestion, improveTask, taskBreakdown } = require('../controllers/aiController');

const router = express.Router();

router.use(requireAuth);
router.post('/task-breakdown', taskBreakdown);
router.post('/improve-task', improveTask);
router.post('/suggest-priority', prioritySuggestion);
router.get('/insights', insights);

module.exports = router;