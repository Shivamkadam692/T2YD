# T2YD - Goods Transport Platform

A modern transport platform built with Node.js/Express backend and EJS frontend, featuring real-time tracking, location services, and responsive design.

## Features

- 🚛 **Transport Management**: Add and manage lorries, deliveries, and transport requests
- 📍 **Real-time Tracking**: Live location tracking with Socket.IO and Leaflet maps
- 🔐 **Authentication**: Session-based authentication with role-based access control
- 📱 **Responsive Design**: Mobile-first design that works on all devices
- 🗺️ **Location Services**: Geocoding and route optimization with OSRM
- 💳 **Payment Integration**: Stripe payment processing
- 🔄 **Real-time Updates**: Live updates for transport status and location

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time communication
- **EJS** templating engine
- **Stripe** for payments

### Frontend
- **EJS** templates with embedded JavaScript
- **Leaflet.js** for interactive maps
- **Socket.IO Client** for real-time features
- **Responsive CSS** with mobile-first design
- **Location autocomplete** with Nominatim geocoding

## Project Structure

```
T2YD/
├── config/                 # Database configuration
├── middleware/             # Express middleware
├── models/                 # Mongoose models
├── routes/                 # Express routes
├── views/                  # EJS templates
├── public/                 # Static files (CSS, JS)
├── server.js               # Express server
└── package.json            # Backend dependencies
```

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (running locally or Atlas connection)
- npm or yarn package manager

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd T2YD
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Ensure MongoDB is running and the database `transh` exists:
```bash
# Start MongoDB (if running locally)
mongod

# Or connect to MongoDB Atlas
# Update connection string in config/db.js
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Access the Application
- **Application**: http://localhost:3000
- **MongoDB**: mongodb://127.0.0.1:27017/transh

## Development Scripts

```bash
# Development
npm run dev          # Start server with nodemon

# Production
npm start            # Start server in production mode
```

## Key Features

### Real-time Tracking
- Live location updates every 5 seconds
- High-accuracy GPS positioning
- Route optimization with OSRM
- Distance calculations and ETA
- Real-time updates for both shipper and transporter

### Location Services
- Geocoding with Nominatim (OpenStreetMap)
- Location autocomplete for pickup/drop locations
- Route planning with multiple alternatives
- Interactive maps with Leaflet.js

### Mobile Responsiveness
- Mobile-first design approach
- Responsive navigation (all options visible on mobile)
- Touch-friendly interface
- Optimized layouts for all screen sizes

### Authentication & Security
- Session-based authentication
- Role-based access control (Shipper/Transporter)
- Secure password hashing with bcrypt
- Protected routes and middleware

## Routes

### Public Routes
- `/` - Home page with lorries and deliveries
- `/search` - Search functionality
- `/auth/login` - User login
- `/auth/signup` - User registration

### Shipper Routes
- `/dashboard/shipper` - Shipper dashboard
- `/deliveries/add` - Add new delivery
- `/deliveries/:id/edit` - Edit delivery
- `/dashboard/track/:requestId` - Track delivery

### Transporter Routes
- `/dashboard/transporter` - Transporter dashboard
- `/lorries/add` - Add new lorry
- `/lorries/:id/edit` - Edit lorry
- `/dashboard/track/:requestId` - Track delivery

### Shared Routes
- `/payments/request/:requestId` - Payment processing

## Real-time Features

### Socket.IO Events
- `join` - Join tracking room
- `locationUpdate` - Send location updates
- `stopTracking` - Stop location tracking

### Live Tracking Features
- Real-time location updates every 5 seconds
- High-accuracy GPS positioning
- Route optimization with OSRM
- Distance calculations and ETA
- Live updates visible to both shipper and transporter

## Mobile Experience

The application is built with a mobile-first approach:
- **Always visible navigation** - No hamburger menus, all options visible
- **Touch-friendly interface** - Optimized for mobile devices
- **Responsive layouts** - Adapts to all screen sizes
- **Mobile-optimized forms** - Easy input on small screens

## Production Deployment

### 1. Set Environment Variables
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=your-production-mongodb-uri
```

### 2. Start Production Server
```bash
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please open an issue in the repository or contact the development team.

## Changelog

### v1.1.0 - Enhanced Features
- Added real-time location tracking with Socket.IO
- Implemented Leaflet maps for delivery tracking
- Added location autocomplete with geocoding
- Enhanced mobile responsiveness
- Added route optimization with OSRM
- Improved user experience with real-time updates

### v1.0.0 - Initial Release
- EJS-based frontend
- Session-based authentication
- Basic transport management
- Responsive design
