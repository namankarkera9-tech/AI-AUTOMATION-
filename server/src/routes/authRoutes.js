const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authRateLimiter } = require('../middleware/security');

const router = express.Router();

// Registration route
router.post(
  '/register',
  authRateLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email address is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate,
  ],
  authController.register
);

// Login route
router.post(
  '/login',
  authRateLimiter,
  [
    body('email').isEmail().withMessage('A valid email address is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
  ],
  authController.login
);

// Get current profile
router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('A valid email address is required'),
  validate,
], authController.updateMe);

module.exports = router;
