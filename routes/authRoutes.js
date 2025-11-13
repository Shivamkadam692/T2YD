const express = require('express');
const router = express.Router();
const { validateRequired, validateEmail, validatePassword } = require('../middleware/validator');
const authController = require('../controllers/authController');

// Signup Page
router.get('/signup', authController.getSignup);

// Signup Action
router.post('/signup', 
  validateRequired(['name', 'email', 'password', 'role']),
  validateEmail('email'),
  validatePassword('password'),
  authController.postSignup
);

// Login Page
router.get('/login', authController.getLogin);

// Login Action
router.post('/login', 
  validateRequired(['email', 'password']),
  validateEmail('email'),
  authController.postLogin
);

// Forgot password page
router.get('/forgot', authController.getForgot);

// Forgot password action
router.post('/forgot', 
  validateRequired(['email']),
  validateEmail('email'),
  authController.postForgot
);

// Reset password page
router.get('/reset/:token', authController.getReset);

// Reset password action
router.post('/reset/:token', 
  validateRequired(['password']),
  validatePassword('password'),
  authController.postReset
);

// Logout
router.get('/logout', authController.logout);

module.exports = router;
