require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  JWT: {
    SECRET: process.env.JWT_SECRET || 'shoesstore_super_secret_jwt_key_2026_cnpm',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  },
  AI_SERVICE: {
    URL: process.env.AI_SERVICE_URL || 'http://localhost:8000/api/v1',
    API_KEY: process.env.AI_API_KEY || 'shoesstore_ai_secret_token_2026',
  },
};

module.exports = env;
