const async = require('async');
const Post = require('../models/Post');
const User = require('../models/User');
const Like = require('../models/Like');
const Comment = require('../models/Comment');

const renderFeed = (req, res) => {
  const userId = req.session.userId;

  Post.getFeed(userId, 20, 0, (err, posts) => {
    if (err) {
      console.error('Feed error:', err);
      req.flash('errors', 'Could not load feed.');
      return res.redirect('/');
    }

    const userIds = [...new Set(posts.map(p => p.user_id))];
    const likesData = {};

    async.parallel(userIds.map(id => cb => {
      User.getFullProfile(id, cb);
    }), (err, profiles) => {
      if (err) {
        console.error('Profile fetch error:', err);
      }

      res.render('feed', {
        title: 'Home - Social Media',
        posts: posts,
        currentUser: {
          id: userId,
          username: req.session.username,
          full_name: req.session.fullName
        },
        profileData: profiles || []
      });
    });
  });
};

const renderCreatePost = (req, res) => {
  res.render('posts/create', {
    title: 'Create Post - Social Media',
    currentUser: {
      id: req.session.userId,
      username: req.session.username,
      full_name: req.session.fullName,
      profile_picture: req.session.avatar
    },
    errors: req.flash('errors')
  });
};

const createPost = (req, res) => {
  const { content } = req.body;
  const userId = req.session.userId;

  let image = null;
  let document = null;

  if (req.files) {
    if (req.files.image && req.files.image[0]) {
      image = req.files.image[0].filename;
    }
    if (req.files.document && req.files.document[0]) {
      document = req.files.document[0].filename;
    }
  }

  Post.create({ user_id: userId, content, image, document }, (err, result) => {
    if (err) {
      req.flash('errors', 'Failed to create post.');
      return res.redirect('/create-post');
    }
    res.redirect('/');
  });
};

const renderEditPost = (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.session.userId;

  Post.getById(postId, userId, (err, post) => {
    if (err) {
      req.flash('errors', 'An error occurred.');
      return res.redirect('/');
    }

    if (!post) {
      req.flash('errors', 'Post not found.');
      return res.redirect('/');
    }

    if (post.user_id !== userId) {
      req.flash('errors', 'You can only edit your own posts.');
      return res.redirect('/');
    }

    res.render('posts/edit', {
      title: 'Edit Post - Social Media',
      post: post,
      currentUser: {
        id: userId,
        username: req.session.username,
        full_name: req.session.fullName,
        profile_picture: req.session.avatar
      },
      errors: req.flash('errors')
    });
  });
};

const editPost = (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.session.userId;
  const { content } = req.body;

  let image = null;
  let document = null;

  if (req.files) {
    if (req.files.image && req.files.image[0]) {
      image = req.files.image[0].filename;
    }
    if (req.files.document && req.files.document[0]) {
      document = req.files.document[0].filename;
    }
  }

  Post.update(postId, userId, { content, image, document }, (err, result) => {
    if (err) {
      req.flash('errors', 'Failed to update post.');
      return res.redirect(`/edit-post/${postId}`);
    }
    res.redirect('/');
  });
};

const deletePost = (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.session.userId;

  Post.delete(postId, userId, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete post' });
    }
    res.redirect('/');
  });
};

const renderPostDetail = (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.session.userId;

  Post.getById(postId, userId, (err, post) => {
    if (err) {
      req.flash('errors', 'An error occurred.');
      return res.redirect('/');
    }

    if (!post) {
      req.flash('errors', 'Post not found.');
      return res.redirect('/');
    }

    Comment.getByPostId(postId, (err, comments) => {
      if (err) {
        comments = [];
      }

      res.render('posts/detail', {
        title: 'Post - Social Media',
        post: post,
        comments: comments,
        currentUser: {
          id: userId,
          username: req.session.username,
          full_name: req.session.fullName,
          avatar: req.session.avatar
        }
      });
    });
  });
};

const likePost = (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.session.userId;

  Like.userLikedPost(postId, userId, (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to process like' });
    }

    if (row.count > 0) {
      Like.delete(postId, userId, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to unlike' });
        Like.getCount(postId, (err, result) => {
          if (err) return res.status(500).json({ error: 'Failed to get count' });
          res.json({ liked: false, count: result.count });
        });
      });
    } else {
      Like.create({ post_id: postId, user_id: userId }, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to like' });
        Like.getCount(postId, (err, result) => {
          if (err) return res.status(500).json({ error: 'Failed to get count' });
          res.json({ liked: true, count: result.count });
        });
      });
    }
  });
};

const addComment = (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.session.userId;
  const { content } = req.body;

  Comment.create({ post_id: postId, user_id: userId, content }, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to add comment' });
    }
    Comment.getByPostId(postId, (err, comments) => {
      if (err) return res.status(500).json({ error: 'Failed to load comments' });
      res.json({ comments: comments });
    });
  });
};

const deleteComment = (req, res) => {
  const commentId = parseInt(req.params.id);
  const userId = req.session.userId;

  Comment.delete(commentId, userId, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete comment' });
    }
    res.json({ success: true });
  });
};

module.exports = {
  renderFeed,
  renderCreatePost,
  createPost,
  renderEditPost,
  editPost,
  deletePost,
  renderPostDetail,
  likePost,
  addComment,
  deleteComment
};