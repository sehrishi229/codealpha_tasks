const { body, param, query } = require('express-validator');

const validateRegister = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('display_name')
    .isLength({ min: 1, max: 50 })
    .trim()
    .escape()
    .withMessage('Display name is required'),
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Valid email address required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const validateMeetingCreate = [
  body('title')
    .isLength({ min: 1, max: 100 })
    .trim()
    .escape()
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .trim()
    .escape()
    .withMessage('Description must not exceed 500 characters'),
  body('has_password')
    .isBoolean()
    .withMessage('has_password must be a boolean'),
  body('password')
    .if((value, { req }) => req.body.has_password)
    .isLength({ min: 4, max: 100 })
    .withMessage('Password must be at least 4 characters'),
  body('max_participants')
    .isInt({ min: 2, max: 100 })
    .withMessage('Max participants must be between 2 and 100'),
  body('scheduled_for')
    .optional()
    .isISO8601()
    .withMessage('Scheduled for must be a valid date'),
];

const validateMeetingJoin = [
  body('meeting_code')
    .isLength({ min: 4, max: 20 })
    .trim()
    .escape()
    .withMessage('Meeting code is required'),
  body('password')
    .optional()
    .isString()
    .withMessage('Password must be a string'),
];

const validateMessage = [
  body('message')
    .isLength({ min: 1, max: 2000 })
    .trim()
    .escape()
    .withMessage('Message must be between 1 and 2000 characters'),
  body('message_type')
    .optional()
    .isIn(['text', 'system'])
    .withMessage('Invalid message type'),
];

const validateMeetingId = [
  param('id')
    .isUUID()
    .withMessage('Invalid meeting ID format'),
];

const validateSearchQuery = [
  query('q')
    .isLength({ min: 1, max: 50 })
    .trim()
    .escape()
    .withMessage('Search query must be between 1 and 50 characters'),
];

module.exports = {
  validateRegister,
  validateLogin,
  validateMeetingCreate,
  validateMeetingJoin,
  validateMessage,
  validateMeetingId,
  validateSearchQuery,
};