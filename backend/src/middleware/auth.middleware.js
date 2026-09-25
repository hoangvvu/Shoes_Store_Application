const { verifyToken } = require('../utils/jwt.util');
const { prisma } = require('../config');
const AppError = require('../errors/AppError');
const { AUTH_MESSAGES } = require('../constants/message.constant');

const authenticate = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(new AppError(AUTH_MESSAGES.UNAUTHORIZED, 401));
    }

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return next(new AppError(AUTH_MESSAGES.UNAUTHORIZED, 401));
    }

    if (!user.isActive) {
      return next(new AppError(AUTH_MESSAGES.ACCOUNT_LOCKED, 403));
    }

    // Trích xuất danh sách mã quyền hạn của người dùng
    const permissions = user.role.rolePermissions.map((rp) => rp.permission.code);

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions,
    };

    next();
  } catch (error) {
    return next(new AppError(AUTH_MESSAGES.UNAUTHORIZED, 401));
  }
};

module.exports = authenticate;
