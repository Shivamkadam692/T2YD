/**
 * Custom validation middleware
 */

/**
 * Simple validation function to check if required fields are present
 * @param {Array} requiredFields - Array of field names to validate
 * @returns {Function} Express middleware function
 */
const validateRequired = (requiredFields) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const field of requiredFields) {
      const value = req.body[field];
      if (value === undefined || value === null || value === '') {
        errors.push({
          field,
          message: `${field} is required`
        });
      }
    }
    
    if (errors.length === 0) {
      return next();
    }
    
    // API error response
    if (req.originalUrl.includes('/api/')) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation Error',
        errors
      });
    }
    
    // Web error response
    return res.status(400).render('error', {
      message: 'Please check your input and try again',
      errors
    });
  };
};

/**
 * Validate email format
 * @param {string} field - Field name to validate
 * @returns {Function} Express middleware function
 */
const validateEmail = (field) => {
  return (req, res, next) => {
    const email = req.body[field];
    
    if (!email) {
      return next();
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      // API error response
      if (req.originalUrl.includes('/api/')) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation Error',
          errors: [{ field, message: 'Invalid email format' }]
        });
      }
      
      // Web error response
      return res.status(400).render('error', {
        message: 'Please check your input and try again',
        errors: [{ field, message: 'Invalid email format' }]
      });
    }
    
    next();
  };
};

/**
 * Validate password strength
 * @param {string} field - Field name to validate
 * @returns {Function} Express middleware function
 */
const validatePassword = (field) => {
  return (req, res, next) => {
    const password = req.body[field];
    
    if (!password) {
      return next();
    }
    
    if (password.length < 6) {
      // API error response
      if (req.originalUrl.includes('/api/')) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation Error',
          errors: [{ field, message: 'Password must be at least 6 characters long' }]
        });
      }
      
      // Web error response
      return res.status(400).render('error', {
        message: 'Please check your input and try again',
        errors: [{ field, message: 'Password must be at least 6 characters long' }]
      });
    }
    
    next();
  };
};

module.exports = { validateRequired, validateEmail, validatePassword };