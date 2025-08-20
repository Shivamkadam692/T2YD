const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
  shipper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  transporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true }, // in INR
  type: { type: String, enum: ['advance', 'balance'], required: true },
  status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
  stripeSessionId: String,
  stripePaymentIntentId: String,
  currency: { type: String, default: 'inr' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

paymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
