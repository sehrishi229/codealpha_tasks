const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const commentController = require('../controllers/commentController');
const { authenticateToken } = require('../middleware/auth');

router.get('/assigned/me', authenticateToken, taskController.getAssignedTasks);
router.get('/:id', authenticateToken, taskController.getTask);
router.put('/:id', authenticateToken, taskController.updateTask);
router.delete('/:id', authenticateToken, taskController.deleteTask);
router.post('/:id/move', authenticateToken, taskController.moveTask);

// Comments
router.post('/:id/comments', authenticateToken, commentController.addComment);
router.get('/:id/comments', authenticateToken, commentController.getComments);
router.put('/comments/:id', authenticateToken, commentController.updateComment);
router.delete('/comments/:id', authenticateToken, commentController.deleteComment);

module.exports = router;
