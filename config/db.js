const mongoose = require('mongoose');

const connectDB = async () => {
  try {
  const customEnv = require('./env');
  const uri = customEnv.MONGODB_URI || process.env.MONGODB_URI || '';
  if (!uri) throw new Error('MONGODB_URI is not set in environment');
  await mongoose.connect(uri);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
