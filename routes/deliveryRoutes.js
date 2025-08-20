const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const { requireLogin, requireRole } = require('../middleware/auth');

router.get('/add', requireLogin, requireRole('shipper'), (req, res) => {
  res.render('addDelivery');
});

router.post('/add', requireLogin, requireRole('shipper'), async (req, res) => {
  const deliveryData = {
    ...req.body,
    shipper: req.session.userId,
    shipperName: req.body.shipperName || res.locals.user.name
  };
  await Delivery.create(deliveryData);
  res.redirect('/dashboard/shipper');
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
router.put('/:id', requireLogin, requireRole('shipper'), async (req, res) => {
  try {
    await Delivery.findByIdAndUpdate(req.params.id, req.body);
    res.redirect(`/deliveries/${req.params.id}`);
  } catch (error) {
    res.status(500).render('error', { message: 'Error updating delivery' });
  }
});

// Delete delivery
router.delete('/:id', requireLogin, requireRole('shipper'), async (req, res) => {
  try {
    await Delivery.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } catch (error) {
    res.status(500).render('error', { message: 'Error deleting delivery' });
  }
});

module.exports = router;
