const Delivery = require('../models/Delivery');

/**
 * Render add delivery form
 */
exports.getAddDelivery = (req, res) => {
  res.render('addDelivery');
};

/**
 * Handle create delivery
 */
exports.postAddDelivery = async (req, res, next) => {
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
};

/**
 * Get user's deliveries
 */
exports.getMyDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find({ shipper: req.session.userId }).sort({ createdAt: -1 });
    res.render('myDeliveries', { deliveries });
  } catch (error) {
    console.error('Error fetching my deliveries:', error);
    res.status(500).render('error', { message: 'Error loading your deliveries' });
  }
};

/**
 * Get single delivery by ID
 */
exports.getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).render('error', { message: 'Delivery not found' });
    }
    res.render('delivery', { delivery });
  } catch (error) {
    res.status(500).render('error', { message: 'Error finding delivery' });
  }
};

/**
 * Render edit delivery form
 */
exports.getEditDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).render('error', { message: 'Delivery not found' });
    }
    res.render('editDelivery', { delivery });
  } catch (error) {
    res.status(500).render('error', { message: 'Error finding delivery' });
  }
};

/**
 * Update delivery
 */
exports.updateDelivery = async (req, res, next) => {
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
};

/**
 * Delete delivery
 */
exports.deleteDelivery = async (req, res, next) => {
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
};

