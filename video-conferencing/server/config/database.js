const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || 'database/app.db';
const fullPath = path.resolve(__dirname, '../../', dbPath);

const dbDir = path.dirname(fullPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(fullPath, (err) => {
  if (err) {
    console.error('SQLite connection error:', err.message);
    process.exit(1);
  }
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');
  console.log('Connected to SQLite database at', fullPath);
});

module.exports = db;