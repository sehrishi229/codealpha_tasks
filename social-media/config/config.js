const path = require('path');
const fs = require('fs');

const config = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'social_media_secret_key_2024',
  database: {
    client: 'sqlite3',
    connection: path.join(__dirname, '..', 'database', 'social_media.db'),
    mysql: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'social_media'
    }
  },
  upload: {
    directory: path.join(__dirname, '..', 'public', 'uploads'),
    limits: {
      fileSize: 5 * 1024 * 1024
    },
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  }
};

const dbDir = path.dirname(config.database.connection);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const uploadDir = config.upload.directory;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

module.exports = config;