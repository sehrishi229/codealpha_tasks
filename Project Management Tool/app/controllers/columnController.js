const { BoardColumn, Project, ProjectMember, ActivityLog } = require('../models');
const { broadcastToProject } = require('../websocket/server');

module.exports = {
    createColumn: async (req, res) => {
        try {
            const { name, position } = req.body;
            const project = await Project.getById(req.params.projectId);
            if (!project) return res.status(404).json({ error: 'Project not found' });

            const role = await ProjectMember.getRole(project.id, req.user.id);
            if (!role) return res.status(403).json({ error: 'Access denied' });

            const column = await BoardColumn.create({ project_id: project.id, name, position });

            await ActivityLog.create({
                project_id: project.id, user_id: req.user.id,
                action: 'column_created', entity_type: 'column', entity_id: column.id
            });

            broadcastToProject(project.id, { type: 'column_created', payload: { projectId: project.id, column } });

            res.status(201).json(column);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to create column' });
        }
    },

    updateColumn: async (req, res) => {
        try {
            const project = await Project.getById(req.params.projectId);
            if (!project) return res.status(404).json({ error: 'Project not found' });

            const role = await ProjectMember.getRole(project.id, req.user.id);
            if (!role) return res.status(403).json({ error: 'Access denied' });

            await BoardColumn.update(req.params.columnId, { name: req.body.name });

            await ActivityLog.create({
                project_id: project.id, user_id: req.user.id,
                action: 'column_updated', entity_type: 'column', entity_id: req.params.columnId
            });

            broadcastToProject(project.id, { type: 'column_updated', payload: { columnId: req.params.columnId, name: req.body.name, projectId: project.id } });

            res.json({ message: 'Column updated' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to update column' });
        }
    },

    deleteColumn: async (req, res) => {
        try {
            const project = await Project.getById(req.params.projectId);
            if (!project) return res.status(404).json({ error: 'Project not found' });

            const role = await ProjectMember.getRole(project.id, req.user.id);
            if (!role) return res.status(403).json({ error: 'Access denied' });

            await BoardColumn.delete(req.params.columnId);

            await ActivityLog.create({
                project_id: project.id, user_id: req.user.id,
                action: 'column_deleted', entity_type: 'column', entity_id: req.params.columnId
            });

            broadcastToProject(project.id, { type: 'column_deleted', payload: { columnId: req.params.columnId, projectId: project.id } });

            res.json({ message: 'Column deleted' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to delete column' });
        }
    },

    reorderColumns: async (req, res) => {
        try {
            const { positions } = req.body;
            const project = await Project.getById(req.params.projectId);
            if (!project) return res.status(404).json({ error: 'Project not found' });

            const role = await ProjectMember.getRole(project.id, req.user.id);
            if (!role) return res.status(403).json({ error: 'Access denied' });

            await BoardColumn.reorder(project.id, positions);

            broadcastToProject(project.id, { type: 'columns_reordered', payload: { positions, projectId: project.id } });

            res.json({ message: 'Columns reordered' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to reorder columns' });
        }
    }
};
