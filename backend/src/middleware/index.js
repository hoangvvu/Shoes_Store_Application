const { auth, optionalAuth } = require('./auth.middleware');
const requireRole = require('./requireRole.middleware');
const notFound = require('./notFound.middleware');
const errorHandler = require('./errorHandler.middleware');

module.exports = {
  auth,
  optionalAuth,
  requireRole,
  notFound,
  errorHandler,
};
