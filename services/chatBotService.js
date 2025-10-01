const ChatBotConversation = require('../models/ChatBot');
const User = require('../models/User');

class ChatBotService {
  // Get or create a conversation for a user
  static async getOrCreateConversation(userId) {
    try {
      let conversation = await ChatBotConversation.findOne({ user: userId });
      
      if (!conversation) {
        conversation = new ChatBotConversation({
          user: userId,
          messages: []
        });
        await conversation.save();
      }
      
      return conversation;
    } catch (error) {
      console.error('Error getting/creating chat bot conversation:', error);
      throw error;
    }
  }

  // Add a user message to the conversation
  static async addUserMessage(userId, message) {
    try {
      const conversation = await this.getOrCreateConversation(userId);
      
      conversation.messages.push({
        user: userId,
        message: message,
        isUser: true
      });
      
      conversation.lastActive = new Date();
      await conversation.save();
      
      return conversation;
    } catch (error) {
      console.error('Error adding user message:', error);
      throw error;
    }
  }

  // Generate a bot response based on user message
  static async generateBotResponse(userId, userMessage) {
    try {
      // Convert message to lowercase for easier matching
      const message = userMessage.toLowerCase();
      
      // Define bot responses for common questions
      let botResponse = "I'm sorry, I didn't understand that. Can you please rephrase your question?";
      
      // Greetings
      if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
        botResponse = "Hello! How can I help you today?";
      }
      // Help requests
      else if (message.includes('help')) {
        botResponse = "I can help you with information about T2YD. You can ask me about:\n- How to add a lorry or delivery\n- How to find transporters or shippers\n- How to make payments\n- How to track deliveries\n- Account management\n\nWhat would you like to know?";
      }
      // Account related
      else if (message.includes('account') || message.includes('profile')) {
        botResponse = "To manage your account:\n1. Click on 'My Profile' in the navigation menu\n2. Here you can update your personal information, change your password, and view your account details\n3. Don't forget to save your changes!";
      }
      // Lorry related
      else if (message.includes('lorry') || message.includes('truck')) {
        botResponse = "As a transporter, you can:\n1. Click 'Add Lorry' to list your vehicle\n2. Go to 'My Lorries' to view and manage your listings\n3. Update lorry details or remove listings as needed";
      }
      // Delivery related
      else if (message.includes('delivery') || message.includes('goods')) {
        botResponse = "As a shipper, you can:\n1. Click 'Add Delivery' to post a new delivery request\n2. Go to 'My Deliveries' to track your shipments\n3. View bids from transporters and accept the best offer";
      }
      // Payment related
      else if (message.includes('payment') || message.includes('pay')) {
        botResponse = "For payments:\n1. Payments are processed securely through our platform\n2. You can view your payment history in the 'Payments' section\n3. All transactions are protected by our secure payment system";
      }
      // Tracking related
      else if (message.includes('track') || message.includes('location')) {
        botResponse = "To track deliveries:\n1. Go to 'My Deliveries' and select a delivery\n2. Click 'Track Delivery' to see real-time location updates\n3. Both shippers and transporters can view the tracking information";
      }
      // Dashboard related
      else if (message.includes('dashboard')) {
        botResponse = "Your dashboard provides an overview of your activities:\n- Transporters can see incoming requests and their lorry listings\n- Shippers can view their delivery requests and bids\n- Quick access to important notifications and actions";
      }
      // Contact support
      else if (message.includes('contact') || message.includes('support')) {
        botResponse = "If you need further assistance:\n1. Visit our Contact page for support options\n2. You can also email us at support@t2yd.com\n3. Our support team is available Monday-Friday, 9AM-6PM";
      }
      // Default response
      else if (message.includes('thank')) {
        botResponse = "You're welcome! Is there anything else I can help you with?";
      }
      // Bidding related
      else if (message.includes('bid') || message.includes('offer')) {
        botResponse = "To work with bids:\n1. As a transporter, you can view available delivery requests and submit bids\n2. As a shipper, you can review bids from transporters and accept the best offer\n3. Once a bid is accepted, you can communicate with the transporter through the platform";
      }
      // Notifications related
      else if (message.includes('notification') || message.includes('alert')) {
        botResponse = "Notifications keep you updated on important activities:\n1. Click the bell icon in the top navigation to view notifications\n2. You'll receive alerts for new bids, accepted requests, and delivery updates\n3. Missed calls will also appear as notifications";
      }
      // Calls related
      else if (message.includes('call') || message.includes('phone')) {
        botResponse = "You can make voice or video calls directly from notifications:\n1. When you receive a notification from another user, you'll see call buttons\n2. Click the phone icon for voice calls or video icon for video calls\n3. Missed calls will appear in your notification center and call history";
      }
      // Search related
      else if (message.includes('search') || message.includes('find')) {
        botResponse = "To search for lorries or deliveries:\n1. Use the search bar at the top of the homepage\n2. Enter keywords like location, vehicle type, or goods type\n3. Results will show matching lorries and delivery requests";
      }
      // Login related
      else if (message.includes('login') || message.includes('sign in')) {
        botResponse = "You're already logged in! If you're having trouble accessing your account, try refreshing the page or contact support.";
      }
      // Registration related
      else if (message.includes('register') || message.includes('sign up') || message.includes('create account')) {
        botResponse = "You're already registered and logged in! If you need to update your account information, visit the 'My Profile' section.";
      }
      
      // Add bot response to conversation
      const conversation = await ChatBotConversation.findOne({ user: userId });
      
      if (conversation) {
        conversation.messages.push({
          user: userId,
          message: botResponse,
          isUser: false
        });
        
        conversation.lastActive = new Date();
        await conversation.save();
      }
      
      return botResponse;
    } catch (error) {
      console.error('Error generating bot response:', error);
      throw error;
    }
  }

  // Get conversation history
  static async getConversationHistory(userId, limit = 20) {
    try {
      const conversation = await this.getOrCreateConversation(userId);
      
      // Return last N messages
      return conversation.messages.slice(-limit);
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      throw error;
    }
  }

  // Clear conversation history
  static async clearConversation(userId) {
    try {
      const conversation = await ChatBotConversation.findOne({ user: userId });
      
      if (conversation) {
        conversation.messages = [];
        conversation.lastActive = new Date();
        await conversation.save();
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing conversation:', error);
      throw error;
    }
  }
}

module.exports = ChatBotService;