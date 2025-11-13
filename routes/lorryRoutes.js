const express = require('express');
const router = express.Router();
const { requireLogin, requireRole } = require('../middleware/auth');
const lorryController = require('../controllers/lorryController');

router.get('/add', requireLogin, requireRole('transporter'), lorryController.getAddLorry);
router.post('/add', requireLogin, requireRole('transporter'), lorryController.postAddLorry);

// My Lorries page
router.get('/my', requireLogin, requireRole('transporter'), lorryController.getMyLorries);

// View individual lorry
router.get('/:id', lorryController.getLorryById);

// Edit lorry form
router.get('/:id/edit', requireLogin, requireRole('transporter'), lorryController.getEditLorry);

// Update lorry
router.put('/:id', requireLogin, requireRole('transporter'), lorryController.updateLorry);

// Delete lorry
router.delete('/:id', requireLogin, requireRole('transporter'), lorryController.deleteLorry);

module.exports = router;
