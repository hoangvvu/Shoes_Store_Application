import { ROLES, USER_TYPES } from '../constants/auth.constant';
import { withTransaction } from '../config/database';
import { AppError } from '../errors/AppError';
import { employeeRepository } from '../repositories/employee.repository';
import { userRepository } from '../repositories/user.repository';
import { hashPassword } from '../utils/password';
import { normalizePhone } from '../utils/phone';
import { setActor } from '../utils/session';
import { isDuplicateKey } from '../utils/sqlError';
import type { CreateEmployeeUserInput } from '../validators/user.validator';

async function mustFindUser(userId: number) {
  const user = await userRepository.findActiveById(userId);
  if (!user) throw AppError.notFound('Không tìm thấy tài khoản', 'USER_NOT_FOUND');
  return user;
}

export const userService = {
  /** Admin tạo employees + users (ADMIN/SALES/WAREHOUSE) trong 1 transaction. */
  async createEmployeeAccount(input: CreateEmployeeUserInput, actorId: number | null) {
    try {
      return await withTransaction(async (tx) => {
        await setActor(tx, actorId);
        if (await userRepository.usernameExists(input.username, tx)) {
          throw AppError.conflict('Tên đăng nhập đã được sử dụng', 'USERNAME_TAKEN');
        }
        if (input.phone && (await employeeRepository.phoneExists(normalizePhone(input.phone), null, tx))) {
          throw AppError.conflict('Số điện thoại đã được nhân viên khác sử dụng', 'PHONE_TAKEN');
        }
        const role = await userRepository.findRoleByName(input.role, tx);
        if (!role || role.userType !== USER_TYPES.EMPLOYEE) {
          throw AppError.badRequest('Vai trò không hợp lệ cho nhân viên', 'INVALID_ROLE');
        }
        const employeeId = await employeeRepository.insert(
          {
            fullName: input.fullName,
            dateOfBirth: input.dateOfBirth,
            address: input.address,
            phone: input.phone ? normalizePhone(input.phone) : undefined,
            gender: input.gender,
            email: input.email,
            hireDate: input.hireDate,
            baseSalary: input.baseSalary,
          },
          tx,
        );
        const userId = await userRepository.insert(
          {
            username: input.username,
            passwordHash: await hashPassword(input.password),
            roleId: role.roleId,
            userType: USER_TYPES.EMPLOYEE,
            employeeId,
          },
          tx,
        );
        return { userId, employeeId, username: input.username, role: input.role, fullName: input.fullName };
      });
    } catch (err) {
      if (isDuplicateKey(err, 'uq_users_username')) throw AppError.conflict('Tên đăng nhập đã được sử dụng', 'USERNAME_TAKEN');
      throw err;
    }
  },

  async setLocked(actorId: number, targetId: number, isLocked: boolean) {
    if (isLocked && actorId === targetId) {
      throw AppError.badRequest('Không thể tự khóa tài khoản của chính mình', 'CANNOT_LOCK_SELF');
    }
    await mustFindUser(targetId);
    await withTransaction(async (tx) => {
      await setActor(tx, actorId); // trigger trg_users_audit ghi USER_LOCK / USER_UNLOCK
      await userRepository.setLocked(targetId, isLocked, tx);
    });
    return { userId: targetId, isLocked };
  },

  async changeRole(actorId: number, targetId: number, roleName: string) {
    if (actorId === targetId) {
      throw AppError.badRequest('Không thể tự đổi vai trò của chính mình', 'CANNOT_CHANGE_SELF_ROLE');
    }
    const target = await mustFindUser(targetId);
    const role = await userRepository.findRoleByName(roleName);
    if (!role) throw AppError.badRequest('Vai trò không tồn tại', 'INVALID_ROLE');
    if (role.userType !== target.userType) {
      throw AppError.badRequest('Chỉ được đổi vai trò trong cùng loại người dùng', 'ROLE_TYPE_MISMATCH');
    }
    await withTransaction(async (tx) => {
      await setActor(tx, actorId); // trigger ghi USER_ROLE_CHANGE
      await userRepository.setRole(targetId, role.roleId, tx);
    });
    return { userId: targetId, role: role.name };
  },

  async softDelete(actorId: number, targetId: number) {
    if (actorId === targetId) {
      throw AppError.badRequest('Không thể tự xóa tài khoản của chính mình', 'CANNOT_DELETE_SELF');
    }
    await mustFindUser(targetId);
    await withTransaction(async (tx) => {
      await setActor(tx, actorId);
      await userRepository.softDelete(targetId, tx); // unique index có điều kiện => username được giải phóng
    });
  },
};

export const ADMIN_ROLE = ROLES.ADMIN;
