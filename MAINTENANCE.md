# T2YD Maintenance Guide

## Database Management

### Clearing Database Data

To clear all data from the database (except users), run:

```bash
node clearDatabase.js
```

This script will remove all notifications, payments, requests, deliveries, and lorries from the database while preserving user accounts. If you also want to remove users, uncomment the relevant section in the script.

### Testing Notifications

Use your application flows (sending bids, requests, etc.) to generate real notifications in dev. The previous `testNotifications.js` helper has been removed.

## CSS Fixes

### Notification Display in Responsive Mode

The following CSS fixes have been implemented to address notification overlapping issues in responsive mode:

1. Increased z-index for notification dropdown to ensure it appears above other elements
2. Added proper positioning and box-sizing for notification items
3. Improved styling for notification action buttons in mobile view
4. Added flex-wrap to notification actions to prevent overflow

To test these changes:
1. Open the application on a mobile device or use browser developer tools to simulate a mobile viewport
2. Click on the notification bell icon to open the notification dropdown
3. Verify that notifications display correctly without overlapping other elements
4. Test action buttons to ensure they're properly sized and positioned