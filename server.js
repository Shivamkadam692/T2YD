// load custom env object (dotenv populated) so the project can access a separate env map
const customEnv = require('./config/env');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');

const lorryRoutes = require('./routes/lorryRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const bidRoutes = require('./routes/bidRoutes');
const profileRoutes = require('./routes/profileRoutes');
const { requireLogin } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const Lorry = require('./models/Lorry');
const Delivery = require('./models/Delivery');
const Request = require('./models/Request');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Make io globally available for notification service
global.io = io;

connectDB();

// Middleware
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));

// Session config
app.use(session({
  secret: customEnv.SESSION_SECRET || process.env.SESSION_SECRET || 'vahak-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: customEnv.MONGODB_URI || process.env.MONGODB_URI || '' }),
  cookie: { 
    // Session will persist until user explicitly logs out
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    httpOnly: true, // Prevents XSS attacks
    secure: process.env.NODE_ENV === 'production', // Only use secure cookies in production
    sameSite: 'lax' // Protects against CSRF attacks
  }
}));

// Flash messages middleware
app.use(flash());

// Pass user and flash messages to all views
app.use(async (req, res, next) => {
  res.locals.user = null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  if (req.session.userId) {
    const User = require('./models/User');
    res.locals.user = await User.findById(req.session.userId);
  }
  next();
});

// Routes
app.get('/', async (req, res) => {
  let lorries;
  
  // If user is a transporter, only show their own lorries
  if (req.session.userId && req.session.userRole === 'transporter') {
    lorries = await Lorry.find({ transporter: req.session.userId });
  } else {
    // For non-transporters (shippers or guests), show all lorries
    lorries = await Lorry.find();
  }
  
  const deliveries = await Delivery.find();
  res.render('index', { lorries, deliveries });
});

app.get('/search', async (req, res) => {
  const query = req.query.query;
  
  // Base search criteria
  const searchCriteria = {
    $or: [
      { location: { $regex: query, $options: 'i' } },
      { vehicleType: { $regex: query, $options: 'i' } },
      { ownerName: { $regex: query, $options: 'i' } }
    ]
  };
  
  // If user is a transporter, only show their own lorries
  if (req.session.userId && req.session.userRole === 'transporter') {
    searchCriteria.transporter = req.session.userId;
  }
  
  const lorryResults = await Lorry.find(searchCriteria);
  const deliveryResults = await Delivery.find({
    $or: [
      { pickupLocation: { $regex: query, $options: 'i' } },
      { dropLocation: { $regex: query, $options: 'i' } },
      { goodsType: { $regex: query, $options: 'i' } }
    ]
  });
  const results = [...lorryResults, ...deliveryResults];
  res.render('searchResults', { results });
});

app.use('/lorries', lorryRoutes);
app.use('/deliveries', deliveryRoutes);
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/payments', paymentRoutes);
app.use('/notifications', notificationRoutes);
app.use('/bid', bidRoutes);
app.use('/profile', profileRoutes);

// Public static pages used by the footer
app.get('/about', (req, res) => res.render('about'));
app.get('/terms', (req, res) => res.render('terms'));
app.get('/privacy', (req, res) => res.render('privacy'));
app.get('/contact', (req, res) => res.render('contact'));

// Notifications page route
app.get('/notifications', requireLogin, (req, res) => {
  res.render('notifications');
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.statusCode = 404;
  next(err);
});

// Global error handler
app.use(errorHandler);

// Socket.IO real-time tracking and notifications
io.on('connection', (socket) => {
  // Join user's personal room for notifications
  socket.on('joinUser', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
    }
  });

  // Join tracking room
  socket.on('join', ({ requestId }) => {
    if (requestId) {
      socket.join(requestId);
    }
  });

  // Leave tracking room
  socket.on('leave', ({ requestId }) => {
    if (requestId) {
      socket.leave(requestId);
    }
  });

  socket.on('locationUpdate', async ({ requestId, role, lat, lng }) => {
    try {
      if (!requestId || lat == null || lng == null) return;
      const update = role === 'shipper'
        ? { shipperLocation: { lat, lng, updatedAt: new Date() }, trackingActiveShipper: true }
        : { transporterLocation: { lat, lng, updatedAt: new Date() }, trackingActiveTransporter: true };
      await Request.findByIdAndUpdate(requestId, update);
      io.to(requestId).emit('locationUpdate', { role, lat, lng, updatedAt: Date.now() });
    } catch (e) {
      console.error('Location update error:', e);
    }
  });

  socket.on('stopTracking', async ({ requestId, role }) => {
    try {
      if (!requestId) return;
      const update = role === 'shipper'
        ? { trackingActiveShipper: false }
        : { trackingActiveTransporter: false };
      await Request.findByIdAndUpdate(requestId, update);
    } catch (e) {
      console.error('Stop tracking error:', e);
    }
  });

  socket.on('disconnect', () => {
    // User disconnected
  });
});

const PORT = customEnv.PORT || process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
