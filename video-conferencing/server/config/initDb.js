const fs = require('fs');
const path = require('path');
const db = require('./database');

function initDb() {
  return new Promise((resolve, reject) => {
    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    const cleaned = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = cleaned.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (statements.length === 0) return resolve();

    let i = 0;
    function runNext() {
      if (i >= statements.length) {
        console.log('Database initialized');
        return resolve();
      }
      const stmt = statements[i++];
      db.run(stmt, (err) => {
        if (err) return reject(err);
        runNext();
      });
    }
    runNext();
  });
}

module.exports = initDb;