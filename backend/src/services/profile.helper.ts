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
  let firstName: string | null = null;
  let lastName: string | null = null;

  const person = u.customerId
    ? await customerRepository.findById(u.customerId)
    : u.employeeId
      ? await employeeRepository.findById(u.employeeId)
      : null;
  if (person) {
    fullName = person.fullName || fullName;
    firstName = person.firstName;
    lastName = person.lastName;
  }

  return {
    userId: u.userId,
    username: u.username,
    role: u.role,
    userType: u.userType,
    lastName,
    firstName,
    fullName, // ghép sẵn (Họ + Tên) để hiển thị lời chào / avatar
  };
}
