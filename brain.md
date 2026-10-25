# 🧠 T2YD - System Architecture & Developer Brain

> **T2YD (Transport to Your Destination)** is a real-time, multilingual logistics and freight marketplace connecting load owners (shippers) and lorry owners (transporters) across India. Built with Node.js/Express, MongoDB, EJS, Socket.IO, Google Gemini AI, Web Speech API, and Leaflet Maps.

---

## 📑 Table of Contents

1. [Tech Stack & System Specifications](#-tech-stack--system-specifications)
2. [Directory Structure](#-directory-structure)
3. [Core System Architecture](#-core-system-architecture)
4. [Data Models & Schema Map](#-data-models--schema-map)
5. [Services Layer](#-services-layer)
6. [API & Route Map](#-api--route-map)
7. [Search Engine Subsystem](#-search-engine-subsystem)
8. [Exact Map Pinning & Google Maps Navigation](#-exact-map-pinning--google-maps-navigation)
9. [Indian Truck Desi Art UI Design System](#-indian-truck-desi-art-ui-design-system)
10. [Voice & Gemini AI Subsystem](#-voice--gemini-ai-subsystem)
11. [Real-time Socket.IO Subsystem](#-real-time-socketio-subsystem)
12. [Environment & Configuration](#-environment--configuration)
13. [Maintenance & Operations](#-maintenance--operations)

---

## 🛠️ Tech Stack & System Specifications

| Layer | Technology / Package | Purpose |
| :--- | :--- | :--- |
| **Runtime & Framework** | Node.js (v22+) / Express v5.1 | Web server, routing, and REST APIs |
| **Database & ORM** | MongoDB / Mongoose v8.17 | Document storage & Object Data Modeling |
| **Session Management** | `express-session`, `connect-mongo` | Cookie-based persistent auth sessions (30 days) |
| **View Engine** | EJS + `express-ejs-layouts` | Server-rendered UI with reusable master layout & partials |
| **Real-time Engine** | Socket.IO v4.7 | Live location tracking, room broadcasts & instant alerts |
| **AI Engine** | `@google/generative-ai` (Gemini API) | Intelligent chatbot assistant, voice intent parsing |
| **Payments** | Stripe SDK v16.0 | Transport payment processing & checkout flows |
| **File Storage** | Multer v1.4 | Local file upload middleware (`public/uploads/`) |
| **Voice Interface** | Web Speech API + Gemini AI | Hands-free voice recognition ("Hey AADI" wake word) |
| **Maps & Pinning** | Leaflet v1.9 + OpenStreetMap Nominatim | Interactive map coordinate/address pinning for pickup/drop |
| **Navigation** | Google Maps Universal URLs | 1-click turn-by-turn navigation for drivers/transporters |
| **UI Design System** | Custom Indian Truck Desi Art & Modern CSS | Authentic highway truck cards, equal-height stretch, glassmorphism |

---

## 📁 Directory Structure

```
T2YD/
├── config/                  # Database & environment configurations
│   ├── db.js                # Mongoose connection setup
│   └── env.js               # Dotenv wrapper & fallback map
├── controllers/             # Business logic & route handlers
│   ├── authController.js    # Login, signup, session teardown
│   ├── deliveryController.js# Post/manage load shipment requests & exact locations
│   ├── homeController.js    # Public landing page & multi-field search engine
│   └── lorryController.js   # Lorry fleet creation, updates & specs
├── middleware/              # Express middleware components
│   ├── auth.js              # Session login protection (`requireLogin`)
│   ├── errorHandler.js      # Global error processing & 404/500 rendering
│   └── validator.js         # Input validation & sanitization
├── models/                  # Mongoose MongoDB schemas
│   ├── User.js              # User profiles (Shippers & Transporters)
│   ├── Lorry.js             # Lorry fleet posts & specs
│   ├── Delivery.js          # Load shipment posts (with exact coordinates)
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
│   ├── deliveryRoutes.js    # Delivery routes (set-locations, track, etc.)
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
│   ├── layout.ejs           # Master layout wrapper with brand logo & nav
│   ├── index.ejs            # Animated highway stage, hero banner & fleet cards
│   ├── searchResults.ejs    # Marketplace search results with filters & truck cards
│   ├── setLocations.ejs     # Leaflet map for precise pickup/drop coordinate pinning
│   ├── track.ejs            # Route tracking map & Google Maps navigation link
│   ├── dashboard.ejs        # User dashboard portal
│   └── ...                  # Pages (auth, lorries, deliveries, payments, etc.)
├── public/                  # Static assets (CSS, client JS, images, uploads)
│   ├── images/              # Brand & UI visual assets
│   │   ├── t2yd-logo.png    # Official T2YD brand PNG logo
│   │   ├── t2yd-hero-banner.png # Panoramic logistics hero banner
│   │   └── truck-hero.png   # Flipped cruiser truck graphic for animated stage
│   ├── css/                 # Voice UI & additional styling components
│   ├── js/                  # Client-side scripts (voice-automation, socket, maps)
│   ├── languages/           # Frontend dictionary translations (en, hi, mr)
│   ├── style-modern.css     # Primary design tokens & core application styles
│   └── card-styles.css      # Skeleton loading & legacy card styling
├── clearDatabase.js         # Maintenance script for database cleanup
├── MAINTENANCE.md           # Maintenance & troubleshooting operational guide
├── README.md                # Comprehensive project documentation
├── brain.md                 # System Architecture & Technical Index (this file)
├── package.json             # NPM project manifest
└── server.js                # Entry point, HTTP server & Socket.IO initialization
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
- **Fields**: Transporter (ref `User`), vehicleNumber, vehicleType (`Open Body`, `Container`, `Trailer`, etc.), capacity (Tons), location, ownerName, contact, status (`available`, `busy`, `maintenance`, `offline`), description, requests array.

### 3. **Delivery (`models/Delivery.js`)**
- **Fields**: 
  - `shipper` (ref `User`), `transporter` (ref `User`), `shipperName`, `contact`
  - `pickupLocation`, `dropLocation`, `goodsType`, `weight` (kg/tons), `amount`
  - `pickupDateTime`, `expectedDeliveryDate`
  - `exactPickup`: `{ lat: Number, lng: Number, address: String, updatedAt: Date }`
  - `exactDrop`: `{ lat: Number, lng: Number, address: String, updatedAt: Date }`
  - `status`: `['pending', 'in-transit', 'delivered', 'cancelled']`
  - `requests` array, `createdAt` timestamp

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

- **`notificationService.js`**: Creates DB notifications and streams real-time alerts via Socket.IO room `user_${userId}`.
- **`chatBotService.js`**: Interfaces with Google Gemini API for logistics and navigation support in English, Hindi, and Marathi.
- **`callService.js`**: Manages callback requests between shippers and fleet owners.

---

## 🛣️ API & Route Map

| Base Route | Handler | Capabilities |
| :--- | :--- | :--- |
| `/` | `homeController.getHome` | Landing page, animated highway stage, hero banner, available fleets |
| `/search` | `homeController.search` | Multi-field search across lorries & deliveries (`?query=...`, `?q=...`, `?type=...`) |
| `/auth` | `authRoutes.js` | Session-based authentication (`/login`, `/signup`, `/logout`) |
| `/dashboard` | `dashboardRoutes.js` | Role-based dashboard for shippers and transporters |
| `/lorries` | `lorryRoutes.js` | Lorry CRUD, vehicle details, specs view |
| `/deliveries` | `deliveryRoutes.js` | Delivery load CRUD, bidding, and tracking |
| `/deliveries/set-locations/:id` | `deliveryController.getSetLocations` / `postSetLocations` | Interactive Leaflet map pinning for exact pickup/drop coordinates |
| `/deliveries/track/:id` | `deliveryController.trackDelivery` | Live Leaflet route tracking with Google Maps navigation redirect |
| `/bid` | `bidRoutes.js` | Transporter bids on freight requests |
| `/payments` | `paymentRoutes.js` | Stripe checkout session generation and status verification |
| `/notifications` | `notificationRoutes.js` | Retrieve alerts, mark read, badge count polling |
| `/profile` | `profileRoutes.js` | Profile updates, transport history |
| `/chatbot` | `chatBotRoutes.js` | AI chat assistant endpoint |
| `/gemini` | `geminiRoutes.js` | Voice command parsing via Gemini |

---

## 🔍 Search Engine Subsystem

The marketplace search engine (`controllers/homeController.js`) provides resilient, case-insensitive discovery across both Lorries and Deliveries:

1. **Parameter Flexibility**: Accepts `query` or `q` parameter (compatible with voice automation, search bar, and URL filters).
2. **Regex Escaping**: Prevents server crashes by sanitizing special characters (`escapeRegex`).
3. **Cross-Field Tokenization**: Multi-word queries like `"Mumbai Open Body"` split into tokens and match across different fields (`location` + `vehicleType`).
4. **Registration Plate Recognition**: Ignores spaces and punctuation (e.g., `"MH26"` matches `"MH 26 AB 1234"`).
5. **Numerical Payload/Weight Matching**: Numerical values (e.g., `10`, `15`) match capacity (Tons) and shipment weight.
6. **Open Marketplace**: No role-based restrictions—transporters and shippers can search all available marketplace assets.
7. **Interactive View (`views/searchResults.ejs`)**: Features an in-page search bar, filter tabs (`All`, `Lorries`, `Deliveries`), quick search chips, and discovery fallback.

---

## 🗺️ Exact Map Pinning & Google Maps Navigation

Implemented to allow precision logistics coordination after a request/bid is accepted:

1. **Pinning View (`views/setLocations.ejs`)**:
   - Leaflet.js interactive map with draggable pin markers.
   - Nominatim OpenStreetMap geocoding with instant live address lookup.
   - Shippers can click anywhere on the map or type an address to pin exact pickup and drop locations.
2. **Persistence**: Saved directly onto the `Delivery` model under `exactPickup` and `exactDrop` with GPS coordinates (`lat`, `lng`) and resolved street addresses.
3. **Tracking & Turn-by-Turn Navigation (`views/track.ejs`)**:
   - Transporters/drivers view the exact pinned locations and polyline route.
   - Single-click **"Navigate on Google Maps"** button that opens native Google Maps directions with origin and destination GPS coordinates.

---

## 🚛 Indian Truck Desi Art UI Design System

A culturally authentic UI framework inspired by Indian highway freight trucks:

- **Top Permit Banner**: Distinguishes `NATIONAL PERMIT` (Lorries) from `EXPRESS FREIGHT` (Deliveries).
- **Truck Shayari Bar**: Three-panel Hindi slogans (`धीरे चलो सुरक्षित चलो`, `सफ़र लम्बा है मंज़िल जरूर मिलेगी`, `रुकावट नहीं तजुर्बा है`).
- **Iconic Indian Truck Back Graphic**:
  - Yellow `BLOW 🌸 HORN` bar with Indian flags.
  - `USE DIPPER AT NIGHT` chevron dipper bar.
  - Steel bumper bar with tail lights and `SPEED 40 KM` badge.
  - Embossed yellow IND license plate.
  - Red/yellow chevron hazard stripes.
  - `T2YD BHARAT` mudflaps.
- **Equal-Height Layout Engine**: Flexbox stretch container (`align-items: stretch`) ensuring uniform card heights across responsive breakpoints.
- **Inline Address Expansion**: Interactive `toggleReadMore` collapses addresses longer than 25 characters with "Read More" / "Read Less" toggles without expanding card boundaries.
- **Overlap Prevention**: Global button safety rules preventing CTA buttons from overlapping on mobile viewports.

---

## 🎤 Voice & Gemini AI Subsystem

- **Wake Word**: Native Web Speech API listens for `"Hey AADI"`.
- **Gemini Intent Parser**: Route `/gemini/command` converts spoken queries (in English, Hindi, or Marathi) into structured JSON intent commands.
- **Voice Response System**: Text-to-speech audio feedback with context-aware randomized announcements and spam prevention.
- **Selector Integration**: Automatically detects and submits the search input (`#searchInput`, `input[name="query"]`, `input[name="q"]`).

---

## ⚡ Real-time Socket.IO Subsystem

- **Server Instance**: Bound to Express HTTP server in `server.js` (`global.io = io`).
- **User Rooms**: Client emits `joinUser` with `userId` upon connection; socket joins room `user_${userId}`.
- **Broadcast Events**:
  - `notification`: Streamed to target user room for instant alerts.
  - `locationUpdate`: Real-time vehicle coordinate updates.

---

## 🔐 Environment & Configuration

Managed via `.env` and validated by `config/env.js`:

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

- **Database Cleanup**: Run `node clearDatabase.js` to purge transactional entities (deliveries, lorries, bids, notifications) while preserving user accounts.
- **Operational Guide**: Refer to `MAINTENANCE.md` for testing notifications and viewport z-index guidelines.
