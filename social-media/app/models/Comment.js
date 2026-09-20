const db = require('../../config/database');

class Comment {
  static create(commentData, callback) {
    const { post_id, user_id, content } = commentData;
    const query = `
      INSERT INTO comments (post_id, user_id, content)
      VALUES (?, ?, ?)
    `;
    db.run(query, [post_id, user_id, content], callback);
  }

  static getByPostId(postId, callback) {
    const query = `
      SELECT c.*, u.username, u.full_name, u.profile_picture
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE post_id = ?
      ORDER BY c.created_at ASC
    `;
    db.all(query, [postId], callback);
  }

  static delete(id, userId, callback) {
    const query = `DELETE FROM comments WHERE id = ? AND user_id = ?`;
    db.run(query, [id, userId], callback);
  }

  static getCount(postId, callback) {
    const query = `SELECT COUNT(*) as count FROM comments WHERE post_id = ?`;
    db.get(query, [postId], callback);
  }
}

module.exports = Comment;