const bcrypt = require('bcryptjs');
const User = require('../models/User');

const renderRegister = (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('auth/register', {
    title: 'Register - Social Media',
    errors: req.flash('errors'),
    old: req.flash('old')
  });
};

const register = (req, res) => {
  const { username, email, password, full_name, bio } = req.body;

  User.findByUsername(username, (err, existingUser) => {
    if (err) {
      req.flash('errors', 'An error occurred. Please try again.');
      return res.redirect('/register');
    }

    if (existingUser) {
      req.flash('errors', 'Username already taken.');
      req.flash('old', req.body);
      return res.redirect('/register');
    }

    User.findByEmail(email, (err, existingEmail) => {
      if (err) {
        req.flash('errors', 'An error occurred. Please try again.');
        return res.redirect('/register');
      }

      if (existingEmail) {
        req.flash('errors', 'Email already registered.');
        req.flash('old', req.body);
        return res.redirect('/register');
      }

      const userData = { username, email, password, full_name, bio: bio || '' };
      User.create(userData, (err, result) => {
        if (err) {
          req.flash('errors', 'Registration failed. Please try again.');
          req.flash('old', req.body);
          return res.redirect('/register');
        }

        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
      });
    });
  });
};

const renderLogin = (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('auth/login', {
    title: 'Login - Social Media',
    errors: req.flash('errors'),
    success: req.flash('success')
  });
};

const login = (req, res) => {
  const { username, password } = req.body;

  User.findByUsername(username, (err, user) => {
    if (err || !user) {
      req.flash('errors', 'Invalid username or password.');
      return res.redirect('/login');
    }

    if (!bcrypt.compareSync(password, user.password)) {
      req.flash('errors', 'Invalid username or password.');
      return res.redirect('/login');
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.fullName = user.full_name;
    req.session.avatar = user.profile_picture;

    res.redirect('/');
  });
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
};

module.exports = {
  renderRegister,
  register,
  renderLogin,
  login,
  logout
};