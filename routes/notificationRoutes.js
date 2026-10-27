const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');
const BidService = require('../services/bidService');
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
    const result = await BidService.acceptBid({
      requestId: req.params.requestId,
      shipperId: req.session.userId
    });

    res.json({ 
      message: 'Request accepted successfully',
      requestId: req.params.requestId,
      redirectUrl: '/dashboard/set-locations/' + req.params.requestId,
      rejectedCount: result.rejectedCount
    });
  } catch (error) {
    console.error('Error accepting request in notificationRoutes:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Error accepting request' });
  }
});

// Accept bid from notification (shipper only)
router.post('/accept-bid/:requestId', requireLogin, async (req, res) => {
  try {
    const result = await BidService.acceptBid({
      requestId: req.params.requestId,
      shipperId: req.session.userId
    });

    res.json({ 
      message: 'Bid accepted successfully',
      requestId: req.params.requestId,
      redirectUrl: '/dashboard/set-locations/' + req.params.requestId,
      rejectedCount: result.rejectedCount
    });
  } catch (error) {
    console.error('Error accepting bid in notificationRoutes:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Error accepting bid' });
  }
});

// Reject bid from notification (shipper only)
router.post('/reject-bid/:requestId', requireLogin, async (req, res) => {
  try {
    await BidService.rejectBid({
      requestId: req.params.requestId,
      shipperId: req.session.userId,
      reason: req.body.reason
    });

    res.json({ 
      message: 'Bid rejected successfully',
      requestId: req.params.requestId
    });
  } catch (error) {
    console.error('Error rejecting bid in notificationRoutes:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Error rejecting bid' });
  }
});

module.exports = router;
