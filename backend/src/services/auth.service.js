const { userRepository, roleRepository } = require('../repositories');
const { hashPassword, comparePassword } = require('../utils/hash.util');
const { generateToken } = require('../utils/jwt.util');
const AppError = require('../errors/AppError');
const { ROLES } = require('../constants/role.constant');
const { AUTH_MESSAGES } = require('../constants/message.constant');

class AuthService {
  async register({ fullName, email, password, phone }) {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError(AUTH_MESSAGES.EMAIL_ALREADY_EXISTS, 400);
    }

    const customerRole = await roleRepository.findByName(ROLES.CUSTOMER);
    if (!customerRole) {
      throw new AppError('Không tìm thấy vai trò khách hàng trong hệ thống', 500);
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await userRepository.create({
      fullName,
      email,
      passwordHash: hashedPassword,
      phone,
      roleId: customerRole.id,
      isActive: true,
    });

    const token = generateToken({ id: newUser.id, email: newUser.email, role: customerRole.name });

    return {
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        role: customerRole.name,
      },
      token,
    };
  }

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(AUTH_MESSAGES.INVALID_CREDENTIALS, 401);
    }

    if (!user.isActive) {
      throw new AppError(AUTH_MESSAGES.ACCOUNT_LOCKED, 403);
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(AUTH_MESSAGES.INVALID_CREDENTIALS, 401);
    }

    const permissions = user.role.rolePermissions.map((rp) => rp.permission.code);
    const token = generateToken({ id: user.id, email: user.email, role: user.role.name });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role.name,
        permissions,
      },
      token,
    };
  }

  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404);
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role.name,
      addresses: user.addresses,
    };
  }
}

module.exports = new AuthService();
