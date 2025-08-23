const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Delivery = require('../models/Delivery');
const bcrypt = require('bcryptjs');
const { requireLogin } = require('../middleware/auth');

// View profile page
router.get('/', requireLogin, async (req, res) => {
  try {
    // Get user details
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      if (req.flash) req.flash('error', 'User not found');
      return res.redirect('/');
    }
    
    // Get booking history based on user role
    let bookings = [];
    
    if (user.role === 'transporter') {
      // For transporters, get deliveries where they are the transporter
      bookings = await Delivery.find({ transporter: user._id })
        .populate('shipper', 'name')
        .sort({ createdAt: -1 });
    } else if (user.role === 'shipper') {
      // For shippers, get deliveries they created
      bookings = await Delivery.find({ shipper: user._id })
        .populate('transporter', 'name')
        .sort({ createdAt: -1 });
    }
    
    res.render('profile', { user, bookings });
  } catch (err) {
    console.error('Error fetching profile data:', err);
    if (req.flash) req.flash('error', 'Failed to load profile data');
    res.redirect('/');
  }
});

// Update profile information
router.post('/update', requireLogin, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    // Check if email is already in use by another user
    const existingUser = await User.findOne({ email, _id: { $ne: req.session.userId } });
    if (existingUser) {
      if (req.flash) req.flash('error', 'Email is already in use by another account');
      return res.redirect('/profile');
    }
    
    // Update user information
    await User.findByIdAndUpdate(req.session.userId, {
      name,
      email,
      phone
    });
    
    if (req.flash) req.flash('success', 'Profile updated successfully');
    res.redirect('/profile');
  } catch (err) {
    console.error('Error updating profile:', err);
    if (req.flash) req.flash('error', 'Failed to update profile');
    res.redirect('/profile');
  }
});

// Change password
router.post('/password', requireLogin, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Get current user
    const user = await User.findById(req.session.userId);
    
    // Check if current password is correct
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      if (req.flash) req.flash('error', 'Current password is incorrect');
      return res.redirect('/profile');
    }
    
    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      if (req.flash) req.flash('error', 'New passwords do not match');
      return res.redirect('/profile');
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    user.password = hashedPassword;
    await user.save();
    
    if (req.flash) req.flash('success', 'Password changed successfully');
    res.redirect('/profile');
  } catch (err) {
    console.error('Error changing password:', err);
    if (req.flash) req.flash('error', 'Failed to change password');
    res.redirect('/profile');
  }
});

// Delete account
router.post('/delete', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      if (req.flash) req.flash('error', 'User not found');
      return res.redirect('/profile');
    }
    
    // Delete user account
    await User.findByIdAndDelete(userId);
    
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      res.redirect('/');
    });
  } catch (err) {
    console.error('Error deleting account:', err);
    if (req.flash) req.flash('error', 'Failed to delete account');
    res.redirect('/profile');
  }
});

module.exports = router;