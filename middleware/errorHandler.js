/**
 * Global error handling middleware
 */

const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  // Set default status code and message
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Handle different types of errors
  if (err.name === 'ValidationError') {
    // For signup route, redirect with flash message
    if (req.originalUrl.includes('/auth/signup')) {
      if (req.flash) {
        req.flash('error', 'Please check your input and try again');
      }
      return res.redirect('/auth/signup');
    }
    
    return res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'MongoServerError' && err.message.includes('$regex')) {
    console.error('MongoDB Regex Error:', err.message);
    
    // For signup route, redirect with flash message
    if (req.originalUrl.includes('/auth/signup')) {
      if (req.flash) {
        req.flash('error', 'Invalid search pattern. Please try a different search term.');
      }
      return res.redirect('/auth/signup');
    }
    
    return res.status(400).json({
      status: 'error',
      message: 'Invalid search pattern. Please try a different search term.'
    });
  }

  if (err.name === 'CastError') {
    // For signup route, redirect with flash message
    if (req.originalUrl.includes('/auth/signup')) {
      if (req.flash) {
        req.flash('error', 'Invalid ID format');
      }
      return res.redirect('/auth/signup');
    }
    
    return res.status(400).json({
      status: 'error',
      message: 'Invalid ID format'
    });
  }

  if (err.code === 11000) {
    // Extract the duplicate key field name
    const field = Object.keys(err.keyValue)[0];
    let errorMessage = `Duplicate ${field} error`;
    
    // Provide more user-friendly messages for common fields
    if (field === 'email') {
      errorMessage = 'This email address is already registered. Please use a different email or try logging in.';
    }
    
    // API response
    if (req.originalUrl.includes('/api/')) {
      return res.status(400).json({
        status: 'error',
        message: errorMessage,
        field: field
      });
    }
    
    // Web response for signup - redirect with flash message
    if (req.originalUrl.includes('/auth/signup')) {
      if (req.flash) {
        req.flash('error', errorMessage);
      }
      return res.redirect('/auth/signup');
    }
    
    // Web response - render error page with friendly message
    return res.status(400).render('error', {
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }

  // API error response
  if (req.originalUrl.includes('/api/')) {
    return res.status(statusCode).json({
      status: 'error',
      message
    });
  }

  // Web response for signup - redirect with flash message
  if (req.originalUrl.includes('/auth/signup')) {
    if (req.flash) {
      req.flash('error', message);
    }
    return res.redirect('/auth/signup');
  }

  // Web error response
  res.status(statusCode).render('error', {
    message: message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
};

module.exports = errorHandler;