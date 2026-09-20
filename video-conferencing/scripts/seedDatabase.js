require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../server/config/database');
const initDb = require('../server/config/initDb');

const seedUsers = [
  { username: 'admin', email: 'admin@collabmeet.com', password: 'admin1234', display_name: 'Admin User' },
  { username: 'alice', email: 'alice@collabmeet.com', password: 'alice1234', display_name: 'Alice Johnson' },
  { username: 'bob', email: 'bob@collabmeet.com', password: 'bob1234', display_name: 'Bob Smith' },
  { username: 'charlie', email: 'charlie@collabmeet.com', password: 'charlie1234', display_name: 'Charlie Brown' },
  { username: 'diana', email: 'diana@collabmeet.com', password: 'diana1234', display_name: 'Diana Prince' },
];

const seedMeetings = [
  { title: 'Team Standup', description: 'Daily sync-up meeting', host_username: 'admin', has_password: false },
  { title: 'Project Planning', description: 'Q4 roadmap planning session', host_username: 'alice', has_password: true, password: 'plan2024' },
  { title: 'Client Review', description: 'Weekly client review call', host_username: 'bob', has_password: false },
];

async function seedDatabase() {
  console.log('Initializing database...');
  await initDb();

  console.log('Seeding users...');
  for (const user of seedUsers) {
    const existing = await new Promise((resolve) => {
      db.get('SELECT id FROM users WHERE username = ? OR email = ?', [user.username, user.email], (err, row) => resolve(row));
    });

    if (!existing) {
      const uuid = uuidv4();
      const passwordHash = bcrypt.hashSync(user.password, 12);
      const now = new Date().toISOString();

      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO users (uuid, username, email, password_hash, display_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuid, user.username, user.email, passwordHash, user.display_name, now, now],
          (err) => {
            if (err) reject(err);
            else {
              console.log(`  Created user: ${user.username} (${user.email})`);
              resolve();
            }
          }
        );
      });
    } else {
      console.log(`  User already exists: ${user.username}`);
    }
  }

  console.log('Seeding meetings...');
  for (const meeting of seedMeetings) {
    const host = await new Promise((resolve) => {
      db.get('SELECT id FROM users WHERE username = ?', [meeting.host_username], (err, row) => resolve(row));
    });

    if (host) {
      const existing = await new Promise((resolve) => {
        db.get('SELECT id FROM meetings WHERE title = ? AND host_id = ?', [meeting.title, host.id], (err, row) => resolve(row));
      });

      if (!existing) {
        const meetingUuid = uuidv4();
        const crypto = require('crypto');
        const meetingCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const passwordHash = meeting.has_password ? bcrypt.hashSync(meeting.password, 12) : null;
        const now = new Date().toISOString();

        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO meetings (uuid, meeting_code, title, description, host_id, has_password, password_hash, max_participants, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [meetingUuid, meetingCode, meeting.title, meeting.description, host.id, meeting.has_password ? 1 : 0, passwordHash, 50, now, now],
            (err) => {
              if (err) reject(err);
              else {
                console.log(`  Created meeting: "${meeting.title}" (code: ${meetingCode})`);
                resolve();
              }
            }
          );
        });
      }
    }
  }

  console.log('\nSeeding complete!');
  console.log('Demo users:');
  seedUsers.forEach(u => console.log(`  ${u.email} / ${u.password}`));
  console.log('\nDemo meetings created.');

  process.exit(0);
}

seedDatabase().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});