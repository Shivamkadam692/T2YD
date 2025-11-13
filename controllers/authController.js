const User = require('../models/User');
const crypto = require('crypto');

/**
 * Render signup page
 */
exports.getSignup = (req, res) => {
  res.render('signup');
};

/**
 * Handle user signup
 */
exports.postSignup = async (req, res, next) => {
  try {
    await User.create(req.body);
    if (req.flash) req.flash('success', 'Account created successfully! Please log in.');
    res.redirect('/auth/login');
  } catch (err) {
    // Check specifically for duplicate email error
    if (err.code === 11000 && err.keyValue && err.keyValue.email) {
      if (req.flash) {
        req.flash('error', 'This email address is already registered. Please use a different email or try logging in.');
        return res.redirect('/auth/signup');
      }
    }
    // For other errors, pass to the global error handler
    next(err);
  }
};

/**
 * Render login page
 */
exports.getLogin = (req, res) => {
  res.render('login');
};

/**
 * Handle user login
 */
exports.postLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      req.flash('error', 'User not found. Please check your email or create an account.');
      return res.redirect('/auth/login');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      req.flash('error', 'Invalid password. Please try again or reset your password.');
      return res.redirect('/auth/login');
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
};

/**
 * Render forgot password page
 */
exports.getForgot = (req, res) => {
  res.render('forgot');
};

/**
 * Handle forgot password request
 */
exports.postForgot = async (req, res, next) => {
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
};

/**
 * Render reset password page
 */
exports.getReset = async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
  if (!user) return res.send('Password reset token is invalid or has expired.');
  res.render('reset', { token });
};

/**
 * Handle password reset
 */
exports.postReset = async (req, res, next) => {
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
};

/**
 * Handle user logout
 */
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};

