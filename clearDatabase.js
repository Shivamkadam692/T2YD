const mongoose = require('mongoose');
const connectDB = require('./config/db');

// Import all models
const User = require('./models/User');
const Delivery = require('./models/Delivery');
const Lorry = require('./models/Lorry');
const Notification = require('./models/Notification');
const Payment = require('./models/Payment');
const Request = require('./models/Request');

async function clearDatabase() {
  try {
    // Connect to the database
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear all collections
    console.log('Clearing database collections...');
    
    const notificationsCount = await Notification.countDocuments();
    await Notification.deleteMany({});
    console.log(`Deleted ${notificationsCount} notifications`);
    
    const paymentsCount = await Payment.countDocuments();
    await Payment.deleteMany({});
    console.log(`Deleted ${paymentsCount} payments`);
    
    const requestsCount = await Request.countDocuments();
    await Request.deleteMany({});
    console.log(`Deleted ${requestsCount} requests`);
    
    const deliveriesCount = await Delivery.countDocuments();
    await Delivery.deleteMany({});
    console.log(`Deleted ${deliveriesCount} deliveries`);
    
    const lorriesCount = await Lorry.countDocuments();
    await Lorry.deleteMany({});
    console.log(`Deleted ${lorriesCount} lorries`);
    
    // Keep users if you want to preserve login credentials
    // Uncomment the following lines to also delete users
    /*
    const usersCount = await User.countDocuments();
    await User.deleteMany({});
    console.log(`Deleted ${usersCount} users`);
    */
    
    console.log('Database cleared successfully!');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run the function
clearDatabase();