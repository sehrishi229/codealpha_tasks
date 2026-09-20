const { Task, BoardColumn, ProjectMember, Project, ActivityLog, Notification } = require('../models');
const { broadcastToProject, broadcastToUser } = require('../websocket/server');

module.exports = {
    createTask: async (req, res) => {
        try {
            const { title, description, column_id, priority, due_date, assigned_to } = req.body;
            if (!title) return res.status(400).json({ error: 'Task title required' });

            const db = require('../config/database').getDb();
            db.get(`SELECT * FROM board_columns WHERE id = ?`, [column_id], async (err, col) => {
                db.close();
                if (err || !col) return res.status(400).json({ error: 'Invalid column' });

                const project = await Project.getById(col.project_id);
                const role = await ProjectMember.getRole(project.id, req.user.id);
                if (!role) return res.status(403).json({ error: 'Access denied' });

                const result = await new Promise((resolve, reject) => {
                    const db = require('../config/database').getDb();
                    db.run(
                        `INSERT INTO tasks (project_id, column_id, title, description, assigned_to, created_by, priority, due_date, position)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [project.id, column_id, title, description || '', assigned_to || null,
                         req.user.id, priority || 'medium', due_date || null, 0],
                        function(e) { db.close(); if (e) reject(e); else resolve({ id: this.lastID }); }
                    );
                });

                await ActivityLog.create({
                    project_id: project.id, user_id: req.user.id,
                    action: 'task_created', entity_type: 'task', entity_id: result.id
                });

                if (assigned_to && assigned_to != req.user.id) {
                    await Notification.create({
                        user_id: assigned_to, type: 'task_assigned',
                        message: `Task "${title}" was assigned to you`,
                        project_id: project.id, task_id: result.id
                    });
                    broadcastToUser(assigned_to, { type: 'notification', payload: { projectId: project.id } });
                }

                const fullTask = await Task.getById(result.id);
                broadcastToProject(project.id, { type: 'task_created', payload: { projectId: project.id, task: fullTask } });

                res.status(201).json(fullTask);
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to create task' });
        }
    },

    getTask: async (req, res) => {
        try {
            const task = await Task.getById(req.params.id);
            if (!task) return res.status(404).json({ error: 'Task not found' });

            const project = await Project.getById(task.project_id);
            const role = await ProjectMember.getRole(task.project_id, req.user.id);
            if (!role) return res.status(403).json({ error: 'Access denied' });

            task.project_name = project.name;
            task.creator = task.creator_username;
            res.json(task);
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch task' });
        }
    },

    updateTask: async (req, res) => {
        try {
            const task = await Task.getById(req.params.id);
            if (!task) return res.status(404).json({ error: 'Task not found' });

            const role = await ProjectMember.getRole(task.project_id, req.user.id);
            if (!role) return res.status(403).json({ error: 'Access denied' });

            const oldValues = { ...task };

            await Task.update(task.id, {
                ...task,
                ...req.body,
                assigned_to: req.body.assigned_to !== undefined ? req.body.assigned_to : task.assigned_to,
                column_id: req.body.column_id !== undefined ? req.body.column_id : task.column_id,
                position: req.body.position !== undefined ? req.body.position : task.position
            });

            if (req.body.assigned_to && req.body.assigned_to != oldValues.assigned_to) {
                await Notification.create({
                    user_id: req.body.assigned_to, type: 'task_assigned',
                    message: `Task "${task.title}" was assigned to you`,
                    project_id: task.project_id, task_id: task.id
                });
                broadcastToUser(req.body.assigned_to, { type: 'notification', payload: { projectId: task.project_id } });
            }

            if (req.body.priority && req.body.priority != oldValues.priority) {
                await Notification.create({
                    user_id: task.assigned_to || req.user.id, type: 'task_priority_changed',
                    message: `Priority of "${task.title}" changed to ${req.body.priority}`,
                    project_id: task.project_id, task_id: task.id
                });
                broadcastToProject(task.project_id, { type: 'task_updated', payload: { taskId: task.id, projectId: task.project_id } });
            }

            await ActivityLog.create({
                project_id: task.project_id, user_id: req.user.id,
                action: 'task_updated', entity_type: 'task', entity_id: task.id
            });

            const updated = await Task.getById(task.id);
            broadcastToProject(task.project_id, { type: 'task_updated', payload: { taskId: task.id, projectId: task.project_id } });

            res.json(updated);
        } catch (err) {
            res.status(500).json({ error: 'Failed to update task' });
        }
    },

    deleteTask: async (req, res) => {
        try {
            const task = await Task.getById(req.params.id);
            if (!task) return res.status(404).json({ error: 'Task not found' });

            const role = await ProjectMember.getRole(task.project_id, req.user.id);
            if (!role) return res.status(403).json({ error: 'Access denied' });
            if (role !== 'owner' && role !== 'admin' && task.created_by != req.user.id) {
                return res.status(403).json({ error: 'Only owner/admin or creator can delete' });
            }

            await Task.delete(task.id);

            await ActivityLog.create({
                project_id: task.project_id, user_id: req.user.id,
                action: 'task_deleted', entity_type: 'task', entity_id: task.id
            });

            broadcastToProject(task.project_id, { type: 'task_deleted', payload: { taskId: task.id, projectId: task.project_id } });

            res.json({ message: 'Task deleted', id: task.id });
        } catch (err) {
            res.status(500).json({ error: 'Failed to delete task' });
        }
    },

    moveTask: async (req, res) => {
        try {
            const { column_id, position } = req.body;
            const task = await Task.getById(req.params.id);
            if (!task) return res.status(404).json({ error: 'Task not found' });

            const role = await ProjectMember.getRole(task.project_id, req.user.id);
            if (!role) return res.status(403).json({ error: 'Access denied' });

            const oldColumnId = task.column_id;
            await Task.move(task.id, column_id, position);

            const db = require('../config/database').getDb();
            db.get(`SELECT name FROM board_columns WHERE id = ?`, [oldColumnId], (err, oldCol) => {
                db.close();
                if (oldCol) {
                    ActivityLog.create({
                        project_id: task.project_id, user_id: req.user.id,
                        action: 'task_moved', entity_type: 'task', entity_id: task.id,
                        details: `"${task.title}" moved from ${oldCol.name} to column ${column_id}`
                    });
                }
            });

            broadcastToProject(task.project_id, { type: 'task_moved', payload: { taskId: task.id, column_id, position, projectId: task.project_id } });

            res.json({ id: task.id, column_id, position });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to move task' });
        }
    },

    getAssignedTasks: async (req, res) => {
        try {
            const tasks = await Task.getByAssignee(req.user.id);
            res.json(tasks);
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch tasks' });
        }
    }
};
