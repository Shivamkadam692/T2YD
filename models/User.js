const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  role: { type: String, enum: ['transporter', 'shipper'], required: true },
  phone: String,
  operatingRegion: {
    city: String,
    district: String,
    state: String,
    pincode: String,
    lat: Number,
    lng: Number,
    address: String,
    strict: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
  }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
