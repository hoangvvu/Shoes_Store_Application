const authenticate = require('./auth.middleware');
const checkPermission = require('./checkPermission.middleware');
const errorHandler = require('./errorHandler.middleware');
const notFound = require('./notFound.middleware');

module.exports = {
  authenticate,
  checkPermission,
  errorHandler,
  notFound,
};
