const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  
  // Database SQL Server configuration
  DB_SERVER: process.env.DB_SERVER || 'LAPTOPVJPPRO',
  DB_NAME: process.env.DB_NAME || 'ShoeStore',
  DB_USER: process.env.DB_USER || '',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 1433,
  DB_USE_WINDOWS_AUTH: process.env.DB_USE_WINDOWS_AUTH === 'true' || (!process.env.DB_USER && process.env.DB_USE_WINDOWS_AUTH !== 'false'),
  DB_ENCRYPT: process.env.DB_ENCRYPT === 'true',
  DB_TRUST_SERVER_CERTIFICATE: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',

  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET || 'shoesstore_jwt_secret_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'shoesstore_jwt_refresh_key_2026',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

module.exports = env;
