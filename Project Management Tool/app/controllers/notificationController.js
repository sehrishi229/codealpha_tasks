const { Notification } = require('../models');

module.exports = {
    getNotifications: async (req, res) => {
        try {
            const notifications = await Notification.getByUser(req.user.id);
            res.json(notifications);
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    },

    getUnreadCount: async (req, res) => {
        try {
            const count = await Notification.getUnreadCount(req.user.id);
            res.json({ count });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch count' });
        }
    },

    markRead: async (req, res) => {
        try {
            await Notification.markRead(req.params.id);
            res.json({ message: 'Notification marked as read' });
        } catch (err) {
            res.status(500).json({ error: 'Failed to update notification' });
        }
    },

    markAllRead: async (req, res) => {
        try {
            await Notification.markAllRead(req.user.id);
            res.json({ message: 'All notifications marked as read' });
        } catch (err) {
            res.status(500).json({ error: 'Failed to update notifications' });
        }
    }
};
