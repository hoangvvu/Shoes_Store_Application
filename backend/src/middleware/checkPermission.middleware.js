const AppError = require('../errors/AppError');
const { ROLES } = require('../constants/role.constant');
const { AUTH_MESSAGES } = require('../constants/message.constant');

const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(AUTH_MESSAGES.UNAUTHORIZED, 401));
    }

    // Super Admin có toàn quyền thực thi mọi hành động
    if (req.user.roleName === ROLES.SUPER_ADMIN) {
      return next();
    }

    // Kiểm tra quyền cụ thể trong ma trận phân quyền
    if (Array.isArray(requiredPermission)) {
      const hasAnyPermission = requiredPermission.some((p) => req.user.permissions.includes(p));
      if (!hasAnyPermission) {
        return next(new AppError(AUTH_MESSAGES.FORBIDDEN, 403));
      }
    } else {
      if (!req.user.permissions.includes(requiredPermission)) {
        return next(new AppError(AUTH_MESSAGES.FORBIDDEN, 403));
      }
    }

    next();
  };
};

module.exports = checkPermission;
