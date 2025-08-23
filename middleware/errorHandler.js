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
    return res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid ID format'
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      status: 'error',
      message: 'Duplicate key error',
      field: Object.keys(err.keyValue)[0]
    });
  }

  // API error response
  if (req.originalUrl.includes('/api/')) {
    return res.status(statusCode).json({
      status: 'error',
      message
    });
  }

  // Web error response
  res.status(statusCode).render('error', {
    message: message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
};

module.exports = errorHandler;