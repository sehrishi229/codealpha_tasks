const { Project, ProjectMember, BoardColumn, Task, ActivityLog, Notification } = require('../models');
const { broadcastToProject, broadcastToUser } = require('../websocket/server');

module.exports = {
    createProject: async (req, res) => {
        try {
            const { name, description, is_public } = req.body;
            if (!name) return res.status(400).json({ error: 'Project name required' });

            const project = await Project.create({
                name, description: description || '',
                owner_id: req.user.id,
                is_public: is_public ? 1 : 0
            });

            await ProjectMember.add({ project_id: project.id, user_id: req.user.id, role: 'owner' });

            const defaultColumns = ['To Do', 'In Progress', 'Review', 'Done'];
            for (let i = 0; i < defaultColumns.length; i++) {
                await BoardColumn.create({ project_id: project.id, name: defaultColumns[i], position: i });
            }

            await ActivityLog.create({
                project_id: project.id, user_id: req.user.id,
                action: 'project_created', entity_type: 'project', entity_id: project.id
            });

            broadcastToUser(req.user.id, { type: 'project_created', payload: project });

            res.status(201).json(project);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to create project' });
        }
    },

    getProjects: async (req, res) => {
        try {
            const projects = await Project.getAll(req.user.id);
            // Augment with member counts
            const enriched = await Promise.all(projects.map(async p => {
                const memberCount = await ProjectMember.getCount(p.id);
                const taskCount = await Task.getCountByProject(p.id);
                return { ...p, member_count: memberCount, task_count: taskCount };
            }));
            res.json(enriched);
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch projects' });
        }
    },

    getProject: async (req, res) => {
        try {
            const project = await Project.getById(req.params.projectId);
            if (!project) return res.status(404).json({ error: 'Project not found' });

            if (!project.is_public) {
                const role = await ProjectMember.getRole(project.id, req.user.id);
                if (!role) return res.status(403).json({ error: 'Access denied' });
            }

            const columns = await BoardColumn.getByProject(project.id);
            const tasks = {};
            for (const col of columns) {
                tasks[col.id] = await Task.getByColumn(col.id);
            }

            const members = await ProjectMember.getByProject(project.id);
            const role = await ProjectMember.getRole(project.id, req.user.id);

            res.json({ project, columns, tasks, members, role });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch project' });
        }
    },

    updateProject: async (req, res) => {
        try {
            const project = await Project.getById(req.params.projectId);
            if (!project) return res.status(404).json({ error: 'Project not found' });

            const role = await ProjectMember.getRole(project.id, req.user.id);
            if (!role) return res.status(403).json({ error: 'Access denied' });

            const updated = await Project.update(project.id, req.body);

            await ActivityLog.create({
                project_id: project.id, user_id: req.user.id,
                action: 'project_updated', entity_type: 'project', entity_id: project.id
            });

            broadcastToProject(project.id, { type: 'project_updated', payload: { projectId: project.id, updates: req.body } });

            res.json(updated);
        } catch (err) {
            res.status(500).json({ error: 'Failed to update project' });
        }
    },

    deleteProject: async (req, res) => {
        try {
            const project = await Project.getById(req.params.projectId);
            if (!project) return res.status(404).json({ error: 'Project not found' });

            if (project.owner_id !== req.user.id) {
                return res.status(403).json({ error: 'Only owner can delete project' });
            }

            await Project.delete(project.id);

            await ActivityLog.create({
                project_id: project.id, user_id: req.user.id,
                action: 'project_deleted', entity_type: 'project', entity_id: project.id
            });

            broadcastToProject(project.id, { type: 'project_deleted', payload: { projectId: project.id } });

            res.json({ message: 'Project deleted' });
        } catch (err) {
            res.status(500).json({ error: 'Failed to delete project' });
        }
    },

    addMember: async (req, res) => {
        try {
            const { user_id, role } = req.body;
            const project = await Project.getById(req.params.projectId);
            if (!project) return res.status(404).json({ error: 'Project not found' });

            const requesterRole = await ProjectMember.getRole(project.id, req.user.id);
            if (!requesterRole) return res.status(403).json({ error: 'Access denied' });
            if (requesterRole !== 'owner' && requesterRole !== 'admin') {
                return res.status(403).json({ error: 'Only owner/admin can add members' });
            }

            const existing = await ProjectMember.getRole(project.id, user_id);
            if (existing) return res.status(409).json({ error: 'User already a member' });

            await ProjectMember.add({ project_id: project.id, user_id, role: role || 'member' });

            await Notification.create({
                user_id, type: 'project_invitation',
                message: `You were added to project "${project.name}"`,
                project_id: project.id
            });

            await ActivityLog.create({
                project_id: project.id, user_id: req.user.id,
                action: 'member_added', entity_type: 'project_member', entity_id: user_id
            });

            broadcastToUser(user_id, { type: 'notification', payload: { projectId: project.id } });
            broadcastToProject(project.id, { type: 'member_added', payload: { userId: user_id, role: role || 'member' } });

            const members = await ProjectMember.getByProject(project.id);
            res.json(members);
        } catch (err) {
            res.status(500).json({ error: 'Failed to add member' });
        }
    },

    removeMember: async (req, res) => {
        try {
            const project = await Project.getById(req.params.projectId);
            if (!project) return res.status(404).json({ error: 'Project not found' });

            const requesterRole = await ProjectMember.getRole(project.id, req.user.id);
            if (requesterRole !== 'owner' && requesterRole !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const targetRole = await ProjectMember.getRole(project.id, req.params.userId);
            if (!targetRole) return res.status(404).json({ error: 'Member not found' });

            if (req.params.userId == req.user.id && requesterRole !== 'owner') {
                return res.status(403).json({ error: 'Only owner can remove themselves' });
            }
            if (targetRole === 'owner') {
                return res.status(403).json({ error: 'Cannot remove project owner' });
            }

            await ProjectMember.remove(project.id, req.params.userId);

            await ActivityLog.create({
                project_id: project.id, user_id: req.user.id,
                action: 'member_removed', entity_type: 'project_member', entity_id: req.params.userId
            });

            broadcastToProject(project.id, { type: 'member_removed', payload: { userId: req.params.userId } });

            res.json({ message: 'Member removed' });
        } catch (err) {
            res.status(500).json({ error: 'Failed to remove member' });
        }
    },

    getMembers: async (req, res) => {
        try {
            const project = await Project.getById(req.params.projectId);
            if (!project) return res.status(404).json({ error: 'Project not found' });

            const role = await ProjectMember.getRole(project.id, req.user.id);
            if (!role) return res.status(403).json({ error: 'Access denied' });

            const members = await ProjectMember.getByProject(project.id);
            res.json(members);
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch members' });
        }
    },

    getStatistics: async (req, res) => {
        try {
            const projects = await Project.getAll(req.user.id);
            const totalProjects = projects.length;
            const activeTasks = await Task.countActive();
            const completedTasks = await Task.countCompleted();
            const overdueTasks = await Task.countOverdue();

            res.json({ totalProjects, activeTasks, completedTasks, overdueTasks });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch statistics' });
        }
    },

    createProjectTask: async (req, res) => {
        try {
            const { title, description, column_id, priority, due_date, assigned_to } = req.body;
            if (!title) return res.status(400).json({ error: 'Task title required' });

            const projectId = req.params.projectId;
            const project = await Project.getById(projectId);
            if (!project) return res.status(404).json({ error: 'Project not found' });

            const role = await ProjectMember.getRole(project.id, req.user.id);
            if (!role) return res.status(403).json({ error: 'Access denied' });

            const task = await Task.create({
                project_id: project.id,
                column_id: column_id || null,
                title,
                description: description || '',
                assigned_to: assigned_to || null,
                created_by: req.user.id,
                priority: priority || 'medium',
                due_date: due_date || null,
                position: 0
            });

            await ActivityLog.create({
                project_id: project.id, user_id: req.user.id,
                action: 'task_created', entity_type: 'task', entity_id: task.id
            });

            if (assigned_to && assigned_to != req.user.id) {
                await Notification.create({
                    user_id: assigned_to, type: 'task_assigned',
                    message: `Task "${title}" was assigned to you`,
                    project_id: project.id, task_id: task.id
                });
                broadcastToUser(assigned_to, { type: 'notification', payload: { projectId: project.id } });
            }

            const fullTask = await Task.getById(task.id);
            broadcastToProject(project.id, { type: 'task_created', payload: { projectId: project.id, task: fullTask } });

            res.status(201).json(fullTask);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to create task' });
        }
    }
};
