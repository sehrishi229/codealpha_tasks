const db = require('../config/database');

class ChatMessage {
  static create({ meeting_id, user_id, message, message_type = 'text' }) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      const query = `
        INSERT INTO chat_messages (meeting_id, user_id, message, message_type, created_at)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.run(
        query,
        [meeting_id, user_id, message, message_type, now],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, meeting_id, user_id, message, message_type, created_at: now });
        }
      );
    });
  }

  static getByMeeting(meetingId, limit = 100) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT cm.*, u.display_name, u.username
        FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.meeting_id = ?
        ORDER BY cm.created_at ASC
        LIMIT ?
      `;
      db.all(query, [meetingId, limit], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static deleteByMeeting(meetingId) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM chat_messages WHERE meeting_id = ?', [meetingId], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });
  }
}

module.exports = ChatMessage;