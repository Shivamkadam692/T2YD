const express = require('express');
const User = require('../models/User');
const router = express.Router();
const crypto = require('crypto');
const { validateRequired, validateEmail, validatePassword } = require('../middleware/validator');

// Signup Page
router.get('/signup', (req, res) => {
  res.render('signup');
});

// Signup Action
router.post('/signup', 
  validateRequired(['name', 'email', 'password', 'role']),
  validateEmail('email'),
  validatePassword('password'),
  async (req, res, next) => {
    try {
      await User.create(req.body);
      res.redirect('/auth/login');
    } catch (err) {
      next(err);
    }
  }
);

// Login Page
router.get('/login', (req, res) => {
  res.render('login');
});

// Login Action
router.post('/login', 
  validateRequired(['email', 'password']),
  validateEmail('email'),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        return next(error);
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        return next(error);
      }

      req.session.userId = user._id;
      req.session.role = user.role;
      req.session.userRole = user.role; // Adding userRole to match what we're checking in server.js

      // Redirect based on role
      if (user.role === 'shipper') {
        return res.redirect('/dashboard/shipper');
      }
      if (user.role === 'transporter') {
        return res.redirect('/dashboard/transporter');
      }

      res.redirect('/');
    } catch (err) {
      next(err);
    }
  }
);

// Forgot password page
router.get('/forgot', (req, res) => {
  res.render('forgot');
});

// Forgot password action
router.post('/forgot', 
  validateRequired(['email']),
  validateEmail('email'),
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.send('If that email exists, a reset link will be sent.');

      // create token
      const token = crypto.randomBytes(20).toString('hex');
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset/${token}`;
      // In production you'd send an email. For now log it so developer can copy the link.
      console.log('Password reset link:', resetUrl);

      res.send('If that email exists, a reset link will be sent. Check server logs for the link in development.');
    } catch (err) {
      next(err);
    }
  }
);

// Reset password page
router.get('/reset/:token', async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
  if (!user) return res.send('Password reset token is invalid or has expired.');
  res.render('reset', { token });
});

// Reset password action
router.post('/reset/:token', 
  validateRequired(['password']),
  validatePassword('password'),
  async (req, res, next) => {
    try {
      const { token } = req.params;
      const { password } = req.body;
      const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
      
      if (!user) {
        const error = new Error('Password reset token is invalid or has expired.');
        error.statusCode = 400;
        return next(error);
      }

      user.password = password; // will be hashed by pre-save hook
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.send('Password has been reset. You can now <a href="/auth/login">login</a>.');
    } catch (err) {
      next(err);
    }
  }
);

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
