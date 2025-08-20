const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  // Create and send a notification
  static async createNotification(data) {
    try {
      console.log('Creating notification with data:', data);
      const notification = new Notification(data);
      await notification.save();
      console.log('Notification saved:', notification._id);
      
      // Emit real-time notification via Socket.IO
      if (global.io) {
        console.log('Emitting notification to user:', data.recipient);
        global.io.to(`user_${data.recipient}`).emit('newNotification', {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          createdAt: notification.createdAt
        });
      } else {
        console.log('Socket.IO not available');
      }
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create delivery request notification
  static async notifyDeliveryRequest(request, transporter) {
    await request.populate(['delivery', 'shipper']);
    
    return await this.createNotification({
      recipient: transporter._id,
      sender: request.shipper._id,
      type: 'delivery_request',
      title: 'New Delivery Request',
      message: `You have a new delivery request from ${request.shipper.name} for ${request.delivery.goodsType} from ${request.delivery.pickupLocation} to ${request.delivery.dropLocation}`,
      relatedRequest: request._id,
      relatedDelivery: request.delivery._id,
      priority: 'high'
    });
  }

  // Create request accepted notification
  static async notifyRequestAccepted(request, shipper) {
    await request.populate(['delivery', 'transporter']);
    
    return await this.createNotification({
      recipient: shipper._id,
      sender: request.transporter._id,
      type: 'request_accepted',
      title: 'Delivery Request Accepted',
      message: `${request.transporter.name} has accepted your delivery request for ${request.delivery.goodsType}`,
      relatedRequest: request._id,
      relatedDelivery: request.delivery._id,
      priority: 'high'
    });
  }

  // Create request rejected notification
  static async notifyRequestRejected(request, shipper) {
    const delivery = await request.populate('delivery');
    const transporter = await request.populate('transporter');
    
    return await this.createNotification({
      recipient: shipper._id,
      sender: transporter._id,
      type: 'request_rejected',
      title: 'Delivery Request Rejected',
      message: `${transporter.name} has rejected your delivery request for ${delivery.goodsType}`,
      relatedRequest: request._id,
      relatedDelivery: delivery._id,
      priority: 'medium'
    });
  }

  // Create delivery started notification
  static async notifyDeliveryStarted(request, shipper) {
    const delivery = await request.populate('delivery');
    const transporter = await request.populate('transporter');
    
    return await this.createNotification({
      recipient: shipper._id,
      sender: transporter._id,
      type: 'delivery_started',
      title: 'Delivery Started',
      message: `${transporter.name} has started your delivery for ${delivery.goodsType}`,
      relatedRequest: request._id,
      relatedDelivery: delivery._id,
      priority: 'high'
    });
  }

  // Create delivery completed notification
  static async notifyDeliveryCompleted(request, shipper) {
    const delivery = await request.populate('delivery');
    const transporter = await request.populate('transporter');
    
    return await this.createNotification({
      recipient: shipper._id,
      sender: transporter._id,
      type: 'delivery_completed',
      title: 'Delivery Completed',
      message: `${transporter.name} has completed your delivery for ${delivery.goodsType}`,
      relatedRequest: request._id,
      relatedDelivery: delivery._id,
      priority: 'high'
    });
  }

  // Create location update notification
  static async notifyLocationUpdate(request, role, otherUser) {
    const delivery = await request.populate('delivery');
    const isShipper = role === 'shipper';
    
    return await this.createNotification({
      recipient: otherUser._id,
      sender: isShipper ? request.shipper : request.transporter,
      type: 'location_update',
      title: 'Location Updated',
      message: `${isShipper ? 'Shipper' : 'Transporter'} location has been updated for delivery ${delivery.goodsType}`,
      relatedRequest: request._id,
      relatedDelivery: delivery._id,
      priority: 'low',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expire in 24 hours
    });
  }

  // Create payment received notification
  static async notifyPaymentReceived(request, amount) {
    const delivery = await request.populate('delivery');
    const transporter = await request.populate('transporter');
    
    return await this.createNotification({
      recipient: transporter._id,
      type: 'payment_received',
      title: 'Payment Received',
      message: `Payment of ₹${amount} has been received for delivery ${delivery.goodsType}`,
      relatedRequest: request._id,
      relatedDelivery: delivery._id,
      priority: 'high'
    });
  }

  // Create system notification
  static async notifySystem(userId, title, message, priority = 'medium') {
    return await this.createNotification({
      recipient: userId,
      type: 'system',
      title,
      message,
      priority
    });
  }

  // Get user notifications
  static async getUserNotifications(userId, limit = 20, skip = 0) {
    return await Notification.find({ recipient: userId })
      .populate('sender', 'name')
      .populate('relatedRequest')
      .populate('relatedDelivery')
      .populate('relatedLorry')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  // Get unread notification count
  static async getUnreadCount(userId) {
    return await Notification.countDocuments({ 
      recipient: userId, 
      isRead: false 
    });
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
      { new: true }
    );
  }

  // Mark all notifications as read
  static async markAllAsRead(userId) {
    return await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );
  }

  // Delete notification
  static async deleteNotification(notificationId, userId) {
    return await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });
  }

  // Delete old notifications (older than 30 days)
  static async cleanupOldNotifications() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
      isRead: true
    });
  }

  // Delete read notifications for a user
  static async deleteReadNotifications(userId) {
    return await Notification.deleteMany({
      recipient: userId,
      isRead: true
    });
  }
}

module.exports = NotificationService;
