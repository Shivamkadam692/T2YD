const express = require('express');
const router = express.Router();
const { requireLogin, requireRole } = require('../middleware/auth');
const Delivery = require('../models/Delivery');
const Lorry = require('../models/Lorry');
const Request = require('../models/Request');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const mongoose = require('mongoose');

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
    
    res.render('transporterDashboard', { lorries, requests, availableDeliveries });
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
      request.shipperLocation = undefined;
    }
    if (request.status === 'completed') {
      // After completion, no tracking access for either party
      return res.status(403).render('error', { message: 'Tracking is no longer available for this delivery' });
    }

    res.render('track', { request });
  } catch (e) {
    res.status(500).render('error', { message: 'Error loading tracking' });
  }
});

// Send request (transporter to shipper)
router.post('/send-request', requireLogin, requireRole('transporter'), async (req, res) => {
  try {
    const { deliveryId, lorryId, price, message } = req.body;
    
    // Check if request already exists
    const existingRequest = await Request.findOne({
      delivery: deliveryId,
      lorry: lorryId,
      transporter: req.session.userId
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
    res.status(500).render('error', { message: 'Error sending request' });
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

// Mark goods loaded (called by transporter after reaching shipper and loading)
router.post('/mark-loaded/:requestId', requireLogin, requireRole('transporter'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId);
    if (!request) return res.status(404).render('error', { message: 'Request not found' });
    if (request.transporter.toString() !== req.session.userId) {
      return res.status(403).render('error', { message: 'Unauthorized' });
    }
    await Request.findByIdAndUpdate(req.params.requestId, { loadedAt: new Date() });
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
