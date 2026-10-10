const { ForbiddenError, UnauthorizedError } = require('../errors');

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Vui lòng đăng nhập'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(
      new ForbiddenError(
        `Quyền truy cập bị từ chối. Endpoint này yêu cầu vai trò: ${allowedRoles.join(' hoặc ')}`
      )
    );
  }

  next();
};

module.exports = requireRole;
