const mongoose = require('mongoose');

const chatBotMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isUser: {
    type: Boolean,
    default: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatBotConversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages: [chatBotMessageSchema],
  lastActive: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
chatBotConversationSchema.index({ user: 1, lastActive: -1 });

module.exports = mongoose.model('ChatBotConversation', chatBotConversationSchema);