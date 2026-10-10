import type { UserRow } from '../repositories/user.repository';
import { customerRepository } from '../repositories/customer.repository';
import { employeeRepository } from '../repositories/employee.repository';
import type { AuthUser } from '../types/express';

export function toAuthUser(u: UserRow): AuthUser {
  return {
    userId: u.userId,
    role: u.role,
    userType: u.userType,
    customerId: u.customerId ?? undefined,
    employeeId: u.employeeId ?? undefined,
  };
}

/** Thông tin an toàn trả về client sau đăng nhập (không có passwordHash, không có lương). */
export async function toPublicUser(u: UserRow) {
  let fullName = u.username;
  if (u.customerId) fullName = (await customerRepository.findById(u.customerId))?.fullName ?? fullName;
  else if (u.employeeId) fullName = (await employeeRepository.findById(u.employeeId))?.fullName ?? fullName;
  return {
    userId: u.userId,
    username: u.username,
    role: u.role,
    userType: u.userType,
    fullName,
  };
}
