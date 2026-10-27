const express = require('express');
const router = express.Router();
const { requireLogin, requireRole } = require('../middleware/auth');
const Request = require('../models/Request');
const Delivery = require('../models/Delivery');
const Lorry = require('../models/Lorry');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const BidService = require('../services/bidService');
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
    const [deliveries, requests] = await Promise.all([
      Delivery.find({ shipper: req.session.userId }).sort({ createdAt: -1 }).lean(),
      Request.find({ 
        shipper: req.session.userId,
        delivery: { $exists: true, $ne: null }
      })
        .populate('transporter', 'name email contact')
        .populate('lorry', 'vehicleNumber vehicleType capacity location')
        .populate('delivery', 'goodsType pickupLocation dropLocation weight amount status exactPickup exactDrop createdAt')
        .sort({ createdAt: -1 })
        .lean()
    ]);
    
    res.render('shipperDashboard', { deliveries, requests });
  } catch (error) {
    console.error('Error loading shipper dashboard:', error);
    res.status(500).render('error', { message: 'Error loading dashboard' });
  }
});

// Transporter Dashboard
router.get('/transporter', requireLogin, requireRole('transporter'), async (req, res) => {
  try {
    const [lorries, requests, availableDeliveries] = await Promise.all([
      Lorry.find({ transporter: req.session.userId }).sort({ createdAt: -1 }).lean(),
      Request.find({ 
        transporter: req.session.userId,
        delivery: { $exists: true, $ne: null }
      })
        .populate('shipper', 'name email contact')
        .populate('delivery', 'goodsType pickupLocation dropLocation weight amount status exactPickup exactDrop createdAt')
        .populate('lorry', 'vehicleNumber vehicleType capacity location')
        .sort({ createdAt: -1 })
        .lean(),
      Delivery.find({ 
        status: 'pending',
        $or: [
          { transporter: { $exists: false } },
          { transporter: null }
        ]
      })
        .populate('shipper', 'name email')
        .sort({ createdAt: -1 })
        .lean()
    ]);
    
    // Batch query bids to avoid N+1 database queries
    const deliveryIds = availableDeliveries.map(d => d._id);
    const existingBids = deliveryIds.length > 0 ? await Request.find({
      delivery: { $in: deliveryIds },
      transporter: req.session.userId
    }).select('delivery status price createdAt rejectedAt acceptedAt').lean() : [];
    
    const bidsMap = new Map(existingBids.map(b => [b.delivery.toString(), b]));
    
    const deliveriesWithBidStatus = availableDeliveries.map((delivery) => {
      const existingBid = bidsMap.get(delivery._id.toString());
      return {
        ...delivery,
        bidStatus: existingBid ? {
          status: existingBid.status,
          price: existingBid.price,
          createdAt: existingBid.createdAt,
          rejectedAt: existingBid.rejectedAt,
          acceptedAt: existingBid.acceptedAt
        } : null
      };
    });
    
    res.render('transporterDashboard', { lorries, requests, availableDeliveries: deliveriesWithBidStatus });
  } catch (error) {
    console.error('Error loading transporter dashboard:', error);
    res.status(500).render('error', { message: 'Error loading dashboard' });
  }
});

// General fleet tracking overview route
router.get('/track', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId?.toString();
    const activeRequests = await Request.find({
      $or: [{ shipper: userId }, { transporter: userId }],
      status: { $in: ['accepted', 'pending'] }
    })
      .populate('shipper', 'name phone email')
      .populate('transporter', 'name phone email')
      .populate('delivery', 'pickupLocation dropLocation goodsType exactPickup exactDrop weight amount description')
      .populate('lorry', 'vehicleNumber vehicleType capacity ownerName contact status')
      .sort({ updatedAt: -1 });

    if (activeRequests && activeRequests.length > 0) {
      return res.redirect(`/dashboard/track/${activeRequests[0]._id}`);
    }

    res.render('track', { request: null, activeRequests: [] });
  } catch (e) {
    res.status(500).render('error', { message: 'Error loading tracking' });
  }
});

// Live tracking page with access rules
router.get('/track/:requestId', requireLogin, async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId)
      .populate('shipper', 'name phone email')
      .populate('transporter', 'name phone email')
      .populate('delivery', 'pickupLocation dropLocation goodsType exactPickup exactDrop weight amount description')
      .populate('lorry', 'vehicleNumber vehicleType capacity ownerName contact status');
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
      request._doc.shipperLocation = undefined;
    }
    // Allow tracking access even after completion if there's a loaded photo to view
    if (request.status === 'completed' && !request.loadedPhoto) {
      return res.status(403).render('error', { message: 'Tracking is no longer available for this delivery' });
    }

    // Also fetch all other active authorized requests for this user for the fleet panel
    const activeRequests = await Request.find({
      $or: [{ shipper: userId }, { transporter: userId }],
      status: { $in: ['accepted', 'pending'] }
    })
      .populate('shipper', 'name phone email')
      .populate('transporter', 'name phone email')
      .populate('delivery', 'pickupLocation dropLocation goodsType exactPickup exactDrop weight amount description')
      .populate('lorry', 'vehicleNumber vehicleType capacity ownerName contact status')
      .sort({ updatedAt: -1 });

    // Redact shipper location for transporter if goods are loaded
    activeRequests.forEach(r => {
      if (r.transporter && r.transporter._id.toString() === userId && r.loadedAt) {
        r._doc.shipperLocation = undefined;
      }
    });

    res.render('track', { request, activeRequests });
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

// Accept request/bid (shipper)
router.post('/accept-request/:requestId', requireLogin, requireRole('shipper'), async (req, res) => {
  try {
    const result = await BidService.acceptBid({
      requestId: req.params.requestId,
      shipperId: req.session.userId
    });

    const isJsonRequest = req.xhr || req.headers.accept?.includes('application/json');
    if (isJsonRequest) {
      return res.json({
        success: true,
        message: 'Bid accepted successfully and transporter assigned.',
        redirectUrl: '/dashboard/set-locations/' + req.params.requestId,
        rejectedCount: result.rejectedCount
      });
    }

    req.flash('success', 'Bid accepted successfully! Competing bids have been rejected.');
    res.redirect('/dashboard/set-locations/' + req.params.requestId);
  } catch (error) {
    console.error('Error accepting bid in dashboardRoutes:', error);
    const status = error.statusCode || 500;
    const isJsonRequest = req.xhr || req.headers.accept?.includes('application/json');
    
    if (isJsonRequest) {
      return res.status(status).json({
        success: false,
        error: error.message || 'Error accepting request'
      });
    }

    req.flash('error', error.message || 'Error accepting request');
    res.status(status).render('error', { message: error.message || 'Error accepting request' });
  }
});

// Set exact pickup and drop locations on interactive map (shipper only)
router.get('/set-locations/:requestId', requireLogin, requireRole('shipper'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId)
      .populate('shipper', 'name')
      .populate('transporter', 'name')
      .populate('delivery')
      .populate('lorry', 'vehicleNumber vehicleType');

    if (!request) return res.status(404).render('error', { message: 'Request not found' });
    if (request.shipper._id.toString() !== req.session.userId) {
      return res.status(403).render('error', { message: 'Unauthorized' });
    }

    res.render('setLocations', { request });
  } catch (err) {
    console.error('Error opening set-locations:', err);
    res.status(500).render('error', { message: 'Error loading location selector' });
  }
});

router.post('/set-locations/:requestId', requireLogin, requireRole('shipper'), async (req, res) => {
  try {
    const { pickupLat, pickupLng, pickupAddress, dropLat, dropLng, dropAddress } = req.body;
    const request = await Request.findById(req.params.requestId).populate('shipper transporter delivery');

    if (!request) return res.status(404).render('error', { message: 'Request not found' });
    if (request.shipper._id.toString() !== req.session.userId) {
      return res.status(403).render('error', { message: 'Unauthorized' });
    }

    const exactPickup = {
      lat: parseFloat(pickupLat) || 0,
      lng: parseFloat(pickupLng) || 0,
      address: (pickupAddress || '').trim() || (request.delivery ? request.delivery.pickupLocation : ''),
      updatedAt: new Date()
    };

    const exactDrop = {
      lat: parseFloat(dropLat) || 0,
      lng: parseFloat(dropLng) || 0,
      address: (dropAddress || '').trim() || (request.delivery ? request.delivery.dropLocation : ''),
      updatedAt: new Date()
    };

    request.exactPickup = exactPickup;
    request.exactDrop = exactDrop;
    await request.save();

    if (request.delivery) {
      await Delivery.findByIdAndUpdate(request.delivery._id, {
        exactPickup,
        exactDrop
      });
    }

    // Broadcast live update over Socket.io
    try {
      if (global.io) {
        global.io.to(req.params.requestId).emit('locationsUpdated', {
          exactPickup,
          exactDrop,
          updatedBy: 'shipper'
        });
      }
    } catch (sockErr) {
      console.error('Socket emission error:', sockErr);
    }

    // Send notification to transporter
    try {
      await NotificationService.createNotification({
        recipient: request.transporter._id,
        sender: request.shipper._id,
        type: 'locations_updated',
        title: 'Exact Route Locations Updated',
        message: `${request.shipper.name} has pinned the exact pickup and drop locations on the map.`,
        relatedRequest: request._id,
        relatedDelivery: request.delivery ? request.delivery._id : null,
        priority: 'high'
      });
    } catch (notifErr) {
      console.error('Notification error:', notifErr);
    }

    res.redirect('/dashboard/shipper');
  } catch (err) {
    console.error('Error saving exact locations:', err);
    res.status(500).render('error', { message: 'Error saving exact locations' });
  }
});

// Reject request/bid (shipper)
router.post('/reject-request/:requestId', requireLogin, requireRole('shipper'), async (req, res) => {
  try {
    await BidService.rejectBid({
      requestId: req.params.requestId,
      shipperId: req.session.userId,
      reason: req.body.reason
    });

    const isJsonRequest = req.xhr || req.headers.accept?.includes('application/json');
    if (isJsonRequest) {
      return res.json({
        success: true,
        message: 'Bid rejected successfully.'
      });
    }

    req.flash('success', 'Bid rejected successfully.');
    res.redirect('/dashboard/shipper');
  } catch (error) {
    console.error('Error rejecting bid in dashboardRoutes:', error);
    const status = error.statusCode || 500;
    const isJsonRequest = req.xhr || req.headers.accept?.includes('application/json');
    if (isJsonRequest) {
      return res.status(status).json({
        success: false,
        error: error.message || 'Error rejecting request'
      });
    }
    req.flash('error', error.message || 'Error rejecting request');
    res.status(status).render('error', { message: error.message || 'Error rejecting request' });
  }
});

// Shared handler for Mark Pickup / Mark Loaded
const handleMarkPickupAction = async (req, res) => {
  try {
    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;
    const result = await BidService.markPickup({
      requestId: req.params.requestId,
      transporterId: req.session.userId,
      photoPath
    });

    const isJsonRequest = req.xhr || req.headers.accept?.includes('application/json');

    if (result.alreadyMarked) {
      if (isJsonRequest) {
        return res.status(409).json({
          success: false,
          alreadyMarked: true,
          message: result.message,
          loadedAt: result.loadedAt
        });
      }
      req.flash('error', result.message);
      return res.redirect('/dashboard/transporter');
    }

    if (isJsonRequest) {
      return res.json({
        success: true,
        message: result.message,
        loadedAt: result.loadedAt,
        loadedPhoto: result.loadedPhoto
      });
    }

    req.flash('success', result.message);
    res.redirect('/dashboard/transporter');
  } catch (error) {
    console.error('Error marking pickup in dashboardRoutes:', error);
    const status = error.statusCode || 500;
    const isJsonRequest = req.xhr || req.headers.accept?.includes('application/json');

    if (isJsonRequest) {
      return res.status(status).json({
        success: false,
        error: error.message || 'Error marking pickup'
      });
    }

    req.flash('error', error.message || 'Error updating status');
    res.status(status).render('error', { message: error.message || 'Error updating status' });
  }
};

// Mark goods picked up (canonical route)
router.post('/mark-pickup/:requestId', upload.single('loadedPhoto'), requireLogin, requireRole('transporter'), handleMarkPickupAction);

// Mark goods loaded (legacy route compatibility)
router.post('/mark-loaded/:requestId', upload.single('loadedPhoto'), requireLogin, requireRole('transporter'), handleMarkPickupAction);

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
    await Delivery.findByIdAndUpdate(request.delivery, { 
      status: 'delivered',
      transporter: request.transporter,
      amount: request.price
    });
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

      const senderUser = await User.findById(userId).select('name');
      const senderName = senderUser ? senderUser.name : 'User';

      // Emit via Socket.IO to both parties in request room
      if (global.io) {
        global.io.to(request._id.toString()).emit('newMessage', {
          requestId: request._id,
          sender: userId,
          senderName: senderName,
          text,
          createdAt: new Date()
        });
      }

      // Notify the recipient if they aren't currently viewing the room
      const recipientId = request.shipper.toString() === userId ? request.transporter.toString() : request.shipper.toString();
      try {
        await NotificationService.createNotification({
          recipient: recipientId,
          sender: userId,
          type: 'new_message',
          title: `New Message from ${senderName}`,
          message: text.length > 50 ? text.substring(0, 47) + '...' : text,
          relatedRequest: request._id,
          priority: 'medium'
        });
      } catch (notifErr) {
        console.error('Error creating chat notification:', notifErr);
      }

      res.json({ success: true });
    } catch (e) {
      console.error('Error posting message:', e);
      res.status(500).json({ error: 'Error posting message' });
    }
  });

module.exports = router;
