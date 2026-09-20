const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class User {
  static create({ username, email, password, display_name }) {
    return new Promise((resolve, reject) => {
      const uuid = uuidv4();
      const passwordHash = bcrypt.hashSync(password, 12);
      const now = new Date().toISOString();

      const query = `
        INSERT INTO users (uuid, username, email, password_hash, display_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      db.run(
        query,
        [uuid, username, email, passwordHash, display_name || username, now, now],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, uuid, username, email, display_name: display_name || username });
        }
      );
    });
  }

  static findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ? AND is_active = 1', [email], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static findByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT id, uuid, username, email, display_name, avatar_url, created_at FROM users WHERE id = ? AND is_active = 1', [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static findByUuid(uuid) {
    return new Promise((resolve, reject) => {
      db.get('SELECT id, uuid, username, email, display_name, avatar_url, created_at FROM users WHERE uuid = ?', [uuid], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static updateLogin(id) {
    db.run('UPDATE users SET last_login = ? WHERE id = ?', [new Date().toISOString(), id]);
  }

  static getAll() {
    return new Promise((resolve, reject) => {
      db.all('SELECT id, uuid, username, email, display_name, avatar_url, is_active, created_at, last_login FROM users ORDER BY created_at DESC', (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static deactivate(id) {
    return new Promise((resolve, reject) => {
      db.run('UPDATE users SET is_active = 0 WHERE id = ?', [id], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });
  }

  static search(query) {
    return new Promise((resolve, reject) => {
      const q = `%${query}%`;
      db.all(
        'SELECT id, uuid, username, email, display_name FROM users WHERE (username LIKE ? OR email LIKE ? OR display_name LIKE ?) AND is_active = 1 LIMIT 20',
        [q, q, q],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  }
}

module.exports = User;