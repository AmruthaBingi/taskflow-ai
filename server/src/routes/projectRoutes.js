const express = require('express');
const requireAuth = require('../middleware/auth');
const { archiveProject, createProject, getProject, listProjects, updateProject } = require('../controllers/projectController');

const router = express.Router();

router.use(requireAuth);
router.get('/', listProjects);
router.post('/', createProject);
router.get('/:id', getProject);
router.patch('/:id', updateProject);
router.delete('/:id', archiveProject);

module.exports = router;