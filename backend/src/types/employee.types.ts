import type { Gender } from '../validators/common';

export interface EmployeeRow {
  employeeId: number;
  lastName: string;
  firstName: string;
  /** Họ + Tên ghép sẵn bằng SQL, chỉ để hiển thị. */
  fullName: string;
  dateOfBirth: Date | null;
  address: string | null;
  phone: string | null;
  gender: Gender | null;
  email: string | null;
  hireDate: Date | null;
  baseSalary: number;
}

export interface EmployeeListItemRow {
  employeeId: number;
  fullName: string;
  phone: string | null;
  baseSalary: number;
  userId: number | null;
  username: string | null;
  role: string | null;
  isLocked: boolean;
}

export interface EmployeeDetailRow extends EmployeeListItemRow {
  dateOfBirth: Date | null;
  address: string | null;
  createdAt: Date | null;
}
