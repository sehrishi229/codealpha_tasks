const User = require('../models/User');
const Post = require('../models/Post');
const async = require('async');

const renderProfile = (req, res) => {
  const username = req.params.username;
  const currentUserId = req.session.userId;

  User.findByUsername(username, (err, user) => {
    if (err) {
      req.flash('errors', 'An error occurred.');
      return res.redirect('/');
    }

    if (!user) {
      req.flash('errors', 'User not found.');
      return res.redirect('/');
    }

    const userId = user.id;

    async.parallel({
      profile: cb => User.getFullProfile(userId, cb),
      posts: cb => Post.getByUserId(userId, cb),
      isFollowing: cb => User.isFollowing(currentUserId, userId, cb)
    }, (err, results) => {
      if (err) {
        console.error('Profile load error:', err);
      }

      let profile = results.profile || user;
      let isFollowing = false;
      if (results.isFollowing && results.isFollowing.count > 0) {
        isFollowing = true;
      }

      res.render('profile', {
        title: `@${user.username} - Social Media`,
        profile: profile,
        posts: results.posts || [],
        isFollowing: isFollowing,
        isOwnProfile: currentUserId === userId,
        currentUser: currentUserId ? {
          id: currentUserId,
          username: req.session.username,
          full_name: req.session.fullName,
          profile_picture: req.session.avatar
        } : null,
        errors: req.flash('errors'),
        success: req.flash('success')
      });
    });
  });
};

const followUser = (req, res) => {
  const followingId = parseInt(req.params.id);
  const followerId = req.session.userId;

  User.follow(followerId, followingId, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    User.getFollowingCount(followingId, (err, row) => {
      if (err) return res.status(500).json({ error: 'Failed to get count' });
      res.json({ following: true, count: row.count });
    });
  });
};

const unfollowUser = (req, res) => {
  const followingId = parseInt(req.params.id);
  const followerId = req.session.userId;

  User.unfollow(followerId, followingId, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to unfollow' });
    }
    User.getFollowingCount(followingId, (err, row) => {
      if (err) return res.status(500).json({ error: 'Failed to get count' });
      res.json({ following: false, count: row.count });
    });
  });
};

const searchUsers = (req, res) => {
  const query = req.query.q || '';

  if (query.length < 2) {
    return res.render('search', {
      title: 'Search - Social Media',
      users: [],
      query: query,
      currentUser: {
        id: req.session.userId,
        username: req.session.username,
        full_name: req.session.fullName
      }
    });
  }

  User.search(query, (err, users) => {
    if (err) {
      users = [];
    }

    res.render('search', {
      title: 'Search - Social Media',
      users: users || [],
      query: query,
      currentUser: {
        id: req.session.userId,
        username: req.session.username,
        full_name: req.session.fullName
      }
    });
  });
};

const renderFollowers = (req, res) => {
  const userId = parseInt(req.params.id);
  const currentUserId = req.session.userId;

  User.findByUsername('', (err) => {});

  const query = `
    SELECT u.id, u.username, u.full_name, u.profile_picture, u.bio,
           EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following
    FROM follows f
    JOIN users u ON f.follower_id = u.id
    WHERE f.following_id = ?
    ORDER BY f.created_at DESC
  `;

  const db = require('../../config/database');
  db.all(query, [currentUserId, userId], (err, followers) => {
    if (err) followers = [];

    res.render('followers', {
      title: 'Followers - Social Media',
      users: followers,
      currentUser: {
        id: currentUserId,
        username: req.session.username,
        full_name: req.session.fullName
      }
    });
  });
};

const renderFollowing = (req, res) => {
  const userId = parseInt(req.params.id);
  const currentUserId = req.session.userId;

  const query = `
    SELECT u.id, u.username, u.full_name, u.profile_picture, u.bio,
           EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following
    FROM follows f
    JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = ?
    ORDER BY f.created_at DESC
  `;

  const db = require('../../config/database');
  db.all(query, [currentUserId, userId], (err, following) => {
    if (err) following = [];

    res.render('following', {
      title: 'Following - Social Media',
      users: following,
      currentUser: {
        id: currentUserId,
        username: req.session.username,
        full_name: req.session.fullName
      }
    });
  });
};

module.exports = {
  renderProfile,
  followUser,
  unfollowUser,
  searchUsers,
  renderFollowers,
  renderFollowing
};