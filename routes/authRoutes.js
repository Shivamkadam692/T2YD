const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Signup Page
router.get('/signup', (req, res) => {
  res.render('signup');
});

// Signup Action
router.post('/signup', async (req, res) => {
  try {
    await User.create(req.body);
    res.redirect('/auth/login');
  } catch (err) {
    res.send('Error: ' + err.message);
  }
});

// Login Page
router.get('/login', (req, res) => {
  res.render('login');
});

// Login Action
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.send('User not found');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return res.send('Invalid credentials');

  req.session.userId = user._id;
  req.session.role = user.role;

  // Redirect based on role
  if (user.role === 'shipper') {
    return res.redirect('/dashboard/shipper');
  }
  if (user.role === 'transporter') {
    return res.redirect('/dashboard/transporter');
  }

  res.redirect('/');
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
