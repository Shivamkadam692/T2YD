const express = require('express');
const router = express.Router();
const { requireLogin, requireRole } = require('../middleware/auth');
const Delivery = require('../models/Delivery');

// Show bid page for a delivery (transporters only)
router.get('/:deliveryId', requireLogin, requireRole('transporter'), async (req, res, next) => {
  try {
    // Validate delivery ID format
    if (!req.params.deliveryId || !req.params.deliveryId.match(/^[0-9a-fA-F]{24}$/)) {
      const error = new Error('Invalid delivery ID format');
      error.statusCode = 400;
      return next(error);
    }
    
    const delivery = await Delivery.findById(req.params.deliveryId).populate('shipper', 'name');
    if (!delivery) {
      const error = new Error('Delivery not found');
      error.statusCode = 404;
      return next(error);
    }
    
    if (delivery.status !== 'pending') {
      const error = new Error('This delivery is not available for bidding');
      error.statusCode = 400;
      return next(error);
    }
    
    // Fetch transporter's available lorries
    const Lorry = require('../models/Lorry');
    const lorries = await Lorry.find({ transporter: req.session.userId, status: 'available' });
    
    // Check if transporter has previous bids for this delivery
    const Request = require('../models/Request');
    const previousBids = await Request.find({
      delivery: req.params.deliveryId,
      transporter: req.session.userId
    }).sort({ createdAt: -1 });
    
    res.render('bid', { delivery, lorries, previousBids });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
