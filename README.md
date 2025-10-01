# T2YD - Goods Transport Platform

A modern, multilingual transport platform built with Node.js/Express backend and EJS frontend, featuring real-time notifications, bid management, language support, responsive design, and enhanced user-friendly UI with comprehensive icon integration.

## 🌟 Key Features

- 🚛 **Transport Management**: Add and manage lorries, deliveries, and transport requests
- 💰 **Bid Management**: Transporter bidding system with accept/reject functionality
- 🔔 **Real-time Notifications**: Live notifications with Socket.IO for instant updates
- 🌐 **Multilingual Support**: English, Hindi, and Marathi language options
- 📍 **Real-time Tracking**: Live location tracking with Socket.IO
- 🔐 **Authentication**: Session-based authentication with role-based access control
- 👤 **User Profiles**: Comprehensive profile management with booking history
- 🤖 **AI Chat Assistant**: Intelligent chatbot for user support and guidance
- 📱 **Responsive Design**: Mobile-first design that works on all devices
- 💳 **Payment Integration**: Stripe payment processing
- 🔄 **Real-time Updates**: Live updates for transport status and location
- ✨ **Enhanced UI**: User-friendly interface with comprehensive Font Awesome icon integration

## 🆕 Recent Updates

### v2.4.0 - Dependency Updates & Deprecation Fixes
- **🔧 Node.js Compatibility**: Fixed Node.js deprecation warnings for better compatibility with Node.js v22+
- **⚙️ Dependency Updates**: Updated dependencies to latest versions for improved security and performance
- **🐛 Bug Fixes**: Resolved 404 error when accessing delivery details from search results
- **🔐 Authentication Improvements**: Enhanced error handling for login with user-friendly messages
- **🎨 UI Enhancements**: Added alert styles for better error message display
- **🔒 Security Fix**: Fixed unauthorized delivery deletion vulnerability by adding proper ownership checks

### v2.3.0 - Card Styles & Loading Animations
- **🎴 Modern Card Styles**: Added glassmorphism effect with blur backdrop filter for detail pages
- **🔄 Loading Animations**: Implemented full-screen loading animation for page transitions
- **✨ Enhanced Detail Pages**: Improved delivery and lorry detail pages with modern styling
- **📱 Responsive Cards**: Ensured card styles work seamlessly across all device sizes
- **🎨 Status Badges**: Added color-coded status badges for different delivery/lorry statuses
- **🚀 Transition Effects**: Smooth animations for cards and page loading
- **🔍 Visual Feedback**: Better user feedback during navigation and data loading
- **📊 Consistent Information Display**: Standardized information display with icons

#### Using the New Features
- **Card Styles**: Applied automatically to delivery and lorry detail pages
- **Loading Animation**: Appears during page transitions and AJAX requests
- **Status Badges**: Color-coded by status (pending, in-transit, delivered, available, unavailable)
- **Icons**: Added to all information fields for better visual hierarchy

### v2.2.0 - Enhanced User Interface & Icons
- **🎨 Comprehensive Icon Integration**: Added Font Awesome icons throughout the application for improved user experience
- **🔍 Enhanced Search Interface**: Improved search input with embedded search icon and better visual design
- **📱 Navigation Improvements**: Added contextual icons to all navigation links and user actions
- **🎯 Dashboard Enhancements**: Enhanced shipper and transporter dashboards with relevant icons
- **📝 Form Improvements**: Added icons to form labels, buttons, and action elements
- **🎨 Visual Consistency**: Implemented consistent icon coloring and spacing across all views
- **✨ Interactive Elements**: Added hover effects and contextual colors for better user feedback
- **📱 Mobile Optimization**: Ensured all icon enhancements work seamlessly on mobile devices

### v2.1.0 - Profile Management
- **👤 User Profile System**: Complete profile management with account settings
- **📊 Booking History**: Role-specific booking history for transporters and shippers
- **🔐 Account Security**: Password change and account deletion functionality
- **🔔 Flash Notifications**: Improved user feedback with flash messages
- **🎨 Enhanced UI**: Responsive profile design with modern styling

### v2.0.0 - Major Feature Release
- **🌐 Multilingual Support**: Added English, Hindi, and Marathi language options
- **💰 Bid Management System**: Complete bidding workflow with accept/reject functionality
- **🔔 Enhanced Notifications**: Real-time notifications with action buttons
- **📱 Improved Mobile Experience**: Better mobile navigation and responsive design
- **🔄 Automatic Cleanup**: Smart notification management and data cleanup
- **🎯 Role-based Dashboards**: Enhanced shipper and transporter dashboards

### v1.1.0 - Enhanced Features
- Added real-time location tracking with Socket.IO
- Implemented Leaflet maps for delivery tracking
- Added location autocomplete with geocoding
- Enhanced mobile responsiveness
- Added route optimization with OSRM
- Improved user experience with real-time updates

---

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time communication
- **EJS** templating engine
- **Stripe** for payments
- **Express-session** for session management

### Frontend
- **EJS** templates with embedded JavaScript
- **Socket.IO Client** for real-time features
- **Responsive CSS** with modern design system
- **Glassmorphism UI** with card styles and loading animations
- **Font Awesome Icons** for enhanced user experience
- **Language switching** with dynamic content updates
- **Real-time notifications** with action buttons

### UI Components
- **Card Styles**: Modern glassmorphism effect with blur backdrop filter
- **Loading Animation**: Full-screen loading spinner with fade transitions
- **Status Badges**: Color-coded status indicators for different states
- **Responsive Design**: Mobile-first approach with flexible layouts
- **Icon Integration**: Contextual icons for improved information hierarchy

## 📁 Project Structure

```
T2YD/
├── config/                 # Database and environment configuration
│   ├── db.js              # MongoDB connection
│   └── env.js             # Environment variables
├── middleware/             # Express middleware
│   └── auth.js            # Authentication and role-based access
├── models/                 # Mongoose models
│   ├── Delivery.js        # Delivery management
│   ├── Lorry.js           # Lorry/vehicle management
│   ├── Notification.js    # Notification system
│   ├── Payment.js         # Payment processing
│   ├── Request.js         # Transport requests and bids
│   └── User.js            # User management
├── routes/                 # Express routes
│   ├── authRoutes.js      # Authentication routes
│   ├── bidRoutes.js       # Bid management routes
│   ├── dashboardRoutes.js # Dashboard and request management
│   ├── deliveryRoutes.js  # Delivery management
│   ├── lorryRoutes.js     # Lorry management
│   ├── notificationRoutes.js # Notification system
│   ├── paymentRoutes.js   # Payment processing
│   └── profileRoutes.js   # User profile management
├── services/               # Business logic
│   └── notificationService.js # Notification creation and management
├── views/                  # EJS templates
│   ├── index.ejs          # Home page
│   ├── layout.ejs         # Main layout with navigation
│   ├── profile.ejs        # User profile page
│   ├── dashboard/         # Dashboard views
│   ├── auth/              # Authentication views
│   └── ...                # Other page templates
├── public/                 # Static files
│   ├── css/               # CSS stylesheets
│   │   └── card-styles.css # Modern card and loading styles
│   ├── style-modern.css   # Modern design system with icon styles
│   ├── profile.css        # Profile page styles
│   └── languages/         # Language files
│       ├── en.js          # English translations
│       ├── hi.js          # Hindi translations
│       └── mr.js          # Marathi translations
├── server.js               # Express server entry point
└── package.json            # Project dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher, v22+ recommended)
- MongoDB (local or Atlas)
- npm (or yarn)

### Installation
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd T2YD
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   - Copy or create a `.env` file or update `config/env.js` as needed
   - Set your MongoDB URI and any API keys
   - Example:
     ```env
     NODE_ENV=development
     PORT=3000
     MONGODB_URI=mongodb://127.0.0.1:27017/t2yd
     STRIPE_SECRET_KEY=your-stripe-key
     ```

4. **Start MongoDB:**
   - If running locally, start your MongoDB server:
     ```bash
     mongod
     ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Access the app:**
   - Open [http://localhost:3000](http://localhost:3000) in your browser

7. **Note on Deprecation Warnings:**
   - If you encounter Node.js deprecation warnings, you can suppress them by starting the app with:
     ```bash
     # For development
     NODE_OPTIONS="--no-deprecation" npm run dev
     
     # For production
     NODE_OPTIONS="--no-deprecation" npm start
     ```
   - Alternatively, you can use the `--trace-deprecation` flag to identify the source of warnings

## 📋 Available Scripts

```bash
# Start in development mode (with nodemon)
npm run dev

# Start in production mode
npm start
```

## 🌟 Core Features

### 🌐 Multilingual Support
- **Three Languages**: English, Hindi (हिंदी), and Marathi (मराठी)
- **Dynamic Switching**: Change language without page reload
- **Persistent Selection**: Language preference saved in localStorage
- **Complete Coverage**: All UI elements and content translated

### 💰 Bid Management System
- **Transporter Bidding**: Send bids for available deliveries
- **Shipper Actions**: Accept or reject bids directly from notifications
- **Bid History**: Track previous bids and their status
- **Re-bidding**: Allow new bids after rejection
- **Price Negotiation**: Flexible pricing with bid amounts

### 🔔 Real-time Notification System
- **Instant Updates**: Real-time notifications using Socket.IO
- **Action Buttons**: Accept/reject requests directly from notifications
- **Smart Cleanup**: Automatic notification removal after actions
- **Priority Levels**: Urgent, high, medium, and low priority notifications
- **Mobile Optimized**: Responsive notification dropdown

### 🚛 Transport Management
- **Lorry Management**: Add, edit, and manage transport vehicles
- **Delivery Creation**: Create and manage delivery requests
- **Request System**: Handle transport requests between shippers and transporters
- **Status Tracking**: Real-time status updates for all operations

### 📱 Mobile-First Design
- **Responsive Navigation**: Optimized for all screen sizes
- **Touch-Friendly**: Mobile-optimized interface
- **Language Selector**: Compact language switcher on mobile
- **Notification System**: Mobile-friendly notification handling

### ✨ Enhanced User Interface
- **Comprehensive Icon Integration**: Font Awesome icons throughout the application
- **Contextual Visual Elements**: Icons that match their function and context
- **Enhanced Search Experience**: Improved search input with embedded search icon
- **Visual Consistency**: Unified icon styling with consistent colors and spacing
- **Interactive Feedback**: Hover effects and contextual colors for better UX
- **Form Enhancement**: Icons in form labels, buttons, and action elements
- **Navigation Clarity**: Clear visual indicators for all navigation elements
- **Status Visualization**: Color-coded icons for different statuses and actions

### 🤖 AI Chat Assistant
- **Intelligent Support**: AI-powered chatbot for answering user questions
- **Context-Aware Responses**: Different responses based on user authentication status
- **Floating Button**: Accessible chat button visible on all pages when logged in
- **Dedicated Page**: Full-featured chat interface with conversation history
- **Smart Help Topics**: Quick access to common help topics
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛣️ Application Routes

### Public Routes
- `/` - Home page with lorries and deliveries
- `/search` - Search functionality
- `/auth/login` - User login
- `/auth/signup` - User registration

### Shipper Routes
- `/dashboard/shipper` - Shipper dashboard with incoming requests
- `/deliveries/add` - Add new delivery
- `/deliveries/my` - View own deliveries
- `/deliveries/:id/edit` - Edit delivery
- `/dashboard/track/:requestId` - Track delivery

### Transporter Routes
- `/dashboard/transporter` - Transporter dashboard with available deliveries
- `/lorries/add` - Add new lorry
- `/lorries/my` - View own lorries
- `/lorries/:id/edit` - Edit lorry
- `/bid/:deliveryId` - Send bid for delivery
- `/dashboard/track/:requestId` - Track delivery

### Shared Routes
- `/chatbot` - AI chat assistant interface
- `/notifications/view` - View all notifications
- `/payments/request/:requestId` - Payment processing

## 🔄 Real-time Features

### Socket.IO Events
- `joinUser` - Join user's notification room
- `newNotification` - Send new notifications
- `locationUpdate` - Send location updates (for tracking)
- `stopTracking` - Stop location tracking

### Live Features
- **Real-time Notifications**: Instant notification delivery
- **Live Updates**: Real-time status changes
- **Bid Management**: Live bid acceptance/rejection
- **Request Processing**: Instant request handling

## 🌍 Language System

### Supported Languages
1. **English** 🇺🇸 - Default language
2. **Hindi** 🇮🇳 - हिंदी support
3. **Marathi** 🇮🇳 - मराठी support

### Language Features
- **Dynamic Content**: All text elements translated
- **Persistent Storage**: Language preference saved
- **Mobile Optimized**: Compact language selector
- **Native Names**: Display in native script

## 🎨 Icon System & Visual Design

### Font Awesome Integration
- **Comprehensive Coverage**: Icons added to all major UI elements
- **Contextual Design**: Icons that semantically match their function
- **Consistent Styling**: Unified color scheme and spacing across the application
- **Interactive Feedback**: Hover effects and contextual colors for better UX

### Icon Categories
- **Navigation Icons**: Home, dashboard, profile, and action icons
- **Form Icons**: Labels, buttons, and input field indicators
- **Status Icons**: Color-coded icons for different states and actions
- **Action Icons**: Buttons and interactive elements with clear visual cues
- **Dashboard Icons**: Role-specific icons for shipper and transporter dashboards

### Visual Enhancements
- **Enhanced Search**: Search input with embedded search icon
- **Form Clarity**: Icons in form labels for better understanding
- **Button Design**: Action buttons with relevant icons and hover effects
- **Status Visualization**: Color-coded icons for pending, accepted, rejected, and completed states
- **Mobile Optimization**: All icon enhancements optimized for mobile devices

## 📱 Mobile Experience

The application is built with a mobile-first approach:
- **Responsive Navigation**: Adapts to all screen sizes
- **Touch-Friendly Interface**: Optimized for mobile devices
- **Language Support**: Easy language switching on mobile
- **Notification System**: Mobile-optimized notifications
- **Bid Management**: Full functionality on mobile devices

## 🔐 Authentication & Security

- **Session-based Authentication**: Secure user sessions
- **Role-based Access Control**: Shipper/Transporter permissions
- **Protected Routes**: Middleware-based route protection
- **Secure Sessions**: Extended session management
- **Input Validation**: Server-side validation for all inputs

## 💳 Payment System

- **Stripe Integration**: Secure payment processing
- **Request-based Payments**: Payment for specific transport requests
- **Secure Transactions**: PCI-compliant payment handling
- **Payment History**: Track all payment transactions

## 🚀 Production Deployment

### 1. Set Environment Variables
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=your-production-mongodb-uri
STRIPE_SECRET_KEY=your-production-stripe-key
```

### 2. Start Production Server
```bash
npm start
```

### 3. Process Management
Consider using PM2 or similar process manager for production:
```bash
npm install -g pm2
pm2 start server.js --name "t2yd"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Test thoroughly before submitting
- Update documentation for new features
- Ensure mobile responsiveness
- Add language support for new features

## 📝 License

This project is licensed under the ISC License.

## 📞 Contact & Support

For support, questions, or feature requests:
- Open an issue on GitHub
- Contact the development team
- Check the documentation

## 🔄 Changelog

### v2.5.0 - Chat Assistant & UI Improvements
- **🤖 AI Chat Assistant**: Added intelligent chatbot for user support and guidance
- **💬 Chat Interface**: Floating chat button and dedicated assistant page
- **🧠 Smart Responses**: Context-aware responses for common user queries
- **👤 Conditional UI**: Assistant options adapt based on user login status
- **🎨 UI Enhancements**: Improved chat interface with modern styling
- **🔄 Conversation History**: Persistent chat history storage
- **📱 Responsive Chat**: Mobile-optimized chat interface
- **🧹 Navbar Cleanup**: Removed assistant link from navbar for cleaner navigation

### v2.4.0 - Dependency Updates & Deprecation Fixes
- **🔧 Node.js Compatibility**: Fixed Node.js deprecation warnings for better compatibility with Node.js v22+
- **⚙️ Dependency Updates**: Updated dependencies to latest versions for improved security and performance
- **🐛 Bug Fixes**: Resolved 404 error when accessing delivery details from search results
- **🔐 Authentication Improvements**: Enhanced error handling for login with user-friendly messages
- **🎨 UI Enhancements**: Added alert styles for better error message display
- **🔒 Security Fix**: Fixed unauthorized delivery deletion vulnerability by adding proper ownership checks

### v2.3.0 - Card Styles & Loading Animations
- **🎴 Modern Card Styles**: Added glassmorphism effect with blur backdrop filter for detail pages
- **🔄 Loading Animations**: Implemented full-screen loading animation for page transitions
- **✨ Enhanced Detail Pages**: Improved delivery and lorry detail pages with modern styling
- **📱 Responsive Cards**: Ensured card styles work seamlessly across all device sizes
- **🎨 Status Badges**: Added color-coded status badges for different delivery/lorry statuses
- **🚀 Transition Effects**: Smooth animations for cards and page loading
- **🔍 Visual Feedback**: Better user feedback during navigation and data loading
- **📊 Consistent Information Display**: Standardized information display with icons

### v2.2.0 - Enhanced User Interface & Icons
- **🎨 Comprehensive Icon Integration**: Added Font Awesome icons throughout the application
- **🔍 Enhanced Search Interface**: Improved search input with embedded search icon
- **📱 Navigation Improvements**: Added contextual icons to all navigation elements
- **🎯 Dashboard Enhancements**: Enhanced dashboards with relevant icons
- **📝 Form Improvements**: Added icons to form labels and action buttons
- **🎨 Visual Consistency**: Implemented consistent icon styling and colors
- **✨ Interactive Elements**: Added hover effects and contextual feedback
- **📱 Mobile Optimization**: Ensured seamless icon experience on mobile

### v2.1.0 - Profile Management
- **👤 User Profile System**: Complete profile management with account settings
- **📊 Booking History**: Role-specific booking history for transporters and shippers
- **🔐 Account Security**: Password change and account deletion functionality
- **🔔 Flash Notifications**: Improved user feedback with flash messages
- **🎨 Enhanced UI**: Responsive profile design with modern styling

### v2.0.0 - Major Feature Release
- **🌐 Multilingual Support**: Added English, Hindi, and Marathi
- **💰 Bid Management**: Complete bidding system with accept/reject
- **🔔 Enhanced Notifications**: Real-time notifications with actions
- **📱 Mobile Improvements**: Better mobile experience
- **🔄 Smart Cleanup**: Automatic notification management
- **🎯 Dashboard Enhancements**: Improved role-based dashboards

### v1.1.0 - Enhanced Features
- Real-time location tracking with Socket.IO
- Leaflet maps for delivery tracking
- Location autocomplete with geocoding
- Enhanced mobile responsiveness
- Route optimization with OSRM
- Improved user experience

### v1.0.0 - Initial Release
- EJS-based frontend
- Session-based authentication
- Basic transport management
- Responsive design

---

**T2YD** - Connecting transporters and shippers across India with a modern, multilingual platform. 🚛✨
