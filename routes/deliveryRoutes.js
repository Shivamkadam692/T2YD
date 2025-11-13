const express = require('express');
const router = express.Router();
const { requireLogin, requireRole } = require('../middleware/auth');
const deliveryController = require('../controllers/deliveryController');

router.get('/add', requireLogin, requireRole('shipper'), deliveryController.getAddDelivery);
router.post('/add', requireLogin, requireRole('shipper'), deliveryController.postAddDelivery);

// My Deliveries page
router.get('/my', requireLogin, requireRole('shipper'), deliveryController.getMyDeliveries);

// View individual delivery
router.get('/:id', deliveryController.getDeliveryById);

// Edit delivery form
router.get('/:id/edit', requireLogin, requireRole('shipper'), deliveryController.getEditDelivery);

// Update delivery
router.put('/:id', requireLogin, requireRole('shipper'), deliveryController.updateDelivery);

// Delete delivery
router.delete('/:id', requireLogin, requireRole('shipper'), deliveryController.deleteDelivery);

module.exports = router;
