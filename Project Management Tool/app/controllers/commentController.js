const { Comment, Task, Project, ProjectMember, Notification, ActivityLog } = require('../models');
const { broadcastToProject, broadcastToUser } = require('../websocket/server');

module.exports = {
    addComment: async (req, res) => {
        try {
            const { content } = req.body;
            if (!content || !content.trim()) return res.status(400).json({ error: 'Comment content required' });

            const task = await Task.getById(req.params.id);
            if (!task) return res.status(404).json({ error: 'Task not found' });

            const role = await ProjectMember.getRole(task.project_id, req.user.id);
            if (!role) return res.status(403).json({ error: 'Access denied' });

            const comment = await Comment.create({ task_id: task.id, user_id: req.user.id, content });

            await ActivityLog.create({
                project_id: task.project_id, user_id: req.user.id,
                action: 'comment_added', entity_type: 'comment', entity_id: comment.id
            });

            if (task.assigned_to && task.assigned_to != req.user.id) {
                await Notification.create({
                    user_id: task.assigned_to, type: 'comment',
                    message: `New comment on "${task.title}"`,
                    project_id: task.project_id, task_id: task.id
                });
                broadcastToUser(task.assigned_to, { type: 'notification', payload: { projectId: task.project_id } });
            }

            broadcastToProject(task.project_id, { type: 'comment_added', payload: { taskId: task.id, projectId: task.project_id, comment } });

            res.status(201).json(comment);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to add comment' });
        }
    },

    getComments: async (req, res) => {
        try {
            const task = await Task.getById(req.params.id);
            if (!task) return res.status(404).json({ error: 'Task not found' });

            const role = await ProjectMember.getRole(task.project_id, req.user.id);
            if (!role) return res.status(403).json({ error: 'Access denied' });

            const comments = await Comment.getByTask(task.id);
            res.json(comments);
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch comments' });
        }
    },

    updateComment: async (req, res) => {
        try {
            const db = require('../config/database').getDb();
            db.get(`SELECT c.*, t.project_id FROM comments c JOIN tasks t ON c.task_id = t.id WHERE c.id = ?`, [req.params.id], async (err, row) => {
                db.close();
                if (err || !row) return res.status(404).json({ error: 'Comment not found' });

                const role = await ProjectMember.getRole(row.project_id, req.user.id);
                if (!role) return res.status(403).json({ error: 'Access denied' });

                if (row.user_id != req.user.id && role !== 'owner' && role !== 'admin') {
                    return res.status(403).json({ error: 'Only comment author or admin can edit' });
                }

                await Comment.update(req.params.id, req.body.content);
                const updated = await Comment.getByTask(row.task_id).then(rows => rows.find(c => c.id == req.params.id));

                broadcastToProject(row.project_id, { type: 'comment_updated', payload: { commentId: req.params.id, content: req.body.content, taskId: row.task_id } });

                res.json(updated);
            });
        } catch (err) {
            res.status(500).json({ error: 'Failed to update comment' });
        }
    },

    deleteComment: async (req, res) => {
        try {
            const db = require('../config/database').getDb();
            db.get(`SELECT c.*, t.project_id FROM comments c JOIN tasks t ON c.task_id = t.id WHERE c.id = ?`, [req.params.id], async (err, row) => {
                db.close();
                if (err || !row) return res.status(404).json({ error: 'Comment not found' });

                const role = await ProjectMember.getRole(row.project_id, req.user.id);
                if (!role) return res.status(403).json({ error: 'Access denied' });

                if (row.user_id != req.user.id && role !== 'owner' && role !== 'admin') {
                    return res.status(403).json({ error: 'Only comment author or admin can delete' });
                }

                await Comment.delete(req.params.id);

                broadcastToProject(row.project_id, { type: 'comment_deleted', payload: { commentId: req.params.id, taskId: row.task_id } });

                res.json({ message: 'Comment deleted', id: req.params.id });
            });
        } catch (err) {
            res.status(500).json({ error: 'Failed to delete comment' });
        }
    }
};
