const db = require('../../config/database');

class Like {
  static create(likeData, callback) {
    const { post_id, user_id } = likeData;
    const query = `INSERT INTO likes (post_id, user_id) VALUES (?, ?)`;
    db.run(query, [post_id, user_id], callback);
  }

  static delete(postId, userId, callback) {
    const query = `DELETE FROM likes WHERE post_id = ? AND user_id = ?`;
    db.run(query, [postId, userId], callback);
  }

  static userLikedPost(postId, userId, callback) {
    const query = `SELECT COUNT(*) as count FROM likes WHERE post_id = ? AND user_id = ?`;
    db.get(query, [postId, userId], callback);
  }

  static getCount(postId, callback) {
    const query = `SELECT COUNT(*) as count FROM likes WHERE post_id = ?`;
    db.get(query, [postId], callback);
  }

  static deletePostLikes(postId, callback) {
    const query = `DELETE FROM likes WHERE post_id = ?`;
    db.run(query, [postId], callback);
  }
}

module.exports = Like;