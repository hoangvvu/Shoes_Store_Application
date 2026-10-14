import { USER_TYPES } from '../constants/auth.constant';
import { withTransaction } from '../config/database';
import { AppError } from '../errors/AppError';
import { customerRepository } from '../repositories/customer.repository';
import { employeeRepository } from '../repositories/employee.repository';
import { userRepository } from '../repositories/user.repository';
import { normalizePhone } from '../utils/phone';
import { setActor } from '../utils/session';
import { isDuplicateKey } from '../utils/sqlError';
import type { AuthUser } from '../types/express';
import type { UpdateMeInput } from '../validators/user.validator';

export const meService = {
  async getMe(auth: AuthUser) {
    const user = await userRepository.findActiveById(auth.userId);
    if (!user) throw AppError.unauthorized();
    const base = { userId: user.userId, username: user.username, role: user.role, userType: user.userType };

    if (user.userType === USER_TYPES.CUSTOMER && user.customerId) {
      const c = await customerRepository.findById(user.customerId);
      if (!c) throw AppError.notFound('Không tìm thấy hồ sơ khách hàng');
      return { ...base, profile: { customerId: c.customerId, fullName: c.fullName, phone: c.phone, totalPurchased: c.totalPurchased } };
    }

    const e = user.employeeId ? await employeeRepository.findById(user.employeeId) : null;
    if (!e) throw AppError.notFound('Không tìm thấy hồ sơ nhân viên');
    return {
      ...base,
      profile: {
        employeeId: e.employeeId,
        fullName: e.fullName,
        dateOfBirth: e.dateOfBirth,
        address: e.address,
        phone: e.phone,
        // Lương cơ bản không trả qua /me; Admin xem và sửa ở module Nhân viên (M3).
      },
    };
  },

  async updateMe(auth: AuthUser, input: UpdateMeInput) {
    const phone = input.phone ? normalizePhone(input.phone) : undefined;

    // IDOR: luôn lấy customerId / employeeId từ token, không nhận từ body hay URL.
    if (auth.userType === USER_TYPES.CUSTOMER && auth.customerId) {
      if (input.dateOfBirth !== undefined || input.address !== undefined) {
        throw AppError.badRequest('Khách hàng chỉ được sửa họ tên và số điện thoại', 'FIELD_NOT_ALLOWED');
      }
      try {
        await withTransaction(async (tx) => {
          await setActor(tx, auth.userId);
          if (phone && (await customerRepository.phoneExists(phone, auth.customerId!, tx))) {
            throw AppError.conflict('Số điện thoại đã được đăng ký', 'PHONE_TAKEN');
          }
          await customerRepository.update(auth.customerId!, { fullName: input.fullName, phone }, tx);
        });
      } catch (err) {
        if (isDuplicateKey(err, 'uq_customers_phone')) throw AppError.conflict('Số điện thoại đã được đăng ký', 'PHONE_TAKEN');
        throw err;
      }
    } else if (auth.employeeId) {
      await withTransaction(async (tx) => {
        await setActor(tx, auth.userId);
        if (phone && (await employeeRepository.phoneExists(phone, auth.employeeId!, tx))) {
          throw AppError.conflict('Số điện thoại đã được nhân viên khác sử dụng', 'PHONE_TAKEN');
        }
        await employeeRepository.update(
          auth.employeeId!,
          { fullName: input.fullName, dateOfBirth: input.dateOfBirth, address: input.address, phone },
          tx,
        );
      });
    } else {
      throw AppError.forbidden();
    }
    return this.getMe(auth);
  },
};
