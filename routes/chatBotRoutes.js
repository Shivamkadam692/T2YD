const express = require('express');
const router = express.Router();
const ChatBotService = require('../services/chatBotService');
const { requireLogin } = require('../middleware/auth');

// Get chat bot interface
router.get('/', requireLogin, async (req, res) => {
  try {
    res.render('chatBot', { user: res.locals.user });
  } catch (error) {
    console.error('Error rendering chat bot page:', error);
    res.status(500).render('error', { message: 'Error loading chat bot' });
  }
});

// Send a message to the chat bot
router.post('/message', requireLogin, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.session.userId;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message is required' 
      });
    }
    
    // Add user message to conversation
    await ChatBotService.addUserMessage(userId, message);
    
    // Generate bot response
    const botResponse = await ChatBotService.generateBotResponse(userId, message);
    
    res.json({ 
      success: true, 
      response: botResponse 
    });
  } catch (error) {
    console.error('Error processing chat bot message:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process message' 
    });
  }
});

// Get conversation history
router.get('/history', requireLogin, async (req, res) => {
  try {
    const history = await ChatBotService.getConversationHistory(req.session.userId);
    res.json({ 
      success: true, 
      history 
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch chat history' 
    });
  }
});

// Clear conversation
router.delete('/clear', requireLogin, async (req, res) => {
  try {
    await ChatBotService.clearConversation(req.session.userId);
    res.json({ 
      success: true, 
      message: 'Conversation cleared successfully' 
    });
  } catch (error) {
    console.error('Error clearing conversation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to clear conversation' 
    });
  }
});

module.exports = router;