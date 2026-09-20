const { body, validationResult } = (() => {
  const validator = require('express-validator');
  return {
    body: validator.body,
    validationResult: validator.validationResult
  };
})();

const { body: bodyValidator, validationResult: vr } = require('express-validator');

const validateRegister = [
  bodyValidator('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  bodyValidator('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address'),
  bodyValidator('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  bodyValidator('full_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name is required (max 100 characters)'),
  (req, res, next) => {
    const errors = vr(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validateLogin = [
  bodyValidator('username')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),
  bodyValidator('password')
    .notEmpty()
    .withMessage('Password is required'),
  (req, res, next) => {
    const errors = vr(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validatePost = [
  bodyValidator('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Post content is required (max 5000 characters)'),
  (req, res, next) => {
    const errors = vr(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validateComment = [
  bodyValidator('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment content is required (max 1000 characters)'),
  (req, res, next) => {
    const errors = vr(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = { validateRegister, validateLogin, validatePost, validateComment };