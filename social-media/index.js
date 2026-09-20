const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const ejsLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const csrf = require('csrf');
const path = require('path');
const config = require('./config/config');
const db = require('./config/database');
const { attachUser } = require('./app/middleware/auth');
const { formatTime, formatDate, escapeHtml, getAvatarUrl } = require('./app/utils/helpers');
const routes = require('./routes/web');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

app.use(cookieParser());
app.use(ejsLayouts);

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(flash());

const tokens = new csrf();

app.use((req, res, next) => {
  res.locals.messages = req.flash();
  const secret = req.sessionID;
  const token = tokens.create(secret);
  res.locals.csrfToken = token;
  req.csrfToken = token;
  res.locals.formatTime = formatTime;
  res.locals.formatDate = formatDate;
  res.locals.escapeHtml = escapeHtml;
  res.locals.getAvatarUrl = getAvatarUrl;
  next();
});

app.use(attachUser);

app.use('/', routes);

app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Not Found',
    error: { message: 'Page not found' },
    currentUser: null
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    req.flash('errors', 'File too large. Maximum size is 5MB.');
    return res.redirect('back');
  }
  if (err.message && err.message.includes('Invalid file type')) {
    req.flash('errors', err.message);
    return res.redirect('back');
  }
  res.status(500).render('error', {
    title: 'Error - Social Media',
    error: err,
    currentUser: null
  });
});

app.listen(config.port, () => {
  console.log(`Social Media app listening at http://localhost:${config.port}`);
  db.run('PRAGMA foreign_keys = ON');
});

module.exports = app;