const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class Meeting {
  static generateMeetingCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  static create({ title, description, host_id, has_password = false, password = null, max_participants = 50, scheduled_for = null }) {
    return new Promise((resolve, reject) => {
      const uuid = uuidv4();
      const meeting_code = Meeting.generateMeetingCode();
      const password_hash = has_password && password ? bcrypt.hashSync(password, 12) : null;
      const now = new Date().toISOString();

      const query = `
        INSERT INTO meetings (uuid, meeting_code, title, description, host_id, has_password, password_hash, max_participants, scheduled_for, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.run(
        query,
        [uuid, meeting_code, title, description, host_id, has_password ? 1 : 0, password_hash, max_participants, scheduled_for, now, now],
        function (err) {
          if (err) return reject(err);
          resolve(Meeting.findById(uuid));
        }
      );
    });
  }

  static findById(identifier) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT m.*, u.username as host_username, u.display_name as host_name
        FROM meetings m
        JOIN users u ON m.host_id = u.id
        WHERE (m.uuid = ? OR m.meeting_code = ?) AND m.is_active = 1
      `;
      db.get(query, [identifier, identifier], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static verifyPassword(meeting, password) {
    if (!meeting.has_password) return true;
    if (!meeting.password_hash) return true;
    return bcrypt.compareSync(password, meeting.password_hash);
  }

  static getAllActive() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT m.*, u.display_name as host_name
        FROM meetings m
        JOIN users u ON m.host_id = u.id
        WHERE m.is_active = 1
        ORDER BY m.created_at DESC
        LIMIT 50
      `;
      db.all(query, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static getByUser(userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT m.*, u.display_name as host_name
        FROM meetings m
        JOIN users u ON m.host_id = u.id
        WHERE m.host_id = ? AND m.is_active = 1
        ORDER BY m.created_at DESC
        LIMIT 50
      `;
      db.all(query, [userId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static deleteById(uuid, userId) {
    return new Promise((resolve, reject) => {
      db.run('UPDATE meetings SET is_active = 0 WHERE uuid = ? AND host_id = ?', [uuid, userId], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  static countParticipants(meetingId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM meeting_participants WHERE meeting_id = ? AND joined = 1', [meetingId], (err, row) => {
        if (err) return reject(err);
        resolve(row.count);
      });
    });
  }
}

module.exports = Meeting;