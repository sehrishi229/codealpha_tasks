const express = require('express');
const router = express.Router();
const { isAuthenticated, isNotAuthenticated } = require('../app/middleware/auth');
const { validateRegister, validateLogin, validatePost, validateComment } = require('../app/utils/validators');
const upload = require('../app/middleware/upload');

const authController = require('../app/controllers/authController');
const postController = require('../app/controllers/postController');
const userController = require('../app/controllers/userController');

router.get('/', isAuthenticated, postController.renderFeed);

router.get('/login', isNotAuthenticated, authController.renderLogin);
router.post('/login', authController.login);

router.get('/register', isNotAuthenticated, authController.renderRegister);
router.post('/register', authController.register);

router.get('/logout', authController.logout);

router.get('/create-post', isAuthenticated, postController.renderCreatePost);
router.post('/create-post', isAuthenticated, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'document', maxCount: 1 }
]), postController.createPost);

router.get('/edit-post/:id', isAuthenticated, postController.renderEditPost);
router.post('/edit-post/:id', isAuthenticated, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'document', maxCount: 1 }
]), postController.editPost);
router.get('/delete-post/:id', isAuthenticated, postController.deletePost);

router.get('/post/:id', isAuthenticated, postController.renderPostDetail);

router.post('/post/:id/like', isAuthenticated, postController.likePost);
router.post('/post/:id/comment', isAuthenticated, postController.addComment);
router.post('/comment/:id/delete', isAuthenticated, postController.deleteComment);

router.get('/profile/:username', userController.renderProfile);

router.post('/follow/:id', isAuthenticated, userController.followUser);
router.post('/unfollow/:id', isAuthenticated, userController.unfollowUser);

router.get('/search', isAuthenticated, userController.searchUsers);
router.get('/followers/:id', isAuthenticated, userController.renderFollowers);
router.get('/following/:id', isAuthenticated, userController.renderFollowing);

router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About - Social Media',
    currentUser: req.session.userId ? {
      id: req.session.userId,
      username: req.session.username,
      full_name: req.session.fullName
    } : null
  });
});

module.exports = router;