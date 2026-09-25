const jwt = require('jsonwebtoken');
const { env } = require('../config');

const generateToken = (payload, expiresIn = env.JWT.EXPIRES_IN) => {
  return jwt.sign(payload, env.JWT.SECRET, { expiresIn });
};

const verifyToken = (token) => {
  return jwt.verify(token, env.JWT.SECRET);
};

module.exports = {
  generateToken,
  verifyToken,
};
