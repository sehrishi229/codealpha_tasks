const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/authService');
const { validateRegister, validateLogin } = require('../middlewares/validation');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', validateRegister, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await AuthService.register({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      display_name: req.body.display_name,
    });
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', validateLogin, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await AuthService.login(req.body.email, req.body.password);
    res.json({
      message: 'Login successful',
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

router.get('/users', authMiddleware, async (req, res) => {
  const User = require('../models/User');
  const users = await User.search('');
  res.json({ users });
});

router.get('/users/search', authMiddleware, async (req, res) => {
  const q = req.query.q || '';
  const User = require('../models/User');
  const users = await User.search(q);
  res.json({ users });
});

module.exports = router;