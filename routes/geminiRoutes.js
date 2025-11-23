const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const customEnv = require('../config/env');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(customEnv.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '');

/**
 * POST /gemini/voice-assist
 * Process voice input with Gemini AI for intelligent responses
 */
router.post('/voice-assist', async (req, res) => {
  try {
    const { transcript, context } = req.body;

    if (!transcript) {
      return res.status(400).json({ 
        success: false, 
        error: 'Transcript is required' 
      });
    }

    // Check if API key is configured
    if (!customEnv.GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
      return res.json({
        success: true,
        intent: 'unknown',
        response: 'Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.',
        confidence: 0,
        fallback: true
      });
    }

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Build context-aware prompt
    const userRole = context?.userRole || 'guest';
    const isAuthenticated = context?.isAuthenticated || false;

    const prompt = `You are a helpful voice assistant for T2YD, a goods transport platform connecting shippers and transporters in India.

User Context:
- Role: ${userRole}
- Authenticated: ${isAuthenticated}

User Voice Input: "${transcript}"

Note: The user may speak in English, Hindi, or Marathi. The input has been translated to English for processing.

Available Commands:
- Navigation: home, dashboard, profile, about, terms, privacy, contact
- Additional Pages: notifications, payments, bids, chat, settings
- Transport: add truck/lorry, add delivery, view my lorries, view my deliveries
- Language: change language to English/Hindi/Marathi
- Search: search for [query]
- Help: show help, what can you do

Task: Analyze the user's voice input and provide:
1. The detected intent (e.g., 'go_home', 'add_delivery', 'change_language', 'search', 'help', 'go_notifications', 'go_payments', 'go_bids', 'go_chat', 'go_settings', 'general_query')
2. A natural, conversational response (max 2 sentences)
3. Confidence score (0-100)
4. Any extracted entities (e.g., language: 'hindi', query: 'electronics', location: 'Mumbai')

Respond in JSON format:
{
  "intent": "detected_intent",
  "response": "Natural response to the user",
  "confidence": 85,
  "entities": {
    "key": "value"
  }
}

If the user's input doesn't match any command, provide helpful guidance.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response from Gemini
    let aiResponse;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      aiResponse = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : text);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      aiResponse = {
        intent: 'unknown',
        response: 'I understood your command, but had trouble processing it. Please try again.',
        confidence: 50,
        entities: {}
      };
    }

    res.json({
      success: true,
      ...aiResponse,
      raw: text // Include raw response for debugging
    });

  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process voice input',
      fallback: true,
      intent: 'unknown',
      response: 'I had trouble understanding that. Please try again or say "help" for available commands.'
    });
  }
});

/**
 * POST /gemini/chat
 * General chat with Gemini AI for natural conversation
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }

    // Check if API key is configured
    if (!customEnv.GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
      return res.json({
        success: true,
        response: 'Gemini API is not configured. Please add your GEMINI_API_KEY to the environment variables.',
        fallback: true
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Build conversation history if provided
    let prompt = `You are a helpful assistant for T2YD, a goods transport platform. Answer questions about transport, logistics, and help users navigate the platform. Keep responses concise and friendly.\n\n`;
    
    if (history && history.length > 0) {
      prompt += 'Conversation history:\n';
      history.forEach(msg => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
      prompt += '\n';
    }
    
    prompt += `User: ${message}\nAssistant:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      response: text.trim()
    });

  } catch (error) {
    console.error('Gemini chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat message',
      fallback: true
    });
  }
});

module.exports = router;
