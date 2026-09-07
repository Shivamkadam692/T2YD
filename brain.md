# 🧠 T2YD - System Architecture & Developer Brain

> **T2YD (Goods Transport Platform)** is a real-time, multilingual logistics and freight marketplace connecting load owners (shippers) and lorry owners (transporters). Built with Node.js/Express, MongoDB, EJS, Socket.IO, Google Gemini AI, and Web Speech API.

---

## 📑 Table of Contents

1. [Tech Stack & System Specifications](#-tech-stack--system-specifications)
2. [Directory Structure](#-directory-structure)
3. [Core System Architecture](#-core-system-architecture)
4. [Data Models & Schema Map](#-data-models--schema-map)
5. [Services Layer](#-services-layer)
6. [API & Route Map](#-api--route-map)
7. [Voice & Gemini AI Subsystem](#-voice--gemini-ai-subsystem)
8. [Real-time Socket.IO Subsystem](#-real-time-socketio-subsystem)
9. [Environment & Configuration](#-environment--configuration)
10. [Maintenance & Operations](#-maintenance--operations)

---

## 🛠️ Tech Stack & System Specifications

| Layer | Technology / Package | Purpose |
| :--- | :--- | :--- |
| **Runtime & Framework** | Node.js (CommonJS) / Express v5.1 | Web server, routing, and REST APIs |
| **Database & ORM** | MongoDB / Mongoose v8.17 | Document storage & Object Data Modeling |
| **Session Management** | `express-session`, `connect-mongo` | Cookie-based persistent auth sessions (30 days) |
| **View Engine** | EJS + `express-ejs-layouts` | Server-rendered UI with reusable master layout |
| **Real-time Engine** | Socket.IO v4.7 | Live location tracking, room broadcasts & instant notifications |
| **AI Engine** | `@google/generative-ai` (Gemini API) | Intelligent chatbot assistant, voice intent parsing |
| **Payments** | Stripe SDK v16.0 | Transport payment processing & checkout flows |
| **File Storage** | Multer v1.4 | Local file upload middleware (`public/uploads/`) |
| **Voice Interface** | Web Speech API + Gemini AI | Hands-free voice recognition ("Hey AADI" wake word) |
| **Maps & Tracking** | Leaflet v1.9 | Interactive UI maps for transport routes & location |

---

## 📁 Directory Structure

```
T2YD/
├── config/                  # Database & environment configurations
│   ├── db.js                # Mongoose connection setup
│   └── env.js               # Dotenv wrapper & fallback map
├── controllers/             # Business logic & route handlers
│   ├── authController.js    # Login, signup, session teardown
│   ├── deliveryController.js# Post/manage load shipment requests
│   ├── homeController.js    # Public landing page & global search
│   └── lorryController.js   # Lorry fleet creation & updates
├── middleware/              # Express middleware components
│   ├── auth.js              # Session login protection (`requireLogin`)
│   ├── errorHandler.js      # Global error processing & 404/500 rendering
│   └── validator.js         # Input validation & sanitization
├── models/                  # Mongoose MongoDB schemas
│   ├── User.js              # User profiles (Shippers & Transporters)
│   ├── Lorry.js             # Lorry fleet posts & specs
│   ├── Delivery.js          # Load shipment posts
│   ├── Request.js           # Bids & load booking requests
│   ├── Payment.js           # Stripe transaction records
│   ├── Notification.js      # System & socket alerts
│   ├── ChatBot.js           # Conversation logs for AI assistant
│   └── Call.js              # Call booking & communication logs
├── routes/                  # Express routing modules
│   ├── authRoutes.js        # Auth authentication endpoints
│   ├── bidRoutes.js         # Transporter bidding lifecycle
│   ├── callRoutes.js        # Call booking endpoints
│   ├── chatBotRoutes.js     # Chatbot interaction API
│   ├── dashboardRoutes.js   # User dashboard & management portal
│   ├── deliveryRoutes.js    # Delivery/load routes
│   ├── geminiRoutes.js      # AI intent & voice command handling
│   ├── lorryRoutes.js       # Lorry fleet management routes
│   ├── notificationRoutes.js# Notification fetching & read states
│   ├── paymentRoutes.js     # Stripe checkout & payment intents
│   └── profileRoutes.js     # User profile management
├── services/                # Specialized domain service modules
│   ├── callService.js       # Call logging & scheduling logic
│   ├── chatBotService.js    # Gemini AI query execution & fallback logic
│   └── notificationService.js# Socket.IO & DB alert broadcasting
├── views/                   # EJS Templates
│   ├── layout.ejs           # Master layout wrapper
│   ├── index.ejs            # Main home page
│   ├── dashboard.ejs        # User dashboard portal
│   └── ...                  # Pages (auth, lorries, deliveries, payments, etc.)
├── public/                  # Static assets (CSS, client JS, images, uploads)
│   ├── css/                 # Modern styling & voice UI components
│   ├── js/                  # Client-side scripts (voice, socket, maps)
│   └── uploads/             # User uploaded document/image directory
├── clearDatabase.js         # Maintenance script for database cleanup
├── MAINTENANCE.md           # Maintenance & troubleshooting operational guide
├── README.md                # Comprehensive project user documentation
├── brain.md                 # System Architecture & Technical Index (this file)
├── package.json             # NPM project manifest
└── server.js                # Application entry point & Socket.IO server initialization
```

---

## 🏛️ Core System Architecture

```mermaid
flowchart TD
    Client[Browser Client / Mobile Viewport] -->|HTTP / EJS Views| ExpressServer[Express.js Server (server.js)]
    Client <-->|WebSockets (Socket.IO)| SocketServer[Socket.IO Global Server]

    ExpressServer --> AuthMiddleware[Auth Middleware (requireLogin)]
    ExpressServer --> Routes[Express Router Modules]
    
    Routes --> Controllers[Controllers & Handlers]
    Controllers --> Services[Services Layer]
    
    Services --> DB[(MongoDB Database via Mongoose)]
    Services --> GeminiAPI[Google Gemini AI API]
    Services --> StripeAPI[Stripe Payment Gateway]
    
    Services -->|Trigger Alerts| SocketServer
    SocketServer -->|Emit 'notification' room: user_id| Client
```

---

## 🗄️ Data Models & Schema Map

### 1. **User (`models/User.js`)**
- **Fields**: Name, email, password (hashed via `bcryptjs`), phone, role (`shipper` / `transporter`), preferred language (`en`, `hi`, `mr`), company name, address, created timestamp.

### 2. **Lorry (`models/Lorry.js`)**
- **Fields**: Transporter (ref `User`), lorry number, capacity (tons), vehicle type, current location, routes served, rate per km/trip, status (`available`, `booked`, `inactive`).

### 3. **Delivery (`models/Delivery.js`)**
- **Fields**: Shipper (ref `User`), pickup location, drop location, material type, weight (tons), expected date, budget, status (`pending`, `assigned`, `in_transit`, `completed`, `cancelled`).

### 4. **Request / Bid (`models/Request.js`)**
- **Fields**: Delivery (ref `Delivery`), Lorry (ref `Lorry`), Transporter (ref `User`), Shipper (ref `User`), bid amount, message, status (`pending`, `accepted`, `rejected`, `countered`).

### 5. **Payment (`models/Payment.js`)**
- **Fields**: Delivery (ref `Delivery`), Request (ref `Request`), Payer (ref `User`), Recipient (ref `User`), amount, status (`pending`, `completed`, `failed`), Stripe PaymentIntent ID.

### 6. **Notification (`models/Notification.js`)**
- **Fields**: Recipient (ref `User`), sender (ref `User`), title, message, link/action URL, isRead (boolean), type (`bid`, `payment`, `delivery`, `system`).

### 7. **ChatBot (`models/ChatBot.js`)**
- **Fields**: User (ref `User` optional), userQuery, botResponse, context, intent, timestamp.

### 8. **Call (`models/Call.js`)**
- **Fields**: Caller (ref `User`), Receiver (ref `User`), scheduledTime, status (`scheduled`, `completed`, `cancelled`), notes.

---

## ⚙️ Services Layer

- **`notificationService.js`**: Centralized helper to create database notifications and instantly stream them to connected users using `global.io.to('user_' + userId).emit('notification', alertData)`.
- **`chatBotService.js`**: Integrates `@google/generative-ai` to respond to logistics queries, transport status checks, platform navigation, and multilingual assistance.
- **`callService.js`**: Handles logistics phone call scheduling, callback logging, and status tracking between shippers and truck drivers.

---

## 🛣️ API & Route Map

| Base Route | File | Key Capabilities |
| :--- | :--- | :--- |
| `/` | `controllers/homeController.js` | Landing page, global search bar across deliveries & lorries |
| `/auth` | `routes/authRoutes.js` | User login (`/login`), signup (`/signup`), logout (`/logout`) |
| `/dashboard` | `routes/dashboardRoutes.js` | Role-based dashboard for shippers & transporters |
| `/lorries` | `routes/lorryRoutes.js` | Add, view, filter, and edit available lorries |
| `/deliveries` | `routes/deliveryRoutes.js` | Create, list, search, and manage freight transport loads |
| `/bid` | `routes/bidRoutes.js` | Submit bids on deliveries, accept/reject bids |
| `/payments` | `routes/paymentRoutes.js` | Stripe checkout session creation & transaction history |
| `/notifications` | `routes/notificationRoutes.js` | Fetch user alerts, mark as read, delete notifications |
| `/profile` | `routes/profileRoutes.js` | Update user details, change password, view transport history |
| `/calls` | `routes/callRoutes.js` | Request & manage callback calls between users |
| `/chatbot` | `routes/chatBotRoutes.js` | Send query to AI assistant, retrieve response log |
| `/gemini` | `routes/geminiRoutes.js` | Process voice commands & intelligent intent extraction |

---

## 🎤 Voice & Gemini AI Subsystem

- **Wake Word Recognition**: Native Web Speech API listens for `"Hey AADI"`.
- **Gemini Intent Parser**: Route `/gemini/command` converts spoken queries (in English, Hindi, or Marathi) into actionable JSON commands (e.g. `NAVIGATE`, `SEARCH`, `BOOK`, `CHECK_STATUS`).
- **Voice Response System**: Text-to-speech audio feedback with context-aware randomized announcements and spam prevention.

---

## ⚡ Real-time Socket.IO Subsystem

- **Server Instance**: Bound to Express HTTP server in `server.js` (`global.io = io`).
- **User Rooms**: When a user connects, client emits `joinUser` with `userId`. The socket joins room `user_${userId}`.
- **Broadcast Events**:
  - `notification`: Delivered directly to target user room for instant UI alerts.
  - `locationUpdate`: Live lorry tracking updates pushed to freight trackers.

---

## 🔐 Environment & Configuration

Environment values are managed via standard `.env` file and loaded by `config/env.js`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/t2yd
SESSION_SECRET=your-secret-key
GEMINI_API_KEY=your-google-gemini-api-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
NODE_ENV=development
```

---

## 🧹 Maintenance & Operations

- **Database Cleanup**: Run `node clearDatabase.js` to clear transactional data (notifications, payments, requests, deliveries, lorries) while preserving registered user accounts.
- **Responsive UI Guidelines**: Detailed in `MAINTENANCE.md` for z-index layering and flex wrapping of mobile notification overlays.
