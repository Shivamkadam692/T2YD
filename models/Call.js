const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['voice', 'video'],
    required: true
  },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'connected', 'completed', 'missed', 'failed'],
    default: 'initiated'
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Call', callSchema);