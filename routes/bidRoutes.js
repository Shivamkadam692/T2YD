const express = require('express');
const router = express.Router();
const { requireLogin, requireRole } = require('../middleware/auth');
const Delivery = require('../models/Delivery');

// Show bid page for a delivery (transporters only)
router.get('/:deliveryId', requireLogin, requireRole('transporter'), async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.deliveryId).populate('shipper', 'name');
    if (!delivery) return res.status(404).render('error', { message: 'Delivery not found' });
    if (delivery.status !== 'pending') return res.status(400).render('error', { message: 'This delivery is not available for bidding' });
    
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
    res.status(500).render('error', { message: 'Error loading bid page' });
  }
});

module.exports = router;
