const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');
const { requireLogin } = require('../middleware/auth');
const Request = require('../models/Request');
const Delivery = require('../models/Delivery');
const Lorry = require('../models/Lorry');

// Test notification endpoint
router.post('/test', requireLogin, async (req, res, next) => {
  try {
    const testNotification = await NotificationService.createNotification({
      recipient: req.session.userId,
      type: 'system',
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working!',
      priority: 'high'
    });
    
    res.json({ 
      message: 'Test notification created successfully', 
      notification: testNotification 
    });
  } catch (error) {
    next(error);
  }
});

// Get user notifications (JSON API)
router.get('/', requireLogin, async (req, res, next) => {
  try {
    // Validate pagination parameters
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20;
    
    // Ensure valid pagination values
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 20;
    
    const skip = (page - 1) * limit;

    const notifications = await NotificationService.getUserNotifications(
      req.session.userId,
      limit,
      skip
    );

    const unreadCount = await NotificationService.getUnreadCount(req.session.userId);

    res.json({
      notifications,
      unreadCount,
      currentPage: page,
      hasMore: notifications.length === limit
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Render notifications page
router.get('/view', requireLogin, async (req, res) => {
  try {
    res.render('notifications');
  } catch (error) {
    console.error('Error rendering notifications page:', error);
    res.status(500).render('error', { message: 'Error loading notifications' });
  }
});

// Get unread notification count
router.get('/unread-count', requireLogin, async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.session.userId);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Error fetching unread count' });
  }
});

// Mark notification as read
router.put('/:id/read', requireLogin, async (req, res) => {
  try {
    const notification = await NotificationService.markAsRead(
      req.params.id,
      req.session.userId
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', requireLogin, async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.session.userId);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error marking all notifications as read' });
  }
});

// Delete notification
router.delete('/:id', requireLogin, async (req, res) => {
  try {
    const notification = await NotificationService.deleteNotification(
      req.params.id,
      req.session.userId
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

// Delete all read notifications
router.delete('/delete-read', requireLogin, async (req, res) => {
  try {
    const result = await NotificationService.deleteReadNotifications(req.session.userId);
    res.json({ 
      message: 'Read notifications deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    res.status(500).json({ message: 'Error deleting read notifications' });
  }
});

// Accept request from notification (shipper only)
router.post('/accept-request/:requestId', requireLogin, async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Check if user is the shipper for this request
    if (request.shipper.toString() !== req.session.userId) {
      return res.status(403).json({ message: 'Unauthorized - Only the shipper can accept this request' });
    }
    
    // Check if request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is no longer pending' });
    }
    
    // Accept the request
    await Request.findByIdAndUpdate(req.params.requestId, { 
      status: 'accepted', 
      acceptedAt: new Date() 
    });
    
    // Update delivery status
    await Delivery.findByIdAndUpdate(request.delivery, { status: 'in-transit' });
    
    // Update lorry status
    await Lorry.findByIdAndUpdate(request.lorry, { status: 'busy' });
    
    // Reject other pending requests for the same delivery
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
    } catch (error) {
      console.error('Error creating acceptance notification:', error);
    }

    res.json({ 
      message: 'Request accepted successfully',
      requestId: req.params.requestId
    });
  } catch (error) {
    console.error('Error accepting request:', error);
    res.status(500).json({ message: 'Error accepting request' });
  }
});

// Accept bid from notification (shipper only)
router.post('/accept-bid/:requestId', requireLogin, async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ message: 'Bid not found' });
    }
    
    // Check if user is the shipper for this request
    if (request.shipper.toString() !== req.session.userId) {
      return res.status(403).json({ message: 'Unauthorized - Only the shipper can accept this bid' });
    }
    
    // Check if request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Bid is no longer pending' });
    }
    
    // Accept the bid
    await Request.findByIdAndUpdate(req.params.requestId, { 
      status: 'accepted', 
      acceptedAt: new Date() 
    });
    
    // Update delivery status
    await Delivery.findByIdAndUpdate(request.delivery, { status: 'in-transit' });
    
    // Update lorry status
    await Lorry.findByIdAndUpdate(request.lorry, { status: 'busy' });
    
    // Reject other pending requests for the same delivery
    await Request.updateMany(
      { delivery: request.delivery, status: 'pending' },
      { status: 'rejected' }
    );
    
    // Delete the bid notification from shipper's notification panel
    try {
      const Notification = require('../models/Notification');
      await Notification.deleteMany({
        recipient: req.session.userId,
        type: 'bid_sent',
        relatedRequest: req.params.requestId
      });
    } catch (error) {
      console.error('Error deleting bid notification:', error);
    }
    
    // Notify transporter that bid was accepted
    try {
      const populated = await Request.findById(req.params.requestId).populate('shipper transporter delivery');
      await NotificationService.createNotification({
        recipient: populated.transporter._id,
        sender: populated.shipper._id,
        type: 'request_accepted',
        title: 'Your Bid Was Accepted',
        message: `${populated.shipper.name} accepted your bid for ${populated.delivery.goodsType}.`,
        relatedRequest: populated._id,
        relatedDelivery: populated.delivery._id,
        priority: 'high'
      });
    } catch (error) {
      console.error('Error creating bid acceptance notification:', error);
    }

    res.json({ 
      message: 'Bid accepted successfully',
      requestId: req.params.requestId
    });
  } catch (error) {
    console.error('Error accepting bid:', error);
    res.status(500).json({ message: 'Error accepting bid' });
  }
});

// Reject bid from notification (shipper only)
router.post('/reject-bid/:requestId', requireLogin, async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ message: 'Bid not found' });
    }
    
    // Check if user is the shipper for this request
    if (request.shipper.toString() !== req.session.userId) {
      return res.status(403).json({ message: 'Unauthorized - Only the shipper can reject this bid' });
    }
    
    // Check if request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Bid is no longer pending' });
    }
    
    // Reject the bid
    await Request.findByIdAndUpdate(req.params.requestId, { 
      status: 'rejected', 
      rejectedAt: new Date() 
    });
    
    // Delete the bid notification from shipper's notification panel
    try {
      const Notification = require('../models/Notification');
      await Notification.deleteMany({
        recipient: req.session.userId,
        type: 'bid_sent',
        relatedRequest: req.params.requestId
      });
    } catch (error) {
      console.error('Error deleting bid notification:', error);
    }
    
    // Notify transporter that bid was rejected
    try {
      const populated = await Request.findById(req.params.requestId).populate('shipper transporter delivery');
      await NotificationService.createNotification({
        recipient: populated.transporter._id,
        sender: populated.shipper._id,
        type: 'request_rejected',
        title: 'Your Bid Was Rejected',
        message: `Your bid for ${populated.delivery.goodsType} was rejected. Please find another delivery.`,
        relatedRequest: populated._id,
        relatedDelivery: populated.delivery._id,
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error creating bid rejection notification:', error);
    }

    res.json({ 
      message: 'Bid rejected successfully',
      requestId: req.params.requestId
    });
  } catch (error) {
    console.error('Error rejecting bid:', error);
    res.status(500).json({ message: 'Error rejecting bid' });
  }
});

module.exports = router;
