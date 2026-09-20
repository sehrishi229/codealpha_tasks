const db = require('../../config/database');

class Post {
  static create(postData, callback) {
    const { user_id, content, image, document } = postData;
    const query = `
      INSERT INTO posts (user_id, content, image, document)
      VALUES (?, ?, ?, ?)
    `;
    db.run(query, [user_id, content, image || null, document || null], callback);
  }

  static getFeed(userId, limit = 20, offset = 0, callback) {
    const query = `
      SELECT p.*, u.username, u.full_name, u.profile_picture,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    db.all(query, [userId, limit, offset], callback);
  }

  static getFeedForFollowed(userId, limit = 20, offset = 0, callback) {
    const query = `
      SELECT p.*, u.username, u.full_name, u.profile_picture,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked
      FROM posts p
      JOIN follows f ON p.user_id = f.following_id
      JOIN users u ON p.user_id = u.id
      WHERE f.follower_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    db.all(query, [userId, userId, limit, offset], callback);
  }

  static getById(id, userId, callback) {
    const query = `
      SELECT p.*, u.username, u.full_name, u.profile_picture,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `;
    db.get(query, [userId, id], callback);
  }

  static getByUserId(userId, callback) {
    const query = `
      SELECT p.*, u.username, u.full_name, u.profile_picture,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `;
    db.all(query, [userId, userId], callback);
  }

  static update(id, userId, data, callback) {
    const { content, image, document } = data;
    const query = `
      UPDATE posts SET content = ?, image = ?, document = COALESCE(?, document), updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;
    db.run(query, [content, image || null, document || null, id, userId], callback);
  }

  static delete(id, userId, callback) {
    const query = `DELETE FROM posts WHERE id = ? AND user_id = ?`;
    db.run(query, [id, userId], callback);
  }

  static userOwnsPost(postId, userId, callback) {
    const query = `SELECT COUNT(*) as count FROM posts WHERE id = ? AND user_id = ?`;
    db.get(query, [postId, userId], callback);
  }
}

module.exports = Post;