const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  shipper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shipperName: String,
  contact: String,
  goodsType: String,
  weight: Number,
  pickupLocation: String,
  dropLocation: String,
  pickupDateTime: { type: Date, required: true },
  expectedDeliveryDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'in-transit', 'delivered', 'cancelled'], default: 'pending' },
  description: String,
  requests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Request' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Delivery', deliverySchema);
