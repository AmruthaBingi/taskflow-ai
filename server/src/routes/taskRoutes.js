const express = require('express');
const requireAuth = require('../middleware/auth');
const { createTask, deleteTask, getTaskStats, listTasks, updateTask } = require('../controllers/taskController');

const router = express.Router();

router.use(requireAuth);
router.get('/stats', getTaskStats);
router.get('/', listTasks);
router.post('/', createTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;