const db = require('../config/database');
const bcrypt = require('bcryptjs');

// ===== USER MODEL =====
const User = {
    create(userData) {
        return new Promise((resolve, reject) => {
            const hashedPassword = bcrypt.hashSync(userData.password, 10);
            const database = db.getDb();
            database.run(
                `INSERT INTO users (username, email, password, full_name, profile_picture)
                 VALUES (?, ?, ?, ?, ?)`,
                [userData.username, userData.email, hashedPassword, userData.full_name, userData.profile_picture || 'default-avatar.png'],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ id: this.lastID, ...userData, password: undefined });
                }
            );
        });
    },

    getById(id) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.get(
                `SELECT id, username, email, full_name, profile_picture, created_at, updated_at FROM users WHERE id = ?`,
                [id],
                (err, row) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(row);
                }
            );
        });
    },

    getByUsername(username) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.get(
                `SELECT * FROM users WHERE username = ?`,
                [username],
                (err, row) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(row);
                }
            );
        });
    },

    getByEmail(email) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
                database.close();
                if (err) return reject(err);
                resolve(row);
            });
        });
    },

    search(query, excludeId = null) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            const sql = excludeId
                ? `SELECT id, username, email, full_name, profile_picture FROM users WHERE username LIKE ? OR email LIKE ? OR full_name LIKE ? LIMIT 20`
                : `SELECT id, username, email, full_name, profile_picture FROM users WHERE username LIKE ? OR email LIKE ? OR full_name LIKE ? LIMIT 20`;
            const pattern = `%${query}%`;
            database.all(sql, [pattern, pattern, pattern], (err, rows) => {
                database.close();
                if (err) return reject(err);
                resolve(rows);
            });
        });
    },

    count() {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
                database.close();
                if (err) return reject(err);
                resolve(row.count);
            });
        });
    }
};

// ===== PROJECT MODEL =====
const Project = {
    create(projectData) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(
                `INSERT INTO projects (name, description, owner_id, is_public)
                 VALUES (?, ?, ?, ?)`,
                [projectData.name, projectData.description, projectData.owner_id, projectData.is_public || 0],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ id: this.lastID, ...projectData });
                }
            );
        });
    },

    getById(id) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.get(
                `SELECT * FROM projects WHERE id = ?`,
                [id],
                (err, row) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(row);
                }
            );
        });
    },

    getAll(userId) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.all(
                `SELECT DISTINCT p.* FROM projects p
                 LEFT JOIN project_members pm ON p.id = pm.project_id
                 WHERE p.owner_id = ? OR pm.user_id = ?
                 ORDER BY p.updated_at DESC`,
                [userId, userId],
                (err, rows) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    },

    update(id, projectData) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(
                `UPDATE projects SET name = ?, description = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [projectData.name, projectData.description, projectData.is_public, id],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ id, ...projectData });
                }
            );
        });
    },

    delete(id) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(`DELETE FROM projects WHERE id = ?`, [id], function(err) {
                database.close();
                if (err) return reject(err);
                resolve({ id });
            });
        });
    }
};

// ===== BOARD COLUMN MODEL =====
const BoardColumn = {
    create(columnData) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(
                `INSERT INTO board_columns (project_id, name, position) VALUES (?, ?, ?)`,
                [columnData.project_id, columnData.name, columnData.position],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ id: this.lastID, ...columnData });
                }
            );
        });
    },

    getByProject(projectId) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.all(
                `SELECT * FROM board_columns WHERE project_id = ? ORDER BY position ASC`,
                [projectId],
                (err, rows) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    },

    update(id, columnData) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(
                `UPDATE board_columns SET name = ? WHERE id = ?`,
                [columnData.name, id],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ id, ...columnData });
                }
            );
        });
    },

    reorder(projectId, positions) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.serialize(() => {
                positions.forEach(p => {
                    database.run(
                        `UPDATE board_columns SET position = ? WHERE id = ?`,
                        [p.position, p.id]
                    );
                });
                database.close();
                resolve();
            });
        });
    },

    delete(id) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(`DELETE FROM board_columns WHERE id = ?`, [id], function(err) {
                database.close();
                if (err) return reject(err);
                resolve({ id });
            });
        });
    }
};

// ===== TASK MODEL =====
const Task = {
    create(taskData) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(
                `INSERT INTO tasks (project_id, column_id, title, description, assigned_to, created_by, priority, due_date, position)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [taskData.project_id, taskData.column_id, taskData.title, taskData.description,
                 taskData.assigned_to, taskData.created_by, taskData.priority || 'medium',
                 taskData.due_date, taskData.position || 0],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ id: this.lastID, ...taskData });
                }
            );
        });
    },

    getById(id) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.get(
                `SELECT t.*, u.username as assignee_name, u.profile_picture as assignee_avatar,
                        c.username as creator_username, c.profile_picture as creator_avatar
                 FROM tasks t
                 LEFT JOIN users u ON t.assigned_to = u.id
                 LEFT JOIN users c ON t.created_by = c.id
                 WHERE t.id = ?`,
                [id],
                (err, row) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(row);
                }
            );
        });
    },

    getByColumn(columnId) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.all(
                `SELECT t.*, u.username as assignee_name, u.profile_picture as assignee_avatar
                 FROM tasks t
                 LEFT JOIN users u ON t.assigned_to = u.id
                 WHERE t.column_id = ? ORDER BY t.position ASC`,
                [columnId],
                (err, rows) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    },

    getByProject(projectId) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.all(
                `SELECT * FROM tasks WHERE project_id = ? ORDER BY position ASC`,
                [projectId],
                (err, rows) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    },

    getByAssignee(userId) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.all(
                `SELECT t.*, u.username as assignee_name, p.name as project_name
                 FROM tasks t
                 LEFT JOIN users u ON t.assigned_to = u.id
                 LEFT JOIN projects p ON t.project_id = p.id
                 WHERE t.assigned_to = ? AND t.column_id IN (
                     SELECT id FROM board_columns WHERE project_id = t.project_id
                 )
                 ORDER BY t.due_date ASC, t.created_at DESC
                 LIMIT 50`,
                [userId],
                (err, rows) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    },

    move(taskId, columnId, position) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(
                `UPDATE tasks SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [columnId, position, taskId],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ taskId, columnId, position });
                }
            );
        });
    },

    update(id, taskData) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(
                `UPDATE tasks SET title = ?, description = ?, assigned_to = ?,
                 priority = ?, due_date = ?, column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [taskData.title, taskData.description, taskData.assigned_to,
                 taskData.priority, taskData.due_date, taskData.column_id,
                 taskData.position, id],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ id, ...taskData });
                }
            );
        });
    },

    delete(id) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(`DELETE FROM tasks WHERE id = ?`, [id], function(err) {
                database.close();
                if (err) return reject(err);
                resolve({ id });
            });
        });
    },

    countActive() {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.get(
                `SELECT COUNT(*) as count FROM tasks WHERE column_id IN (
                    SELECT id FROM board_columns WHERE name NOT IN ('Done', 'Completed')
                )`,
                (err, row) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(row.count);
                }
            );
        });
    },

    countCompleted() {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.get(
                `SELECT COUNT(*) as count FROM tasks WHERE column_id IN (
                    SELECT id FROM board_columns WHERE name IN ('Done', 'Completed')
                )`,
                (err, row) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(row.count);
                }
            );
        });
    },

    countOverdue() {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.get(
                `SELECT COUNT(*) as count FROM tasks WHERE due_date < DATE('now') AND column_id IN (
                    SELECT id FROM board_columns WHERE name NOT IN ('Done', 'Completed')
                )`,
                (err, row) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(row.count);
                }
            );
        });
    },

    getCountByProject(projectId) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.get(
                `SELECT COUNT(*) as count FROM tasks WHERE project_id = ?`,
                [projectId],
                (err, row) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(row ? row.count : 0);
                }
            );
        });
    }
};

// ===== PROJECT MEMBER MODEL =====
const ProjectMember = {
    add(memberData) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(
                `INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)`,
                [memberData.project_id, memberData.user_id, memberData.role || 'member'],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ id: this.lastID, ...memberData });
                }
            );
        });
    },

    getByProject(projectId) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.all(
                `SELECT pm.*, u.username, u.email, u.full_name, u.profile_picture, u.created_at as user_created
                 FROM project_members pm JOIN users u ON pm.user_id = u.id
                 WHERE pm.project_id = ?`,
                [projectId],
                (err, rows) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    },

    getByUser(userId) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.all(
                `SELECT pm.*, p.name as project_name FROM project_members pm JOIN projects p ON pm.project_id = p.id
                 WHERE pm.user_id = ?`,
                [userId],
                (err, rows) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    },

    getRole(projectId, userId) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.get(
                `SELECT role FROM project_members WHERE project_id = ? AND user_id = ?`,
                [projectId, userId],
                (err, row) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(row ? row.role : null);
                }
            );
        });
    },

    updateRole(projectId, userId, role) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(
                `UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?`,
                [role, projectId, userId],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ projectId, userId, role });
                }
            );
        });
    },

    getCount(projectId) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.get(
                `SELECT COUNT(*) as count FROM project_members WHERE project_id = ?`,
                [projectId],
                (err, row) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(row ? row.count : 0);
                }
            );
        });
    },

    remove(projectId, userId) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(
                `DELETE FROM project_members WHERE project_id = ? AND user_id = ?`,
                [projectId, userId],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ projectId, userId });
                }
            );
        });
    }
};

// ===== COMMENT MODEL =====
const Comment = {
    create(commentData) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(
                `INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)`,
                [commentData.task_id, commentData.user_id, commentData.content],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ id: this.lastID, ...commentData });
                }
            );
        });
    },

    getByTask(taskId) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.all(
                `SELECT c.*, u.username, u.full_name, u.profile_picture
                 FROM comments c JOIN users u ON c.user_id = u.id
                 WHERE c.task_id = ? ORDER BY c.created_at ASC`,
                [taskId],
                (err, rows) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    },

    update(id, content) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(
                `UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [content, id],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ id, content });
                }
            );
        });
    },

    delete(id) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(`DELETE FROM comments WHERE id = ?`, [id], function(err) {
                database.close();
                if (err) return reject(err);
                resolve({ id });
            });
        });
    }
};

// ===== NOTIFICATION MODEL =====
const Notification = {
    create(notificationData) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(
                `INSERT INTO notifications (user_id, type, message, project_id, task_id)
                 VALUES (?, ?, ?, ?, ?)`,
                [notificationData.user_id, notificationData.type, notificationData.message,
                 notificationData.project_id, notificationData.task_id],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ id: this.lastID, ...notificationData });
                }
            );
        });
    },

    getByUser(userId, limit = 50) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.all(
                `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
                [userId, limit],
                (err, rows) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    },

    getUnreadCount(userId) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.get(
                `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
                [userId],
                (err, row) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(row ? row.count : 0);
                }
            );
        });
    },

    markRead(id) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(
                `UPDATE notifications SET is_read = 1 WHERE id = ?`,
                [id],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ id });
                }
            );
        });
    },

    markAllRead(userId) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(
                `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
                [userId],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ userId });
                }
            );
        });
    }
};

// ===== ACTIVITY LOG MODEL =====
const ActivityLog = {
    create(activityData) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.run(
                `INSERT INTO activity_log (project_id, user_id, action, entity_type, entity_id, details)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [activityData.project_id, activityData.user_id, activityData.action,
                 activityData.entity_type, activityData.entity_id, activityData.details],
                function(err) {
                    database.close();
                    if (err) return reject(err);
                    resolve({ id: this.lastID, ...activityData });
                }
            );
        });
    },

    getByProject(projectId, limit = 100) {
        return new Promise((resolve, reject) => {
            const database = db.getDb();
            database.all(
                `SELECT al.*, u.username, u.full_name, u.profile_picture
                 FROM activity_log al JOIN users u ON al.user_id = u.id
                 WHERE al.project_id = ? ORDER BY al.created_at DESC LIMIT ?`,
                [projectId, limit],
                (err, rows) => {
                    database.close();
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }
};

module.exports = {
    User, Project, BoardColumn, Task, ProjectMember, Comment, Notification, ActivityLog
};
