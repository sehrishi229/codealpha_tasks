const csrf = require('csrf');
const tokens = new csrf();

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  req.flash('error', 'Please log in to view that page.');
  res.redirect('/login');
};

const isNotAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  next();
};

const attachUser = (req, res, next) => {
  if (req.session && req.session.userId) {
    res.locals.currentUser = {
      id: req.session.userId,
      username: req.session.username,
      full_name: req.session.fullName
    };
  } else {
    res.locals.currentUser = null;
  }
  next();
};

const csrfProtection = (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    const token = req.body._csrf || req.headers['x-csrf-token'] || req.headers['X-Requested-With'];
    if (req.path.startsWith('/post/') || req.path.startsWith('/comment/') || req.path.startsWith('/follow/') || req.path.startsWith('/unfollow/')) {
      return next();
    }
    if (token && res.locals.csrfToken && tokens.verify(req.sessionID, token)) {
      return next();
    }
    if (!token && req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return next();
    }
    req.flash('errors', 'Invalid or missing CSRF token.');
    return res.redirect('back');
  }
  next();
};

module.exports = { isAuthenticated, isNotAuthenticated, attachUser, csrfProtection };