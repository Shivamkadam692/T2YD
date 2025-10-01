const express = require('express');
const router = express.Router();
const CallService = require('../services/callService');
const { requireLogin } = require('../middleware/auth');

// Initiate a call
router.post('/initiate', requireLogin, async (req, res) => {
  try {
    const { recipientId, type } = req.body;
    const callerId = req.session.userId;
    
    // Create call record
    const call = await CallService.createCall({
      caller: callerId,
      recipient: recipientId,
      type,
      status: 'initiated',
      startedAt: new Date()
    });
    
    // In a real implementation, you would integrate with a WebRTC service here
    // For now, we'll just return success
    
    res.json({ 
      success: true, 
      message: 'Call initiated successfully',
      callId: call._id
    });
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initiate call' 
    });
  }
});

// Update call status
router.post('/update-status', requireLogin, async (req, res) => {
  try {
    const { callId, status, duration } = req.body;
    
    const call = await CallService.updateCallStatus(callId, status, duration);
    
    if (!call) {
      return res.status(404).json({ 
        success: false, 
        message: 'Call not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Call status updated successfully',
      call
    });
  } catch (error) {
    console.error('Error updating call status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update call status' 
    });
  }
});

// Get user's call history
router.get('/history', requireLogin, async (req, res) => {
  try {
    // Validate pagination parameters
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20;
    
    // Ensure valid pagination values
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 20;
    
    const skip = (page - 1) * limit;

    const calls = await CallService.getUserCallHistory(
      req.session.userId,
      limit,
      skip
    );

    res.json({
      calls,
      currentPage: page,
      hasMore: calls.length === limit
    });
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch call history' 
    });
  }
});

// Get missed call count
router.get('/missed-count', requireLogin, async (req, res) => {
  try {
    const count = await CallService.getMissedCallCount(req.session.userId);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching missed call count:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch missed call count' 
    });
  }
});

// Mark calls as read
router.put('/mark-read', requireLogin, async (req, res) => {
  try {
    await CallService.markCallsAsRead(req.session.userId);
    res.json({ 
      success: true, 
      message: 'Calls marked as read' 
    });
  } catch (error) {
    console.error('Error marking calls as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark calls as read' 
    });
  }
});

module.exports = router;