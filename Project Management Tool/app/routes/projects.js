const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const columnController = require('../controllers/columnController');
const { authenticateToken } = require('../middleware/auth');

// Project routes - static routes before param routes
router.post('/', authenticateToken, projectController.createProject);
router.get('/', authenticateToken, projectController.getProjects);
router.get('/stats', authenticateToken, projectController.getStatistics);

// Task creation within a project
router.post('/:projectId/tasks', authenticateToken, projectController.createProjectTask);

// Member routes
router.post('/:projectId/members', authenticateToken, projectController.addMember);
router.delete('/:projectId/members/:userId', authenticateToken, projectController.removeMember);
router.get('/:projectId/members', authenticateToken, projectController.getMembers);

// Column routes
router.post('/:projectId/columns', authenticateToken, columnController.createColumn);
router.put('/:projectId/columns/:columnId', authenticateToken, columnController.updateColumn);
router.delete('/:projectId/columns/:columnId', authenticateToken, columnController.deleteColumn);
router.post('/:projectId/columns/reorder', authenticateToken, columnController.reorderColumns);

// Project detail routes
router.get('/:projectId', authenticateToken, projectController.getProject);
router.put('/:projectId', authenticateToken, projectController.updateProject);
router.delete('/:projectId', authenticateToken, projectController.deleteProject);

module.exports = router;
