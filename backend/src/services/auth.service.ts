import { OTP_MAX_FAILS, OTP_TTL_MINUTES, ROLES, USER_TYPES } from '../constants/auth.constant';
import { withTransaction } from '../config/database';
import { AppError } from '../errors/AppError';
import { customerRepository } from '../repositories/customer.repository';
import { passwordResetRepository } from '../repositories/passwordReset.repository';
import { userRepository } from '../repositories/user.repository';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { loginLimiter, otpLimiter } from '../utils/loginLimiter';
import { deliverOtp, generateOtp } from '../utils/otp';
import { comparePassword, dummyCompare, hashPassword } from '../utils/password';
import { normalizePhone } from '../utils/phone';
import { setActor } from '../utils/session';
import { isDuplicateKey } from '../utils/sqlError';
import type { LoginInput, RegisterInput } from '../validators/auth.validator';
import { toAuthUser, toPublicUser } from './profile.helper';

const GENERIC_LOGIN_ERROR = 'Sai tên đăng nhập hoặc mật khẩu';

export const authService = {
  async register(input: RegisterInput) {
    const phone = normalizePhone(input.phone);
    try {
      return await withTransaction(async (tx) => {
        if (await userRepository.usernameExists(input.username, tx)) {
          throw AppError.conflict('Tên đăng nhập đã được sử dụng', 'USERNAME_TAKEN');
        }
        if (await customerRepository.phoneExists(phone, null, tx)) {
          throw AppError.conflict('Số điện thoại đã được đăng ký', 'PHONE_TAKEN');
        }
        const role = await userRepository.findRoleByName(ROLES.CUSTOMER, tx);
        if (!role) throw new Error('Thiếu vai trò CUSTOMER trong bảng roles');

        const customerId = await customerRepository.insert({ fullName: input.fullName, phone }, tx);
        const userId = await userRepository.insert(
          {
            username: input.username,
            passwordHash: await hashPassword(input.password),
            roleId: role.roleId,
            userType: USER_TYPES.CUSTOMER,
            customerId,
          },
          tx,
        );
        return { userId, username: input.username, role: ROLES.CUSTOMER, fullName: input.fullName };
      });
    } catch (err) {
      // Hai request đồng thời có thể lọt qua bước kiểm tra; unique index là chốt chặn cuối.
      if (isDuplicateKey(err, 'uq_users_username')) throw AppError.conflict('Tên đăng nhập đã được sử dụng', 'USERNAME_TAKEN');
      if (isDuplicateKey(err, 'uq_customers_phone')) throw AppError.conflict('Số điện thoại đã được đăng ký', 'PHONE_TAKEN');
      throw err;
    }
  },

  async login(input: LoginInput, ip: string) {
    const key = `${ip}|${input.username.toLowerCase()}`;
    if (loginLimiter.isBlocked(key)) {
      throw AppError.tooMany('Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút');
    }

    const user = await userRepository.findActiveByUsername(input.username);
    let ok = false;
    if (user) ok = (await comparePassword(input.password, user.passwordHash)) && !user.isLocked;
    else await dummyCompare(input.password);

    if (!user || !ok) {
      loginLimiter.fail(key);
      throw AppError.unauthorized(GENERIC_LOGIN_ERROR, 'INVALID_CREDENTIALS');
    }
    loginLimiter.reset(key);

    const wrongPortal =
      (input.portal === 'staff' && user.userType !== USER_TYPES.EMPLOYEE) ||
      (input.portal === 'customer' && user.userType !== USER_TYPES.CUSTOMER);
    if (wrongPortal) {
      throw AppError.forbidden('Tài khoản không có quyền truy cập ứng dụng này', 'WRONG_PORTAL');
    }

    return {
      accessToken: signAccessToken(toAuthUser(user)),
      refreshToken: signRefreshToken(user.userId),
      user: await toPublicUser(user),
    };
  },

  async refresh(refreshToken: string) {
    let userId: number;
    try {
      userId = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized('Phiên đăng nhập đã hết hạn', 'REFRESH_INVALID');
    }
    const user = await userRepository.findActiveById(userId);
    if (!user || user.isLocked) {
      throw AppError.unauthorized('Phiên đăng nhập đã hết hạn', 'REFRESH_INVALID');
    }
    return { accessToken: signAccessToken(toAuthUser(user)) };
  },

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    // Thao tác nhạy cảm: kiểm tra lại trạng thái khóa trong CSDL, không tin riêng access token.
    const user = await userRepository.findActiveById(userId);
    if (!user) throw AppError.unauthorized();
    if (user.isLocked) throw AppError.forbidden('Tài khoản đã bị khóa', 'ACCOUNT_LOCKED');
    if (!(await comparePassword(oldPassword, user.passwordHash))) {
      throw AppError.badRequest('Mật khẩu cũ không đúng', 'WRONG_OLD_PASSWORD');
    }
    if (oldPassword === newPassword) {
      throw AppError.badRequest('Mật khẩu mới phải khác mật khẩu cũ', 'SAME_PASSWORD');
    }
    const hash = await hashPassword(newPassword);
    await withTransaction(async (tx) => {
      await setActor(tx, userId);
      await userRepository.updatePassword(userId, hash, tx);
    });
  },

  /** Luôn trả cùng một kết quả dù username có tồn tại hay không (chống dò tài khoản). */
  async forgotPassword(username: string) {
    const user = await userRepository.findActiveByUsername(username);
    if (!user || user.isLocked || user.userType !== USER_TYPES.CUSTOMER || !user.customerId) return;
    const customer = await customerRepository.findById(user.customerId);
    if (!customer?.phone) return;

    const otp = generateOtp();
    const tokenHash = await hashPassword(otp);
    await withTransaction(async (tx) => {
      await passwordResetRepository.invalidateAll(user.userId, tx);
      await passwordResetRepository.create(user.userId, tokenHash, OTP_TTL_MINUTES, tx);
    });
    await deliverOtp(customer.phone, otp);
  },

  async resetPassword(username: string, otp: string, newPassword: string, ip: string) {
    const key = `reset|${ip}|${username.toLowerCase()}`;
    if (otpLimiter.isBlocked(key)) {
      throw AppError.tooMany('Bạn đã nhập sai mã quá nhiều lần. Vui lòng thử lại sau 15 phút');
    }
    const invalid = () => {
      otpLimiter.fail(key);
      return AppError.badRequest('Mã xác nhận không đúng hoặc đã hết hạn', 'INVALID_OTP');
    };

    const user = await userRepository.findActiveByUsername(username);
    if (!user || user.isLocked || user.userType !== USER_TYPES.CUSTOMER) throw invalid();
    const token = await passwordResetRepository.findLatestValid(user.userId);
    if (!token || !(await comparePassword(otp, token.tokenHash))) throw invalid();

    const hash = await hashPassword(newPassword);
    await withTransaction(async (tx) => {
      await setActor(tx, user.userId);
      await userRepository.updatePassword(user.userId, hash, tx);
      await passwordResetRepository.markUsed(token.tokenId, tx);
    });
    otpLimiter.reset(key);
  },
};

export const OTP_ATTEMPT_LIMIT = OTP_MAX_FAILS;
