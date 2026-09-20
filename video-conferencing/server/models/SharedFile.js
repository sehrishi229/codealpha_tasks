const db = require('../config/database');

class SharedFile {
  static create({ meeting_id, user_id, filename, original_filename, file_path, file_size, mime_type }) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      const query = `
        INSERT INTO shared_files (meeting_id, user_id, filename, original_filename, file_path, file_size, mime_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.run(
        query,
        [meeting_id, user_id, filename, original_filename, file_path, file_size, mime_type, now],
        function (err) {
          if (err) return reject(err);
          resolve({
            id: this.lastID, meeting_id, user_id, filename, original_filename, file_path, file_size, mime_type, created_at: now
          });
        }
      );
    });
  }

  static getByMeeting(meetingId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT sf.*, u.display_name, u.username
        FROM shared_files sf
        JOIN users u ON sf.user_id = u.id
        WHERE sf.meeting_id = ?
        ORDER BY sf.created_at DESC
      `;
      db.all(query, [meetingId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static deleteByMeeting(meetingId) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM shared_files WHERE meeting_id = ?', [meetingId], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });
  }
}

module.exports = SharedFile;