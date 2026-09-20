const db = require('../../config/database');
const bcrypt = require('bcryptjs');

class User {
  static create(userData, callback) {
    const { username, email, password, full_name, bio } = userData;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const query = `
      INSERT INTO users (username, email, password, full_name, bio)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.run(query, [username, email, hashedPassword, full_name, bio || ''], callback);
  }

  static findByUsername(username, callback) {
    const query = `SELECT * FROM users WHERE username = ?`;
    db.get(query, [username], callback);
  }

  static findByEmail(email, callback) {
    const query = `SELECT * FROM users WHERE email = ?`;
    db.get(query, [email], callback);
  }

  static findById(id, callback) {
    const query = `SELECT id, username, email, full_name, bio, profile_picture, created_at FROM users WHERE id = ?`;
    db.get(query, [id], callback);
  }

  static updateProfile(userId, data, callback) {
    const { full_name, bio, profile_picture } = data;
    const query = `
      UPDATE users SET full_name = ?, bio = ?, profile_picture = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    db.run(query, [full_name, bio, profile_picture, userId], callback);
  }

  static getById(id, callback) {
    const query = `SELECT * FROM users WHERE id = ?`;
    db.get(query, [id], callback);
  }

  static search(query, callback) {
    const searchTerm = `%${query}%`;
    const sql = `
      SELECT id, username, email, full_name, bio, profile_picture, created_at
      FROM users
      WHERE username LIKE ? OR full_name LIKE ?
      ORDER BY username ASC
    `;
    db.all(sql, [searchTerm, searchTerm], callback);
  }

  static getFollowerCount(userId, callback) {
    const query = `SELECT COUNT(*) as count FROM follows WHERE following_id = ?`;
    db.get(query, [userId], callback);
  }

  static getFollowingCount(userId, callback) {
    const query = `SELECT COUNT(*) as count FROM follows WHERE follower_id = ?`;
    db.get(query, [userId], callback);
  }

  static getPostCount(userId, callback) {
    const query = `SELECT COUNT(*) as count FROM posts WHERE user_id = ?`;
    db.get(query, [userId], callback);
  }

  static getFullProfile(userId, callback) {
    const userSql = `SELECT id, username, email, full_name, bio, profile_picture, created_at FROM users WHERE id = ?`;
    const followerSql = `SELECT COUNT(*) as count FROM follows WHERE following_id = ?`;
    const followingSql = `SELECT COUNT(*) as count FROM follows WHERE follower_id = ?`;
    const postsSql = `SELECT COUNT(*) as count FROM posts WHERE user_id = ?`;

    db.get(userSql, [userId], (err, user) => {
      if (err) return callback(err);
      if (!user) return callback(null, null);

      db.get(followerSql, [userId], (err, followerRow) => {
        if (err) return callback(err);
        user.followers_count = followerRow.count;

        db.get(followingSql, [userId], (err, followingRow) => {
          if (err) return callback(err);
          user.following_count = followingRow.count;

          db.get(postsSql, [userId], (err, postsRow) => {
            if (err) return callback(err);
            user.posts_count = postsRow.count;
            callback(null, user);
          });
        });
      });
    });
  }

  static isFollowing(followerId, followingId, callback) {
    const query = `SELECT COUNT(*) as count FROM follows WHERE follower_id = ? AND following_id = ?`;
    db.get(query, [followerId, followingId], callback);
  }

  static follow(followerId, followingId, callback) {
    if (followerId === followingId) {
      return callback(new Error('Cannot follow yourself'));
    }
    const query = `INSERT INTO follows (follower_id, following_id) VALUES (?, ?)`;
    db.run(query, [followerId, followingId], callback);
  }

  static unfollow(followerId, followingId, callback) {
    const query = `DELETE FROM follows WHERE follower_id = ? AND following_id = ?`;
    db.run(query, [followerId, followingId], callback);
  }
}

module.exports = User;