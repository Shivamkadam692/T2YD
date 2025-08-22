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

## Screenshots

<!-- Add screenshots of the dashboard, tracking, and mobile views here -->

---

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


## Folder Structure

```
T2YD/
├── config/                 # Database and environment configuration
│   ├── db.js
│   └── env.js
├── middleware/             # Express middleware (e.g., authentication)
│   └── auth.js
├── models/                 # Mongoose models (Delivery, Lorry, User, etc.)
│   ├── Delivery.js
│   ├── Lorry.js
│   ├── Notification.js
│   ├── Payment.js
│   ├── Request.js
│   └── User.js
├── routes/                 # Express routes
│   ├── authRoutes.js
│   ├── dashboardRoutes.js
│   ├── deliveryRoutes.js
│   ├── lorryRoutes.js
│   ├── notificationRoutes.js
│   ├── paymentRoutes.js
│   └── api/
│       └── lorryRoutes.js
├── services/               # Business logic and integrations
│   └── notificationService.js
├── views/                  # EJS templates (frontend pages)
│   └── *.ejs
├── public/                 # Static files (CSS, images)
│   ├── style.css
│   └── style-modern.css
├── server.js               # Express server entry point
└── package.json            # Project dependencies and scripts
```

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (running locally or Atlas connection)
- npm or yarn package manager


## Getting Started

### Prerequisites
- Node.js (v16 or higher)
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
	- Copy or create a `.env` file or update `config/env.js` as needed.
	- Set your MongoDB URI and any API keys.
	- Example:
	  ```env
	  NODE_ENV=development
	  PORT=3000
	  MONGODB_URI=mongodb://127.0.0.1:27017/transh
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
	- Open [http://localhost:3000](http://localhost:3000) in your browser.


## Scripts

```bash
# Start in development mode (with nodemon)
npm run dev
# Start in production mode
npm start
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

## Contact

For support, questions, or feature requests, please open an issue or contact the development team.

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
