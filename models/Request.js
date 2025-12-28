const mongoose = require('mongoose');

const coordinateSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const requestSchema = new mongoose.Schema({
  shipper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  transporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  delivery: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery' },
  lorry: { type: mongoose.Schema.Types.ObjectId, ref: 'Lorry', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' },
  price: Number,
  message: String,
  messages: [
    {
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  shipperLocation: coordinateSchema,
  transporterLocation: coordinateSchema,
  trackingActiveShipper: { type: Boolean, default: false },
  trackingActiveTransporter: { type: Boolean, default: false },
  acceptedAt: Date,
  rejectedAt: Date,
  loadedAt: Date,
  loadedPhoto: String, // Path to the photo of loaded goods
  completedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

requestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Request', requestSchema);
