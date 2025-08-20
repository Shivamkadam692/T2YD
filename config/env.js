const dotenv = require('dotenv');

// Create a custom object and let dotenv populate it instead of directly mutating process.env
const customEnv = {};
dotenv.config({ processEnv: customEnv });

module.exports = customEnv;
