const jwt = require('jsonwebtoken');
const config = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_prod';

function generateToken(user) {
    return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

function requireRole(projectIdField, roles) {
    const { getDb } = require('../config/database');
    return (req, res, next) => {
        const projectId = req.params[projectIdField] || req.body.project_id || req.query.project_id;
        if (!projectId) {
            return res.status(400).json({ error: 'Project ID required' });
        }

        const db = getDb();
        db.get(
            `SELECT role FROM project_members WHERE project_id = ? AND user_id = ?`,
            [projectId, req.user.id],
            (err, row) => {
                if (err || !row) {
                    db.close();
                    return res.status(403).json({ error: 'Access denied' });
                }
                if (!roles.includes(row.role) && row.role !== 'owner') {
                    db.close();
                    return res.status(403).json({ error: 'Insufficient permissions' });
                }
                db.close();
                next();
            }
        );
    };
}

function requireProjectAccess(req, res, next) {
    const { getDb } = require('../config/database');
    const projectId = req.params.projectId || req.params.id || req.body.project_id;

    if (!projectId) {
        return next();
    }

    const db = getDb();
    db.get(
        `SELECT p.is_public FROM projects p
         LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
         WHERE p.id = ?`,
        [req.user.id, projectId],
        (err, row) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Database error' });
            }
            if (!row) {
                db.close();
                return res.status(404).json({ error: 'Project not found' });
            }
            if (!row.is_public && !row.pm_role) {
                // Check membership
                db.get(
                    `SELECT role FROM project_members WHERE project_id = ? AND user_id = ?`,
                    [projectId, req.user.id],
                    (err2, memberRow) => {
                        db.close();
                        if (err2 || !memberRow) {
                            return res.status(403).json({ error: 'Access denied to this project' });
                        }
                        req.projectRole = memberRow.role;
                        next();
                    }
                );
            } else {
                db.close();
                next();
            }
        }
    );
}

module.exports = {
    generateToken,
    authenticateToken,
    requireRole,
    requireProjectAccess,
    JWT_SECRET
};
