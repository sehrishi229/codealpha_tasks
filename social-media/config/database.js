const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('./config');

const db = new sqlite3.Database(config.database.connection, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
});

module.exports = db;