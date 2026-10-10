const { verifyAccessToken } = require('../utils/jwt.util');
const { UnauthorizedError } = require('../errors');

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Vui lòng đăng nhập để tiếp tục'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      userId: decoded.sub || decoded.userId,
      role: decoded.role,
      userType: decoded.type || decoded.userType,
      employeeId: decoded.employeeId || null,
      customerId: decoded.customerId || null,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Phiên đăng nhập đã hết hạn, vui lòng làm mới token', 'TOKEN_EXPIRED'));
    }
    return next(new UnauthorizedError('Token không hợp lệ', 'INVALID_TOKEN'));
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      userId: decoded.sub || decoded.userId,
      role: decoded.role,
      userType: decoded.type || decoded.userType,
      employeeId: decoded.employeeId || null,
      customerId: decoded.customerId || null,
    };
  } catch (error) {
    req.user = null;
  }
  next();
};

module.exports = {
  auth,
  optionalAuth,
};
