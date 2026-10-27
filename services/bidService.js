const mongoose = require('mongoose');
const Request = require('../models/Request');
const Delivery = require('../models/Delivery');
const Lorry = require('../models/Lorry');
const NotificationService = require('./notificationService');

class BidService {
  /**
   * Accepts a bid/request on a delivery.
   * Atomically assigns the delivery to the transporter, marks the bid accepted,
   * rejects all other pending bids for that delivery, and notifies all parties.
   */
  static async acceptBid({ requestId, shipperId }) {
    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      const error = new Error('Invalid request ID');
      error.statusCode = 400;
      throw error;
    }

    const request = await Request.findById(requestId)
      .populate('shipper', 'name email')
      .populate('transporter', 'name email')
      .populate('lorry', 'vehicleNumber vehicleType capacity')
      .populate('delivery');

    if (!request) {
      const error = new Error('Request not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify ownership: only the shipper of this request can accept
    const requestShipperId = (request.shipper?._id || request.shipper).toString();
    if (requestShipperId !== shipperId.toString()) {
      const error = new Error('Unauthorized - Only the shipper can accept this bid');
      error.statusCode = 403;
      throw error;
    }

    // Check if request is still pending
    if (request.status !== 'pending') {
      const error = new Error(`Bid is already ${request.status}`);
      error.statusCode = 400;
      throw error;
    }

    if (!request.delivery) {
      const error = new Error('No delivery associated with this request');
      error.statusCode = 400;
      throw error;
    }

    const deliveryId = request.delivery._id || request.delivery;

    // Check delivery status and assignment
    const currentDelivery = await Delivery.findById(deliveryId);
    if (!currentDelivery) {
      const error = new Error('Associated delivery not found');
      error.statusCode = 404;
      throw error;
    }

    if (currentDelivery.status !== 'pending' || (currentDelivery.transporter && currentDelivery.transporter.toString() !== '')) {
      const error = new Error('This load has already been assigned to another transporter or is no longer pending.');
      error.statusCode = 409;
      throw error;
    }

    // Attempt MongoDB session transaction where supported (replica set or mongos cluster)
    let session = null;
    let useTransaction = false;
    try {
      const topologyType = mongoose.connection?.client?.topology?.description?.type;
      const isReplicaOrSharded = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';
      if (isReplicaOrSharded) {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      }
    } catch (e) {
      if (session) {
        try { session.endSession(); } catch (_) {}
        session = null;
      }
      useTransaction = false;
    }

    let updatedDelivery = null;
    let updatedRequest = null;
    let otherPendingBids = [];

    try {
      const sessionOpt = useTransaction ? { session } : {};

      // 1. Atomically assign Delivery ONLY if still pending and unassigned (prevents race condition)
      updatedDelivery = await Delivery.findOneAndUpdate(
        {
          _id: deliveryId,
          status: 'pending',
          $or: [
            { transporter: { $exists: false } },
            { transporter: null }
          ]
        },
        {
          $set: {
            status: 'in-transit',
            transporter: request.transporter._id || request.transporter,
            amount: request.price
          }
        },
        { new: true, ...sessionOpt }
      );

      if (!updatedDelivery) {
        const error = new Error('This load has already been assigned or is no longer available for bidding.');
        error.statusCode = 409;
        throw error;
      }

      // 2. Atomically mark selected bid as Accepted
      updatedRequest = await Request.findOneAndUpdate(
        {
          _id: request._id,
          status: 'pending'
        },
        {
          $set: {
            status: 'accepted',
            acceptedAt: new Date()
          }
        },
        { new: true, ...sessionOpt }
      );

      if (!updatedRequest) {
        const error = new Error('This bid is no longer pending.');
        error.statusCode = 409;
        throw error;
      }

      // 3. Mark assigned lorry as busy
      if (request.lorry) {
        const lorryId = request.lorry._id || request.lorry;
        await Lorry.findByIdAndUpdate(
          lorryId,
          { $set: { status: 'busy' } },
          sessionOpt
        );
      }

      // 4. Find all other pending bids for the SAME delivery to notify their respective bidders
      const otherQuery = Request.find({
        delivery: deliveryId,
        _id: { $ne: request._id },
        status: 'pending'
      }).populate('transporter', 'name email');

      if (useTransaction) {
        otherQuery.session(session);
      }
      otherPendingBids = await otherQuery;

      // 5. Automatically mark all other pending bids for this load as Rejected
      const rejectedTimestamp = new Date();
      await Request.updateMany(
        {
          delivery: deliveryId,
          _id: { $ne: request._id },
          status: 'pending'
        },
        {
          $set: {
            status: 'rejected',
            rejectedAt: rejectedTimestamp
          }
        },
        sessionOpt
      );

      if (useTransaction) {
        await session.commitTransaction();
        session.endSession();
        session = null;
      }
    } catch (dbError) {
      if (useTransaction && session) {
        try {
          await session.abortTransaction();
          session.endSession();
        } catch (_) {}
      }
      throw dbError;
    }

    // Clean up shipper's pending notifications for this load
    try {
      const Notification = require('../models/Notification');
      await Notification.deleteMany({
        recipient: shipperId,
        relatedRequest: { $in: [request._id, ...otherPendingBids.map(b => b._id)] },
        type: { $in: ['bid_sent', 'delivery_request'] }
      });
    } catch (notifCleanupErr) {
      console.error('Error cleaning up shipper notifications:', notifCleanupErr);
    }

    const loadIdStr = updatedDelivery._id.toString();
    const shortLoadId = loadIdStr.slice(-6).toUpperCase();
    const goodsName = updatedDelivery.goodsType || 'Goods';
    const pickupLoc = updatedDelivery.pickupLocation || 'Pickup';
    const dropLoc = updatedDelivery.dropLocation || 'Destination';

    // 6. Automatically notify every rejected bidder
    for (const otherBid of otherPendingBids) {
      try {
        const bidderId = otherBid.transporter?._id || otherBid.transporter;
        if (!bidderId) continue;

        const rejectionMessage = `Your bid for Load #${shortLoadId} (${goodsName}, ${pickupLoc} → ${dropLoc}) has been rejected because another bid was accepted by the load owner. You can explore other available loads and submit new bids.`;

        await NotificationService.createNotification({
          recipient: bidderId,
          sender: shipperId,
          type: 'request_rejected',
          title: `Bid Rejected - Load #${shortLoadId}`,
          message: rejectionMessage,
          relatedRequest: otherBid._id,
          relatedDelivery: updatedDelivery._id,
          priority: 'medium'
        });

        // Real-time notification & dashboard sync over Socket.IO
        if (global.io) {
          global.io.to(`user_${bidderId}`).emit('bidRejected', {
            requestId: otherBid._id,
            deliveryId: updatedDelivery._id,
            loadId: shortLoadId,
            message: rejectionMessage,
            status: 'rejected'
          });
        }
      } catch (rejectNotifErr) {
        console.error('Error notifying rejected bidder:', rejectNotifErr);
      }
    }

    // 7. Notify the accepted bidder that their bid was accepted
    try {
      const acceptedTransporterId = request.transporter?._id || request.transporter;
      const shipperDisplayName = request.shipper?.name || 'Load Owner';
      const acceptanceMessage = `Congratulations! ${shipperDisplayName} accepted your bid of ₹${request.price} for Load #${shortLoadId} (${goodsName}, ${pickupLoc} → ${dropLoc}). You are now assigned to this delivery.`;

      await NotificationService.createNotification({
        recipient: acceptedTransporterId,
        sender: shipperId,
        type: 'request_accepted',
        title: `Your Bid Was Accepted - Load #${shortLoadId}`,
        message: acceptanceMessage,
        relatedRequest: updatedRequest._id,
        relatedDelivery: updatedDelivery._id,
        priority: 'high'
      });

      // Real-time notification & dashboard sync over Socket.IO
      if (global.io) {
        global.io.to(`user_${acceptedTransporterId}`).emit('bidAccepted', {
          requestId: updatedRequest._id,
          deliveryId: updatedDelivery._id,
          loadId: shortLoadId,
          message: acceptanceMessage,
          price: request.price,
          status: 'accepted'
        });
      }
    } catch (acceptNotifErr) {
      console.error('Error notifying accepted bidder:', acceptNotifErr);
    }

    // 8. Broadcast delivery update to all connected clients so dashboards update immediately
    if (global.io) {
      global.io.emit('deliveryAssigned', {
        deliveryId: updatedDelivery._id,
        loadId: shortLoadId,
        transporterId: request.transporter?._id || request.transporter,
        status: 'in-transit'
      });
    }

    return {
      success: true,
      request: updatedRequest,
      delivery: updatedDelivery,
      rejectedCount: otherPendingBids.length
    };
  }

  /**
   * Rejects a single pending bid manually by the shipper.
   */
  static async rejectBid({ requestId, shipperId, reason }) {
    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      const error = new Error('Invalid request ID');
      error.statusCode = 400;
      throw error;
    }

    const request = await Request.findById(requestId)
      .populate('shipper', 'name')
      .populate('transporter', 'name email')
      .populate('delivery');

    if (!request) {
      const error = new Error('Request not found');
      error.statusCode = 404;
      throw error;
    }

    const requestShipperId = (request.shipper?._id || request.shipper).toString();
    if (requestShipperId !== shipperId.toString()) {
      const error = new Error('Unauthorized - Only the shipper can reject this bid');
      error.statusCode = 403;
      throw error;
    }

    if (request.status !== 'pending') {
      const error = new Error(`Request is no longer pending (current: ${request.status})`);
      error.statusCode = 400;
      throw error;
    }

    const rejectedAt = new Date();
    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      { $set: { status: 'rejected', rejectedAt } },
      { new: true }
    );

    // Delete pending notification from shipper's panel
    try {
      const Notification = require('../models/Notification');
      await Notification.deleteMany({
        recipient: shipperId,
        type: { $in: ['bid_sent', 'delivery_request'] },
        relatedRequest: requestId
      });
    } catch (notifErr) {
      console.error('Error cleaning notification:', notifErr);
    }

    // Notify transporter that bid was rejected
    try {
      const delivery = request.delivery;
      const shortLoadId = delivery ? delivery._id.toString().slice(-6).toUpperCase() : 'N/A';
      const goods = delivery ? delivery.goodsType : 'Goods';
      const defaultMsg = `Your bid for Load #${shortLoadId} (${goods}) was declined by the load owner. You can explore other available loads and submit new bids.`;

      await NotificationService.createNotification({
        recipient: request.transporter._id || request.transporter,
        sender: shipperId,
        type: 'request_rejected',
        title: `Your Bid Was Rejected - Load #${shortLoadId}`,
        message: reason ? `${defaultMsg} Note: ${reason}` : defaultMsg,
        relatedRequest: request._id,
        relatedDelivery: delivery ? delivery._id : null,
        priority: 'medium'
      });

      if (global.io) {
        global.io.to(`user_${request.transporter._id || request.transporter}`).emit('bidRejected', {
          requestId: request._id,
          deliveryId: delivery ? delivery._id : null,
          loadId: shortLoadId,
          message: defaultMsg,
          status: 'rejected'
        });
      }
    } catch (notifyErr) {
      console.error('Error sending rejection notification:', notifyErr);
    }

    return {
      success: true,
      request: updatedRequest
    };
  }

  /**
   * Marks goods as loaded/picked up by the transporter.
   * Atomic operation ensuring it cannot be processed multiple times.
   */
  static async markPickup({ requestId, transporterId, photoPath }) {
    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      const error = new Error('Invalid request ID');
      error.statusCode = 400;
      throw error;
    }

    // Check request existence and authorization
    const request = await Request.findById(requestId)
      .populate('shipper', 'name email')
      .populate('transporter', 'name email')
      .populate('delivery');

    if (!request) {
      const error = new Error('Request not found');
      error.statusCode = 404;
      throw error;
    }

    const assignedTransporterId = (request.transporter?._id || request.transporter).toString();
    if (assignedTransporterId !== transporterId.toString()) {
      const error = new Error('Unauthorized - Only the assigned transporter can mark pickup');
      error.statusCode = 403;
      throw error;
    }

    if (request.status !== 'accepted') {
      const error = new Error(`Cannot mark pickup: request status is '${request.status}' (must be 'accepted')`);
      error.statusCode = 400;
      throw error;
    }

    // Atomic update: only update if loadedAt has NOT yet been set
    const updateData = {
      loadedAt: new Date()
    };
    if (photoPath) {
      updateData.loadedPhoto = photoPath;
    }

    const updatedRequest = await Request.findOneAndUpdate(
      {
        _id: requestId,
        transporter: transporterId,
        status: 'accepted',
        $or: [
          { loadedAt: { $exists: false } },
          { loadedAt: null }
        ]
      },
      {
        $set: updateData
      },
      { new: true }
    );

    // If update returned null, check whether it was already marked or concurrency conflict
    if (!updatedRequest) {
      const existing = await Request.findById(requestId);
      if (existing && existing.loadedAt) {
        return {
          success: false,
          alreadyMarked: true,
          message: 'Pickup has already been marked for this load.',
          loadedAt: existing.loadedAt,
          loadedPhoto: existing.loadedPhoto
        };
      }
      const error = new Error('Failed to mark pickup. Load is not eligible or in an invalid state.');
      error.statusCode = 400;
      throw error;
    }

    // Ensure associated delivery is in-transit
    if (request.delivery) {
      const deliveryId = request.delivery._id || request.delivery;
      await Delivery.findByIdAndUpdate(deliveryId, {
        $set: { status: 'in-transit' }
      });
    }

    // Notify shipper that goods have been picked up / loaded
    try {
      const shipperId = request.shipper?._id || request.shipper;
      const transporterName = request.transporter?.name || 'Transporter';
      const goodsType = request.delivery?.goodsType || 'Goods';
      const shortLoadId = request.delivery ? request.delivery._id.toString().slice(-6).toUpperCase() : 'N/A';

      await NotificationService.createNotification({
        recipient: shipperId,
        sender: transporterId,
        type: 'loading_complete',
        title: `Goods Picked Up - Load #${shortLoadId}`,
        message: `${transporterName} has confirmed pickup of ${goodsType} for Load #${shortLoadId}. Delivery is now in transit.`,
        relatedRequest: updatedRequest._id,
        relatedDelivery: request.delivery ? request.delivery._id : null,
        priority: 'high'
      });
    } catch (notifErr) {
      console.error('Error creating pickup notification:', notifErr);
    }

    // Real-time broadcast over Socket.IO
    if (global.io) {
      // Broadcast to request tracking room
      global.io.to(requestId.toString()).emit('pickupMarked', {
        requestId: updatedRequest._id,
        loadedAt: updatedRequest.loadedAt,
        loadedPhoto: updatedRequest.loadedPhoto
      });

      // Broadcast to shipper personal room
      const shipperId = request.shipper?._id || request.shipper;
      global.io.to(`user_${shipperId}`).emit('pickupMarked', {
        requestId: updatedRequest._id,
        loadedAt: updatedRequest.loadedAt,
        loadedPhoto: updatedRequest.loadedPhoto
      });
    }

    return {
      success: true,
      alreadyMarked: false,
      message: 'Pickup marked successfully! Delivery is now in transit.',
      loadedAt: updatedRequest.loadedAt,
      loadedPhoto: updatedRequest.loadedPhoto
    };
  }
}

module.exports = BidService;
