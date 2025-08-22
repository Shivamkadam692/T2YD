const express = require('express');
const router = express.Router();
const Lorry = require('../models/Lorry');
const { requireLogin, requireRole } = require('../middleware/auth');

router.get('/add', requireLogin, requireRole('transporter'), (req, res) => {
  res.render('addLorry');
});

router.post('/add', requireLogin, requireRole('transporter'), async (req, res) => {
  const lorryData = {
    ...req.body,
    transporter: req.session.userId,
    ownerName: req.body.ownerName || res.locals.user.name
  };
  await Lorry.create(lorryData);
  res.redirect('/dashboard/transporter');
});

// View individual lorry
router.get('/:id', async (req, res) => {
  try {
    const lorry = await Lorry.findById(req.params.id);
    if (!lorry) {
      return res.status(404).render('error', { message: 'Lorry not found' });
    }
    
    // Find nearby deliveries based on lorry location
    const Delivery = require('../models/Delivery');
    const nearbyDeliveries = await Delivery.find({
      status: 'pending',
      pickupLocation: { $regex: new RegExp(lorry.location.split(',')[0], 'i') } // Match city/area part of the location
    }).populate('shipper', 'name').limit(5);
    
    res.render('lorry', { lorry, nearbyDeliveries });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error finding lorry or nearby deliveries' });
  }
});

// Edit lorry form
router.get('/:id/edit', requireLogin, requireRole('transporter'), async (req, res) => {
  try {
    const lorry = await Lorry.findById(req.params.id);
    if (!lorry) {
      return res.status(404).render('error', { message: 'Lorry not found' });
    }
    res.render('editLorry', { lorry });
  } catch (error) {
    res.status(500).render('error', { message: 'Error finding lorry' });
  }
});

// Update lorry
router.put('/:id', requireLogin, requireRole('transporter'), async (req, res) => {
  try {
    await Lorry.findByIdAndUpdate(req.params.id, req.body);
    res.redirect(`/lorries/${req.params.id}`);
  } catch (error) {
    res.status(500).render('error', { message: 'Error updating lorry' });
  }
});

// Delete lorry
router.delete('/:id', requireLogin, requireRole('transporter'), async (req, res) => {
  try {
    await Lorry.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } catch (error) {
    res.status(500).render('error', { message: 'Error deleting lorry' });
  }
});

module.exports = router;
