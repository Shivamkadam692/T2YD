const Lorry = require('../models/Lorry');
const Delivery = require('../models/Delivery');

/**
 * Render add lorry form
 */
exports.getAddLorry = (req, res) => {
  res.render('addLorry');
};

/**
 * Handle create lorry
 */
exports.postAddLorry = async (req, res) => {
  const lorryData = {
    ...req.body,
    transporter: req.session.userId,
    ownerName: req.body.ownerName || res.locals.user.name
  };
  await Lorry.create(lorryData);
  res.redirect('/dashboard/transporter');
};

/**
 * Get user's lorries
 */
exports.getMyLorries = async (req, res) => {
  try {
    const lorries = await Lorry.find({ transporter: req.session.userId }).sort({ createdAt: -1 });
    res.render('myLorries', { lorries });
  } catch (error) {
    console.error('Error fetching my lorries:', error);
    res.status(500).render('error', { message: 'Error loading your lorries' });
  }
};

/**
 * Get single lorry by ID
 */
exports.getLorryById = async (req, res) => {
  try {
    const lorry = await Lorry.findById(req.params.id);
    if (!lorry) {
      return res.status(404).render('error', { message: 'Lorry not found' });
    }
    
    // Find nearby deliveries based on lorry location
    const nearbyDeliveries = await Delivery.find({
      status: 'pending',
      pickupLocation: { $regex: new RegExp(lorry.location.split(',')[0], 'i') } // Match city/area part of the location
    }).populate('shipper', 'name').limit(5);
    
    res.render('lorry', { lorry, nearbyDeliveries });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error finding lorry or nearby deliveries' });
  }
};

/**
 * Render edit lorry form
 */
exports.getEditLorry = async (req, res, next) => {
  try {
    const lorry = await Lorry.findById(req.params.id);
    if (!lorry) {
      const error = new Error('Lorry not found');
      error.statusCode = 404;
      return next(error);
    }
    
    // Check if the logged-in transporter is the owner of the lorry
    if (lorry.transporter.toString() !== req.session.userId) {
      const error = new Error('You are not authorized to edit this lorry');
      error.statusCode = 403;
      return next(error);
    }
    
    res.render('editLorry', { lorry });
  } catch (error) {
    next(error);
  }
};

/**
 * Update lorry
 */
exports.updateLorry = async (req, res, next) => {
  try {
    // Find the lorry first to check ownership
    const lorry = await Lorry.findById(req.params.id);
    if (!lorry) {
      const error = new Error('Lorry not found');
      error.statusCode = 404;
      return next(error);
    }
    
    // Check if the logged-in transporter is the owner of the lorry
    if (lorry.transporter.toString() !== req.session.userId) {
      const error = new Error('You are not authorized to update this lorry');
      error.statusCode = 403;
      return next(error);
    }
    
    await Lorry.findByIdAndUpdate(req.params.id, req.body);
    res.redirect(`/lorries/${req.params.id}`);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete lorry
 */
exports.deleteLorry = async (req, res, next) => {
  try {
    // Find the lorry first to check ownership
    const lorry = await Lorry.findById(req.params.id);
    if (!lorry) {
      const error = new Error('Lorry not found');
      error.statusCode = 404;
      return next(error);
    }
    
    // Check if the logged-in transporter is the owner of the lorry
    if (lorry.transporter.toString() !== req.session.userId) {
      const error = new Error('You are not authorized to delete this lorry');
      error.statusCode = 403;
      return next(error);
    }
    
    await Lorry.findByIdAndDelete(req.params.id);
    res.redirect('/lorries/my');
  } catch (error) {
    next(error);
  }
};

