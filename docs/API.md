# T2YD API Documentation

This document provides details about the T2YD API endpoints, request/response formats, authentication requirements, and error handling.

## Table of Contents

- [Authentication](#authentication)
- [Deliveries](#deliveries)
- [Bids](#bids)
- [Notifications](#notifications)
- [Profile](#profile)
- [Error Handling](#error-handling)
- [Validation](#validation)

## Authentication

The T2YD platform uses session-based authentication. All authenticated routes require a valid session cookie.

### Register a new user

**Endpoint:** `POST /auth/signup`

**Request Body:**
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123",
  "phone": "1234567890",
  "role": "shipper" // or "transporter"
}
```

**Response:**
- Success: Redirects to login page
- Error: Returns error page with validation messages

### Login

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
- Success: Redirects to dashboard based on user role
- Error: Returns error page with authentication failure message

### Logout

**Endpoint:** `GET /auth/logout`

**Response:**
- Success: Redirects to home page

### Password Reset Request

**Endpoint:** `POST /auth/forgot`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
- Success: Redirects to login page with success message
- Error: Returns error page with message

### Password Reset

**Endpoint:** `POST /auth/reset/:token`

**Request Body:**
```json
{
  "password": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

**Response:**
- Success: Redirects to login page
- Error: Returns error page with message

## Deliveries

Deliveries represent goods that need to be transported from one location to another.

### List All Deliveries

**Endpoint:** `GET /deliveries`

**Authentication:** Required

**Response:**
- Success: Renders deliveries page with list of deliveries
- Error: Returns error page with message

### Create New Delivery

**Endpoint:** `POST /deliveries`

**Authentication:** Required (Shipper role)

**Request Body:**
```json
{
  "pickupLocation": "Mumbai",
  "dropLocation": "Delhi",
  "goodsType": "Electronics",
  "weight": "500",
  "expectedPrice": "5000",
  "pickupDate": "2023-06-15",
  "description": "Fragile electronics equipment"
}
```

**Response:**
- Success: Redirects to deliveries page
- Error: Returns error page with message

### Get Delivery Details

**Endpoint:** `GET /deliveries/:id`

**Authentication:** Required

**Response:**
- Success: Renders delivery details page
- Error: Returns error page with message

### Update Delivery

**Endpoint:** `PUT /deliveries/:id`

**Authentication:** Required (Shipper role, owner of delivery)

**Request Body:**
```json
{
  "pickupLocation": "Mumbai",
  "dropLocation": "Delhi",
  "goodsType": "Electronics",
  "weight": "500",
  "expectedPrice": "5000",
  "pickupDate": "2023-06-15",
  "description": "Fragile electronics equipment"
}
```

**Response:**
- Success: Redirects to delivery details page
- Error: Returns error page with message

### Delete Delivery

**Endpoint:** `DELETE /deliveries/:id`

**Authentication:** Required (Shipper role, owner of delivery)

**Response:**
- Success: Redirects to deliveries page
- Error: Returns error page with message

## Bids

Bids represent offers from transporters to fulfill delivery requests.

### View Bid Page for a Delivery

**Endpoint:** `GET /bid/:deliveryId`

**Authentication:** Required (Transporter role)

**Response:**
- Success: Renders bid page with delivery details and form
- Error: Returns error page with message

### Submit Bid for a Delivery

**Endpoint:** `POST /dashboard/request`

**Authentication:** Required (Transporter role)

**Request Body:**
```json
{
  "deliveryId": "60d21b4667d0d8992e610c85",
  "lorryId": "60d21b4667d0d8992e610c86",
  "price": "4500",
  "message": "I can deliver your goods safely and on time"
}
```

**Response:**
- Success: Redirects to dashboard
- Error: Returns error page with message

### Accept Bid

**Endpoint:** `POST /notifications/accept-bid/:requestId`

**Authentication:** Required (Shipper role, owner of delivery)

**Response:**
```json
{
  "message": "Bid accepted successfully",
  "requestId": "60d21b4667d0d8992e610c87"
}
```

### Reject Bid

**Endpoint:** `POST /notifications/reject-bid/:requestId`

**Authentication:** Required (Shipper role, owner of delivery)

**Response:**
```json
{
  "message": "Bid rejected successfully",
  "requestId": "60d21b4667d0d8992e610c87"
}
```

## Notifications

Notifications inform users about important events in the system.

### Get User Notifications

**Endpoint:** `GET /notifications/user`

**Authentication:** Required

**Response:**
```json
{
  "notifications": [
    {
      "_id": "60d21b4667d0d8992e610c88",
      "recipient": "60d21b4667d0d8992e610c89",
      "sender": "60d21b4667d0d8992e610c8a",
      "type": "bid_received",
      "title": "New Bid Received",
      "message": "You received a new bid for your delivery",
      "read": false,
      "relatedRequest": "60d21b4667d0d8992e610c8b",
      "relatedDelivery": "60d21b4667d0d8992e610c8c",
      "priority": "medium",
      "createdAt": "2023-06-15T10:00:00.000Z"
    }
  ]
}
```

### Mark Notification as Read

**Endpoint:** `POST /notifications/mark-read/:notificationId`

**Authentication:** Required

**Response:**
```json
{
  "message": "Notification marked as read",
  "notificationId": "60d21b4667d0d8992e610c88"
}
```

### Mark All Notifications as Read

**Endpoint:** `POST /notifications/mark-all-read`

**Authentication:** Required

**Response:**
```json
{
  "message": "All notifications marked as read",
  "count": 5
}
```

### Accept Request from Notification

**Endpoint:** `POST /notifications/accept-request/:requestId`

**Authentication:** Required (Transporter role)

**Response:**
```json
{
  "message": "Request accepted successfully",
  "requestId": "60d21b4667d0d8992e610c87"
}
```

## Profile

Profile endpoints allow users to manage their account information, view booking history, change password, and delete their account.

### View Profile

**Endpoint:** `GET /profile`

**Authentication:** Required

**Response:**
- Success: Renders profile page with user information and booking history
- Error: Redirects to home page with error message

### Update Profile

**Endpoint:** `POST /profile/update`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "phone": "9876543210"
}
```

**Response:**
- Success: Redirects to profile page with success message
- Error: Redirects to profile page with error message

### Change Password

**Endpoint:** `POST /profile/password`

**Authentication:** Required

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

**Response:**
- Success: Redirects to profile page with success message
- Error: Redirects to profile page with error message

### Delete Account

**Endpoint:** `POST /profile/delete`

**Authentication:** Required

**Response:**
- Success: Redirects to home page after account deletion and session destruction
- Error: Redirects to profile page with error message
  "message": "Request accepted successfully",
  "requestId": "60d21b4667d0d8992e610c87"
}
```

## Error Handling

The application uses a centralized error handling middleware that provides consistent error responses across all endpoints.

### Error Response Format

All API endpoints return consistent error responses:

### Validation Error

```json
{
  "status": "error",
  "message": "Validation Error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Authentication Error

```json
{
  "status": "error",
  "message": "Authentication required"
}
```

### Authorization Error

```json
{
  "status": "error",
  "message": "Unauthorized - You don't have permission to perform this action"
}
```

### Resource Not Found

```json
{
  "status": "error",
  "message": "Resource not found"
}
```

### Server Error

```json
{
  "status": "error",
  "message": "Internal Server Error"
}
```

### Error Handling Implementation

The application implements a global error handling middleware that:

1. Logs all errors for monitoring and debugging
2. Sets appropriate HTTP status codes based on error types
3. Formats error responses differently for API requests vs web page requests
4. Handles specific error types like validation errors, database errors, and authentication errors

## Validation

The application implements custom validation middleware to validate request data before processing.

### Validation Middleware

The validation middleware provides the following functions:

- `validateRequired(fields)`: Validates that all specified fields are present and not empty
- `validateEmail(field)`: Validates that the specified field contains a valid email format
- `validatePassword(field)`: Validates that the specified field contains a strong password

### Validation Implementation

Validation is implemented in the following routes:

1. **Authentication Routes**:
   - Signup: Validates name, email, password
   - Login: Validates email, password
   - Forgot Password: Validates email
   - Reset Password: Validates password

2. **Delivery Routes**:
   - Add Delivery: Validates required fields (goodsType, weight, pickupLocation, dropLocation)
   - Update Delivery: Validates required fields and delivery ownership

3. **Bid Routes**:
   - Submit Bid: Validates lorryId, price (for transporter bids)

4. **Notification Routes**:
   - Get Notifications: Validates pagination parameters

5. **Profile Routes**:
   - Update Profile: Validates name, email, phone
   - Change Password: Validates current password, new password, and password confirmation
   - Delete Account: Validates user existence