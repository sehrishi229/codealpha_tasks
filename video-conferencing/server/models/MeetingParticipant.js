const db = require('../config/database');

class MeetingParticipant {
  static add(participant) {
    return new Promise((resolve, reject) => {
      const { meeting_id, user_id, socket_id, is_host } = participant;
      const now = new Date().toISOString();

      const query = `
        INSERT INTO meeting_participants (meeting_id, user_id, socket_id, is_host, join_time, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      db.run(
        query,
        [meeting_id, user_id, socket_id, is_host ? 1 : 0, now, now],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, ...participant });
        }
      );
    });
  }

  static updateSocketId(participantId, socketId) {
    return new Promise((resolve, reject) => {
      db.run('UPDATE meeting_participants SET socket_id = ? WHERE id = ?', [socketId, participantId], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });
  }

  static remove(meetingId, userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE meeting_participants SET leave_time = ?, joined = 0 WHERE meeting_id = ? AND user_id = ? AND joined = 1',
        [new Date().toISOString(), meetingId, userId],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    });
  }

  static removeBySocketId(socketId) {
    return new Promise((resolve, reject) => {
      db.run('UPDATE meeting_participants SET leave_time = ?, joined = 0 WHERE socket_id = ? AND joined = 1', [new Date().toISOString(), socketId], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });
  }

  static getActiveByMeeting(meetingId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT mp.*, u.username, u.display_name, u.avatar_url
        FROM meeting_participants mp
        JOIN users u ON mp.user_id = u.id
        WHERE mp.meeting_id = ? AND mp.joined = 1
        ORDER BY mp.join_time ASC
      `;
      db.all(query, [meetingId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static getActiveByMeetingDetailed(meetingId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT mp.id, mp.user_id, mp.socket_id, mp.is_host, mp.is_muted, mp.is_video_on, mp.join_time,
               u.username, u.display_name, u.avatar_url
        FROM meeting_participants mp
        JOIN users u ON mp.user_id = u.id
        WHERE mp.meeting_id = ? AND mp.joined = 1
        ORDER BY mp.join_time ASC
      `;
      db.all(query, [meetingId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static isInMeeting(meetingId, userId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM meeting_participants WHERE meeting_id = ? AND user_id = ? AND joined = 1', [meetingId, userId], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static updateMediaSettings(participantId, { is_muted, is_video_on }) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE meeting_participants SET is_muted = ?, is_video_on = ? WHERE id = ?',
        [is_muted ? 1 : 0, is_video_on ? 1 : 0, participantId],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    });
  }

  static removeAllFromMeeting(meetingId) {
    db.run('UPDATE meeting_participants SET joined = 0, leave_time = ? WHERE meeting_id = ? AND joined = 1', [new Date().toISOString(), meetingId]);
  }
}

module.exports = MeetingParticipant;