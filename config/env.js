const dotenv = require('dotenv');

// Load environment variables from .env file into process.env if not already defined
dotenv.config();

module.exports = process.env;

