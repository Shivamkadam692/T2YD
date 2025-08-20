const mongoose = require('mongoose');

const lorrySchema = new mongoose.Schema({
  transporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerName: String,
  contact: String,
  vehicleNumber: String,
  vehicleType: String,
  capacity: Number,
  location: String,
  status: { type: String, enum: ['available', 'busy', 'maintenance', 'offline'], default: 'available' },
  description: String,
  requests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Request' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lorry', lorrySchema);
