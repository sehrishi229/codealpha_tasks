const bcrypt = require('bcryptjs');
const db = require('../config/database');

const seedUsers = [
  { username: 'demo', email: 'demo@social.com', password: 'password123', full_name: 'Demo User', bio: 'This is a demo account.' },
  { username: 'alice', email: 'alice@social.com', password: 'password123', full_name: 'Alice Johnson', bio: 'Coffee enthusiast and photographer.' },
  { username: 'bob', email: 'bob@social.com', password: 'password123', full_name: 'Bob Smith', bio: 'Software developer by day, gamer by night.' },
  { username: 'charlie', email: 'charlie@social.com', password: 'password123', full_name: 'Charlie Brown', bio: 'Music lover and traveler.' },
  { username: 'diana', email: 'diana@social.com', password: 'password123', full_name: 'Diana Prince', bio: 'Artist and dreamer.' },
  { username: 'edward', email: 'edward@social.com', password: 'password123', full_name: 'Edward Norton', bio: 'Writer and bookworm.' }
];

const seedPosts = [
  { user_id: 2, content: 'Just finished reading an amazing book about Node.js! Highly recommend for anyone looking to improve their backend skills. #NodeJS #Programming', image: null },
  { user_id: 1, content: 'Welcome to our mini social media platform! This is a demo post to show how the feed works.', image: null },
  { user_id: 3, content: 'Working on a new project today. The view from my desk is amazing!', image: null },
  { user_id: 2, content: 'Coffee + Code = Perfect morning ☕', image: null },
  { user_id: 4, content: 'Just got back from a photography walk. The city looks beautiful in autumn light.', image: null },
  { user_id: 1, content: 'Testing out the image upload feature. This platform is coming together nicely!', image: null },
  { user_id: 5, content: 'New song release this Friday! Pre-save links coming soon. #Music #NewRelease', image: null },
  { user_id: 3, content: 'Tips for staying productive while working from home:', image: null },
  { user_id: 2, content: 'Weekend plans: hiking, reading, and maybe some coding. What about you?', image: null },
  { user_id: 4, content: 'My workspace setup tour is now live on the blog!', image: null }
];

const seedComments = [
  { post_id: 1, user_id: 5, content: 'Thanks for the recommendation! Will check it out.' },
  { post_id: 1, user_id: 6, content: 'I second this - great resource!' },
  { post_id: 2, user_id: 3, content: 'Looks interesting!' },
  { post_id: 4, user_id: 1, content: 'That coffee looks amazing! ☕' },
  { post_id: 5, user_id: 2, content: 'Beautiful shot!' },
  { post_id: 7, user_id: 1, content: 'Excited for the release!' },
  { post_id: 8, user_id: 4, content: 'Need these tips in my life.' },
  { post_id: 9, user_id: 1, content: 'Hiking sounds great. Any recommendations?' }
];

const seedLikes = [
  { post_id: 1, user_id: 1 }, { post_id: 1, user_id: 3 }, { post_id: 1, user_id: 4 },
  { post_id: 2, user_id: 2 }, { post_id: 2, user_id: 3 },
  { post_id: 3, user_id: 1 }, { post_id: 3, user_id: 5 },
  { post_id: 4, user_id: 3 }, { post_id: 4, user_id: 6 },
  { post_id: 5, user_id: 1 }, { post_id: 5, user_id: 2 }, { post_id: 5, user_id: 4 },
  { post_id: 7, user_id: 1 }, { post_id: 7, user_id: 4 },
  { post_id: 8, user_id: 1 }, { post_id: 8, user_id: 2 }, { post_id: 8, user_id: 5 },
  { post_id: 9, user_id: 1 }, { post_id: 9, user_id: 3 }, { post_id: 9, user_id: 6 },
  { post_id: 10, user_id: 2 }, { post_id: 10, user_id: 4 }
];

const seedFollows = [
  { follower_id: 1, following_id: 2 },
  { follower_id: 1, following_id: 3 },
  { follower_id: 1, following_id: 4 },
  { follower_id: 2, following_id: 1 },
  { follower_id: 2, following_id: 5 },
  { follower_id: 3, following_id: 1 },
  { follower_id: 3, following_id: 2 },
  { follower_id: 4, following_id: 1 },
  { follower_id: 5, following_id: 2 },
  { follower_id: 6, following_id: 1 },
  { follower_id: 6, following_id: 3 }
];

db.serialize(() => {
  console.log('Starting database seed...');

  const insertUser = db.prepare('INSERT INTO users (username, email, password, full_name, bio) VALUES (?, ?, ?, ?, ?)');
  seedUsers.forEach(user => {
    const hashedPassword = bcrypt.hashSync(user.password, 10);
    insertUser.run(user.username, user.email, hashedPassword, user.full_name, user.bio);
  });
  insertUser.finalize(() => {
    console.log(`Inserted ${seedUsers.length} users.`);

    const insertPost = db.prepare('INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)');
    seedPosts.forEach(post => {
      insertPost.run(post.user_id, post.content, post.image);
    });
    insertPost.finalize(() => {
      console.log(`Inserted ${seedPosts.length} posts.`);

      const insertComment = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)');
      seedComments.forEach(comment => {
        insertComment.run(comment.post_id, comment.user_id, comment.content);
      });
      insertComment.finalize(() => {
        console.log(`Inserted ${seedComments.length} comments.`);

        const insertLike = db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)');
        seedLikes.forEach(like => {
          insertLike.run(like.post_id, like.user_id);
        });
        insertLike.finalize(() => {
          console.log(`Inserted ${seedLikes.length} likes.`);

          const insertFollow = db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)');
          seedFollows.forEach(follow => {
            insertFollow.run(follow.follower_id, follow.following_id);
          });
          insertFollow.finalize(() => {
            console.log(`Inserted ${seedFollows.length} follows.`);
            console.log('Database seeded successfully!');

            db.close((err) => {
              if (err) console.error('Error closing database:', err.message);
              else console.log('Database connection closed.');
            });
          });
        });
      });
    });
  });
});