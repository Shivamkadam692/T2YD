const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://ktiku5392:XkWzXfeBWDPJeL8E@t2yd.sfyhphm.mongodb.net/?retryWrites=true&w=majority&appName=T2YD');
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
