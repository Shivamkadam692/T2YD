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

const lorryRoutes = require('./routes/lorryRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const authRoutes = require('./routes/authRoutes');
const bidRoutes = require('./routes/bidRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { requireLogin } = require('./middleware/auth');

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
  cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

// Pass user to all views
app.use(async (req, res, next) => {
  res.locals.user = null;
  if (req.session.userId) {
    const User = require('./models/User');
    res.locals.user = await User.findById(req.session.userId);
  }
  next();
});

// Routes
app.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const userRole = req.session.role;

    // Show lorries depending on user role
    let lorryQuery;
    if (userRole === 'transporter') {
      // Transporters should see only the lorries they added
      lorryQuery = { transporter: userId };
    } else if (userId) {
      // Logged-in non-transporters: show available lorries and any they own
      lorryQuery = { $or: [ { status: 'available' }, { transporter: userId } ] };
    } else {
      // Guests: show only available lorries
      lorryQuery = { status: 'available' };
    }

    // For transporters we only show deliveries that are available for bidding (pending)
    let deliveryQuery;
    if (userRole === 'transporter') {
      deliveryQuery = { status: 'pending' };
    } else if (userId) {
      // Logged-in non-transporters: show non-delivered deliveries and their own deliveries (including completed)
      deliveryQuery = { $or: [ { status: { $ne: 'delivered' } }, { shipper: userId } ] };
    } else {
      // Guests: show deliveries that are not delivered
      deliveryQuery = { status: { $ne: 'delivered' } };
    }

    const lorries = await Lorry.find(lorryQuery);
    const deliveries = await Delivery.find(deliveryQuery);

    res.render('index', { lorries, deliveries });
  } catch (e) {
    console.error('Error loading home:', e);
    res.status(500).render('error', { message: 'Error loading home' });
  }
});

app.get('/search', async (req, res) => {
  const query = req.query.query;
  const lorryResults = await Lorry.find({
    $or: [
      { location: { $regex: query, $options: 'i' } },
      { vehicleType: { $regex: query, $options: 'i' } },
      { ownerName: { $regex: query, $options: 'i' } }
    ]
  });
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
app.use('/bid', bidRoutes);
app.use('/payments', paymentRoutes);
app.use('/notifications', notificationRoutes);

// Public static pages used by the footer
app.get('/about', (req, res) => res.render('about'));
app.get('/terms', (req, res) => res.render('terms'));
app.get('/privacy', (req, res) => res.render('privacy'));
app.get('/contact', (req, res) => res.render('contact'));

// Notifications page route
app.get('/notifications', requireLogin, (req, res) => {
  res.render('notifications');
});

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
