const express = require('express');
const router = express.Router();
const { requireLogin, requireRole } = require('../middleware/auth');
const Request = require('../models/Request');
const Delivery = require('../models/Delivery');
const Lorry = require('../models/Lorry');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/'); // Store uploads in public/uploads/
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Shipper Dashboard
router.get('/shipper', requireLogin, requireRole('shipper'), async (req, res) => {
  try {
    const deliveries = await Delivery.find({ shipper: req.session.userId }).sort({ createdAt: -1 });
    const requests = await Request.find({ 
      shipper: req.session.userId,
      delivery: { $exists: true, $ne: null } // Ensure delivery exists
    })
      .populate('transporter', 'name email')
      .populate('lorry', 'vehicleNumber vehicleType capacity')
      .populate('delivery', 'goodsType pickupLocation dropLocation')
      .sort({ createdAt: -1 });
    
    res.render('shipperDashboard', { deliveries, requests });
  } catch (error) {
    res.status(500).render('error', { message: 'Error loading dashboard' });
  }
});

// Transporter Dashboard
router.get('/transporter', requireLogin, requireRole('transporter'), async (req, res) => {
  try {
    const lorries = await Lorry.find({ transporter: req.session.userId }).sort({ createdAt: -1 });
    const requests = await Request.find({ 
      transporter: req.session.userId,
      delivery: { $exists: true, $ne: null } // Ensure delivery exists
    })
      .populate('shipper', 'name email')
      .populate('delivery', 'goodsType pickupLocation dropLocation weight')
      .populate('lorry', 'vehicleNumber vehicleType capacity')
      .sort({ createdAt: -1 });
    
    // Get available deliveries for transporters to bid on
    const availableDeliveries = await Delivery.find({ status: 'pending' })
      .populate('shipper', 'name')
      .sort({ createdAt: -1 });
    
    // Add bid status information for each delivery
    const deliveriesWithBidStatus = await Promise.all(availableDeliveries.map(async (delivery) => {
      const existingBid = await Request.findOne({
        delivery: delivery._id,
        transporter: req.session.userId
      }).select('status price createdAt');
      
      return {
        ...delivery.toObject(),
        bidStatus: existingBid ? {
          status: existingBid.status,
          price: existingBid.price,
          createdAt: existingBid.createdAt
        } : null
      };
    }));
    
    res.render('transporterDashboard', { lorries, requests, availableDeliveries: deliveriesWithBidStatus });
  } catch (error) {
    res.status(500).render('error', { message: 'Error loading dashboard' });
  }
});

// Live tracking page with access rules
router.get('/track/:requestId', requireLogin, async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId)
      .populate('shipper', 'name')
      .populate('transporter', 'name')
      .populate('delivery', 'pickupLocation dropLocation goodsType')
      .populate('lorry', 'vehicleNumber vehicleType');
    if (!request) return res.status(404).render('error', { message: 'Request not found' });

    const userId = req.session.userId?.toString();
    const isShipper = request.shipper._id.toString() === userId;
    const isTransporter = request.transporter._id.toString() === userId;
    if (!isShipper && !isTransporter) {
      return res.status(403).render('error', { message: 'Unauthorized' });
    }

    // Access rules:
    // - Shipper: can access tracking from acceptance until completion
    // - Transporter: can access shipper location until goods loaded (loadedAt). After that, can still share own location for shipper to track
    if (isTransporter && request.loadedAt) {
      // After loading, do not expose shipper location anymore
      // Only remove the shipper location from the response, not the entire object
      request._doc.shipperLocation = undefined;
    }
    // Allow tracking access even after completion if there's a loaded photo to view
    if (request.status === 'completed' && !request.loadedPhoto) {
      // After completion, no tracking access for either party (unless there's a loaded photo to view)
      return res.status(403).render('error', { message: 'Tracking is no longer available for this delivery' });
    }

    res.render('track', { request });
  } catch (e) {
    res.status(500).render('error', { message: 'Error loading tracking' });
  }
});

// Send request (transporter to shipper or shipper to transporter)
router.post('/send-request', requireLogin, async (req, res, next) => {
  try {
    const { deliveryId, lorryId, price, message } = req.body;
    const userRole = req.user.role;
    
    // Validate required fields
    if (!lorryId) {
      const error = new Error('Lorry selection is required');
      error.statusCode = 400;
      return next(error);
    }
    
    // For transporter bids, validate price
    if (userRole === 'transporter' && deliveryId) {
      if (!price || isNaN(price) || price <= 0) {
        const error = new Error('Valid price is required');
        error.statusCode = 400;
        return next(error);
      }
    }
    
    if (userRole !== 'transporter' && userRole !== 'shipper') {
      return res.status(403).render('error', { message: 'Unauthorized role' });
    }

    // For shipper-initiated requests from lorry page
    if (userRole === 'shipper' && lorryId && !deliveryId) {
      const lorry = await Lorry.findById(lorryId).populate('transporter');
      if (!lorry) return res.status(404).render('error', { message: 'Lorry not found' });
      if (lorry.status !== 'available') return res.status(400).render('error', { message: 'Lorry is not available' });
      
      const request = new Request({
        shipper: req.session.userId,
        transporter: lorry.transporter._id,
        lorry: lorryId,
        status: 'pending'
      });
      
      await request.save();
      await Lorry.findByIdAndUpdate(lorryId, { $push: { requests: request._id } });
      
      try {
        await NotificationService.createNotification({
          recipient: lorry.transporter._id,
          sender: req.session.userId,
          type: 'bid_request',
          title: 'New Bid Request',
          message: 'A shipper has requested a bid for their delivery.',
          relatedRequest: request._id,
          priority: 'high'
        });
      } catch {}
      
      return res.redirect('/dashboard/shipper');
    }
    
    // For transporter-initiated requests
    // Check if an active request already exists (only consider pending requests)
    const existingRequest = await Request.findOne({
      delivery: deliveryId,
      lorry: lorryId,
      transporter: req.session.userId,
      status: 'pending'
    });
    
    if (existingRequest) {
      return res.status(400).json({ error: 'Request already sent for this delivery and lorry' });
    }
    
    // Get delivery to find shipper
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    if (delivery.status !== 'pending') {
      return res.status(400).json({ error: 'Delivery is not available for bidding' });
    }
  // Validate lorry ownership and availability
  const lorry = await Lorry.findById(lorryId);
  if (!lorry) return res.status(404).json({ error: 'Lorry not found' });
  if (lorry.transporter.toString() !== req.session.userId) return res.status(403).json({ error: 'You do not own this lorry' });
  if (lorry.status !== 'available') return res.status(400).json({ error: 'Lorry is not available' });
    
    const request = new Request({
      shipper: delivery.shipper,
      transporter: req.session.userId,
      delivery: deliveryId,
      lorry: lorryId,
      price: price,
      message: message
    });
    
    await request.save();
    
    // Add request to delivery and lorry
    await Delivery.findByIdAndUpdate(deliveryId, { $push: { requests: request._id } });
    await Lorry.findByIdAndUpdate(lorryId, { $push: { requests: request._id } });
    
    // Notify shipper that a bid/request was sent
    try {
      await NotificationService.createNotification({
        recipient: delivery.shipper,
        sender: req.session.userId,
        type: 'bid_sent',
        title: 'New Bid Received',
        message: 'A transporter has sent a bid on your delivery request.',
        relatedRequest: request._id,
        relatedDelivery: delivery._id,
        priority: 'high'
      });
    } catch {}

    res.redirect('/dashboard/transporter');
  } catch (error) {
    next(error);
  }
});

// Accept request (shipper)
router.post('/accept-request/:requestId', requireLogin, requireRole('shipper'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId);
    if (!request) {
      return res.status(404).render('error', { message: 'Request not found' });
    }
    
    if (request.shipper.toString() !== req.session.userId) {
      return res.status(403).render('error', { message: 'Unauthorized' });
    }
    
    await Request.findByIdAndUpdate(req.params.requestId, { status: 'accepted', acceptedAt: new Date() });
    await Delivery.findByIdAndUpdate(request.delivery, { status: 'in-transit' });
    await Lorry.findByIdAndUpdate(request.lorry, { status: 'busy' });
    await Request.updateMany(
      { delivery: request.delivery, status: 'pending' },
      { status: 'rejected' }
    );
    
    // Delete the delivery request notification from shipper's notification panel
    try {
      const Notification = require('../models/Notification');
      await Notification.deleteMany({
        recipient: req.session.userId,
        type: 'delivery_request',
        relatedRequest: req.params.requestId
      });
    } catch (error) {
      console.error('Error deleting delivery request notification:', error);
    }
    
    // Notify transporter that request was accepted
    try {
      const populated = await Request.findById(req.params.requestId).populate('shipper transporter delivery');
      await NotificationService.createNotification({
        recipient: populated.transporter._id,
        sender: populated.shipper._id,
        type: 'request_accepted',
        title: 'Your Request Was Accepted',
        message: `${populated.shipper.name} accepted your request for ${populated.delivery.goodsType}.`,
        relatedRequest: populated._id,
        relatedDelivery: populated.delivery._id,
        priority: 'high'
      });
    } catch {}

    res.redirect('/dashboard/shipper');
  } catch (error) {
    res.status(500).render('error', { message: 'Error accepting request' });
  }
});

// Reject request (shipper)
router.post('/reject-request/:requestId', requireLogin, requireRole('shipper'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId);
    if (!request) {
      return res.status(404).render('error', { message: 'Request not found' });
    }
    
    if (request.shipper.toString() !== req.session.userId) {
      return res.status(403).render('error', { message: 'Unauthorized' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).render('error', { message: 'Request is no longer pending' });
    }
    
    await Request.findByIdAndUpdate(req.params.requestId, { status: 'rejected', rejectedAt: new Date() });
    
    // Delete the delivery request notification from shipper's notification panel
    try {
      const Notification = require('../models/Notification');
      await Notification.deleteMany({
        recipient: req.session.userId,
        type: 'delivery_request',
        relatedRequest: req.params.requestId
      });
    } catch (error) {
      console.error('Error deleting delivery request notification:', error);
    }
    
    // Notify transporter that request was rejected
    try {
      const populated = await Request.findById(req.params.requestId).populate('shipper transporter delivery');
      await NotificationService.createNotification({
        recipient: populated.transporter._id,
        sender: populated.shipper._id,
        type: 'request_rejected',
        title: 'Your Request Was Rejected',
        message: `Your request for ${populated.delivery.goodsType} was rejected. Please find another delivery.`,
        relatedRequest: populated._id,
        relatedDelivery: populated.delivery._id,
        priority: 'medium'
      });
    } catch {}

    res.redirect('/dashboard/shipper');
  } catch (error) {
    res.status(500).render('error', { message: 'Error rejecting request' });
  }
});

// Mark goods loaded (called by transporter after reaching shipper and loading)
router.post('/mark-loaded/:requestId', upload.single('loadedPhoto'), requireLogin, requireRole('transporter'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId);
    if (!request) return res.status(404).render('error', { message: 'Request not found' });
    if (request.transporter.toString() !== req.session.userId) {
      return res.status(403).render('error', { message: 'Unauthorized' });
    }
    
    // Update with loaded status and optional photo
    const updateData = { loadedAt: new Date() };
    
    // If there's a photo in the request, save its path
    if (req.file) {
      updateData.loadedPhoto = `/uploads/${req.file.filename}`;
    }
    
    await Request.findByIdAndUpdate(req.params.requestId, updateData);
    
    // Notify shipper that goods are loaded
    try {
      const populated = await Request.findById(req.params.requestId).populate('shipper transporter delivery');
      await NotificationService.createNotification({
        recipient: populated.shipper._id,
        sender: populated.transporter._id,
        type: 'loading_complete',
        title: 'Goods Loaded',
        message: `${populated.transporter.name} marked your goods as loaded for ${populated.delivery.goodsType}.`,
        relatedRequest: populated._id,
        relatedDelivery: populated.delivery._id,
        priority: 'medium'
      });
    } catch {}
    res.redirect('/dashboard/transporter');
  } catch (e) {
    res.status(500).render('error', { message: 'Error updating status' });
  }
});

// Complete delivery (transporter)
router.post('/complete-delivery/:requestId', requireLogin, requireRole('transporter'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId);
    if (!request) {
      return res.status(404).render('error', { message: 'Request not found' });
    }
    
    if (request.transporter.toString() !== req.session.userId) {
      return res.status(403).render('error', { message: 'Unauthorized' });
    }
    
    await Request.findByIdAndUpdate(req.params.requestId, { status: 'completed', completedAt: new Date(), trackingActiveShipper: false, trackingActiveTransporter: false });
    await Delivery.findByIdAndUpdate(request.delivery, { status: 'delivered' });
    await Lorry.findByIdAndUpdate(request.lorry, { status: 'available' });
    
    // Notify shipper that delivery completed
    try {
      const populated = await Request.findById(req.params.requestId).populate('shipper transporter delivery');
      await NotificationService.createNotification({
        recipient: populated.shipper._id,
        sender: populated.transporter._id,
        type: 'delivery_completed',
        title: 'Delivery Completed',
        message: `${populated.transporter.name} completed delivery for ${populated.delivery.goodsType}.`,
        relatedRequest: populated._id,
        relatedDelivery: populated.delivery._id,
        priority: 'high'
      });
    } catch {}
    res.redirect('/dashboard/transporter');
  } catch (error) {
    res.status(500).render('error', { message: 'Error completing delivery' });
  }
});

  // Get messages for a request
  router.get('/requests/:requestId/messages', requireLogin, async (req, res) => {
    try {
      const request = await Request.findById(req.params.requestId).populate('messages.sender', 'name');
      if (!request) return res.status(404).json({ error: 'Request not found' });

      const userId = req.session.userId;
      if (request.shipper.toString() !== userId && request.transporter.toString() !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      res.json({ messages: request.messages });
    } catch (e) {
      res.status(500).json({ error: 'Error fetching messages' });
    }
  });

  // Post a message to a request (only between shipper and transporter)
  router.post('/requests/:requestId/messages', requireLogin, async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: 'Message text required' });

      const request = await Request.findById(req.params.requestId);
      if (!request) return res.status(404).json({ error: 'Request not found' });

      const userId = req.session.userId;
      if (request.shipper.toString() !== userId && request.transporter.toString() !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Only allow messaging from acceptance until delivery completed/payment completed
      if (request.status !== 'accepted' && request.status !== 'in-transit' && request.status !== 'pending') {
        return res.status(400).json({ error: 'Messaging not allowed for this request status' });
      }

    const message = { sender: new mongoose.Types.ObjectId(userId), text };
      request.messages.push(message);
      await request.save();

      // Emit via Socket.IO to both parties in request room
      if (global.io) {
        global.io.to(request._id.toString()).emit('newMessage', {
          requestId: request._id,
          sender: userId,
          text,
          createdAt: new Date()
        });
      }

      res.json({ success: true });
    } catch (e) {
      console.error('Error posting message:', e);
      res.status(500).json({ error: 'Error posting message' });
    }
  });

module.exports = router;
