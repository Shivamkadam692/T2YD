const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const { requireLogin, requireRole } = require('../middleware/auth');

router.get('/add', requireLogin, requireRole('shipper'), (req, res) => {
  res.render('addDelivery');
});

router.post('/add', 
  requireLogin, 
  requireRole('shipper'), 
  async (req, res, next) => {
    try {
      const deliveryData = {
        ...req.body,
        shipper: req.session.userId,
        shipperName: req.body.shipperName || res.locals.user.name
      };
      await Delivery.create(deliveryData);
      res.redirect('/dashboard/shipper');
    } catch (err) {
      next(err);
    }
  }
);

// My Deliveries page
router.get('/my', requireLogin, requireRole('shipper'), async (req, res) => {
  try {
    const deliveries = await Delivery.find({ shipper: req.session.userId }).sort({ createdAt: -1 });
    res.render('myDeliveries', { deliveries });
  } catch (error) {
    console.error('Error fetching my deliveries:', error);
    res.status(500).render('error', { message: 'Error loading your deliveries' });
  }
});

// View individual delivery
router.get('/:id', async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).render('error', { message: 'Delivery not found' });
    }
    res.render('delivery', { delivery });
  } catch (error) {
    res.status(500).render('error', { message: 'Error finding delivery' });
  }
});

// Edit delivery form
router.get('/:id/edit', requireLogin, requireRole('shipper'), async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).render('error', { message: 'Delivery not found' });
    }
    res.render('editDelivery', { delivery });
  } catch (error) {
    res.status(500).render('error', { message: 'Error finding delivery' });
  }
});

// Update delivery
router.put('/:id', 
  requireLogin, 
  requireRole('shipper'), 
  async (req, res, next) => {
    try {
      // Check if delivery exists and belongs to the user
      const delivery = await Delivery.findById(req.params.id);
      if (!delivery) {
        const error = new Error('Delivery not found');
        error.statusCode = 404;
        return next(error);
      }
      
      if (delivery.shipper.toString() !== req.session.userId) {
        const error = new Error('Unauthorized - You can only edit your own deliveries');
        error.statusCode = 403;
        return next(error);
      }
      
      await Delivery.findByIdAndUpdate(req.params.id, req.body);
      res.redirect(`/deliveries/${req.params.id}`);
    } catch (error) {
      next(error);
    }
  }
);

// Delete delivery
router.delete('/:id', requireLogin, requireRole('shipper'), async (req, res, next) => {
  try {
    // Check if delivery exists and belongs to the user
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      const error = new Error('Delivery not found');
      error.statusCode = 404;
      return next(error);
    }
    
    if (delivery.shipper.toString() !== req.session.userId) {
      const error = new Error('Unauthorized - You can only delete your own deliveries');
      error.statusCode = 403;
      return next(error);
    }
    
    await Delivery.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
