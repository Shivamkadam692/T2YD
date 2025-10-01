const Call = require('../models/Call');

class CallService {
  // Create a new call record
  static async createCall(data) {
    try {
      const call = new Call(data);
      await call.save();
      return call;
    } catch (error) {
      console.error('Error creating call record:', error);
      throw error;
    }
  }

  // Update call status
  static async updateCallStatus(callId, status, duration = 0) {
    try {
      const updateData = { status };
      if (duration > 0) {
        updateData.duration = duration;
        updateData.endedAt = new Date();
      }
      
      const call = await Call.findByIdAndUpdate(
        callId,
        updateData,
        { new: true }
      );
      
      return call;
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
  }

  // Get user's call history
  static async getUserCallHistory(userId, limit = 20, skip = 0) {
    try {
      return await Call.find({
        $or: [{ caller: userId }, { recipient: userId }]
      })
        .populate('caller', 'name')
        .populate('recipient', 'name')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
    } catch (error) {
      console.error('Error fetching call history:', error);
      throw error;
    }
  }

  // Get unread call count (missed calls)
  static async getMissedCallCount(userId) {
    try {
      return await Call.countDocuments({
        recipient: userId,
        status: 'missed'
      });
    } catch (error) {
      console.error('Error fetching missed call count:', error);
      throw error;
    }
  }

  // Mark calls as read (change missed to completed)
  static async markCallsAsRead(userId) {
    try {
      return await Call.updateMany(
        { recipient: userId, status: 'missed' },
        { status: 'completed' }
      );
    } catch (error) {
      console.error('Error marking calls as read:', error);
      throw error;
    }
  }
}

module.exports = CallService;