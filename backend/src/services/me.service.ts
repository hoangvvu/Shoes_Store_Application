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
      return {
        ...base,
        profile: {
          customerId: c.customerId, lastName: c.lastName, firstName: c.firstName, fullName: c.fullName, phone: c.phone, gender: c.gender,
          dateOfBirth: c.dateOfBirth, email: c.email, totalPurchased: c.totalPurchased,
        },
      };
    }

    const e = user.employeeId ? await employeeRepository.findById(user.employeeId) : null;
    if (!e) throw AppError.notFound('Không tìm thấy hồ sơ nhân viên');
    return {
      ...base,
      profile: {
        employeeId: e.employeeId,
        lastName: e.lastName,
        firstName: e.firstName,
        fullName: e.fullName,
        dateOfBirth: e.dateOfBirth,
        address: e.address,
        phone: e.phone,
        gender: e.gender,
        email: e.email,
        hireDate: e.hireDate,
        // Lương cơ bản không trả qua /me; Admin xem và sửa ở module Nhân viên (M3).
      },
    };
  },

  async updateMe(auth: AuthUser, input: UpdateMeInput) {
    const phone = input.phone ? normalizePhone(input.phone) : undefined;

    // IDOR: luôn lấy customerId / employeeId từ token, không nhận từ body hay URL.
    if (auth.userType === USER_TYPES.CUSTOMER && auth.customerId) {
      if (input.address !== undefined) {
        throw AppError.badRequest('Địa chỉ giao hàng được quản lý ở mục Địa chỉ', 'FIELD_NOT_ALLOWED');
      }
      try {
        await withTransaction(async (tx) => {
          await setActor(tx, auth.userId);
          if (phone && (await customerRepository.phoneExists(phone, auth.customerId!, tx))) {
            throw AppError.conflict('Số điện thoại đã được đăng ký', 'PHONE_TAKEN');
          }
          await customerRepository.update(
            auth.customerId!,
            {
              lastName: input.lastName, firstName: input.firstName, phone, gender: input.gender,
              dateOfBirth: input.dateOfBirth, email: input.email,
            },
            tx,
          );
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
          {
            lastName: input.lastName, firstName: input.firstName, dateOfBirth: input.dateOfBirth ?? undefined, address: input.address, phone,
            gender: input.gender, email: input.email,
          },
          tx,
        );
      });
    } else {
      throw AppError.forbidden();
    }
    return this.getMe(auth);
  },
};
