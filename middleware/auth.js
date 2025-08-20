const User = require('../models/User');

const requireLogin = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  req.user = await User.findById(req.session.userId);
  next();
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (req.session.role !== role) {
      return res.status(403).send('Access denied');
    }
    next();
  };
};

module.exports = { requireLogin, requireRole };
