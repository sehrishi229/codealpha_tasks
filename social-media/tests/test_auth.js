const bcrypt = require('bcryptjs');
const db = require('../config/database');
const User = require('../app/models/User');

async function runTests() {
  console.log('Running tests...');
  console.log('');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.log(`  ✗ ${message}`);
      failed++;
    }
  }

  console.log('1. Password hashing');
  const password = 'testpassword123';
  const hashed = bcrypt.hashSync(password, 10);
  assert(hashed !== password, 'Password is hashed');
  assert(bcrypt.compareSync(password, hashed), 'Hash comparison works');

  console.log('2. User model - findByUsername');
  await new Promise((resolve) => {
    User.findByUsername('demo', (err, user) => {
      assert(err === null, 'No error');
      assert(user !== undefined && user !== null, 'Demo user found');
      assert(user.email === 'demo@social.com', 'Email matches');
      resolve();
    });
  });

  console.log('3. User model - findById');
  await new Promise((resolve) => {
    User.findById(1, (err, user) => {
      assert(err === null, 'No error');
      assert(user.username === 'demo', 'Username matches');
      resolve();
    });
  });

  console.log('4. User model - password verification');
  await new Promise((resolve) => {
    User.findByUsername('demo', (err, user) => {
      assert(bcrypt.compareSync('password123', user.password), 'Password verification works');
      resolve();
    });
  });

  console.log('5. User model - search');
  await new Promise((resolve) => {
    User.search('alice', (err, users) => {
      assert(err === null, 'No error');
      assert(users.length > 0, 'Found users matching search');
      resolve();
    });
  });

  console.log('6. Follow system - prevent self-follow');
  await new Promise((resolve) => {
    User.follow(1, 1, (err) => {
      assert(err !== null, 'Self-follow prevented');
      assert(err.message.includes('yourself') || err.message.includes('SQLITE_CONSTRAINT'), 'Error message correct');
      resolve();
    });
  });

  console.log('');
  console.log('─'.repeat(40));
  console.log(`Results: ${passed} passed, ${failed} failed`);

  db.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});