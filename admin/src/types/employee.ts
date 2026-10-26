import type { EmployeeRole } from './auth';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME';

/** M3 – Nhân viên (bảng employees + tài khoản users liên kết). */
export interface EmployeeListItem {
  employeeId: number;
  fullName: string;
  phone: string | null;
  baseSalary: number;
  employmentType: EmploymentType;
  hourlyRate: number;
  commissionRate: number;
  allowance: number;
  userId: number | null;
  username: string | null;
  role: EmployeeRole | null;
  isLocked: boolean;
}

export interface EmployeeDetail extends EmployeeListItem {
  dateOfBirth: string | null;
  address: string | null;
  createdAt: string | null;
}

export interface EmployeeCreateValues {
  fullName: string;
  username: string;
  password: string;
  role: EmployeeRole;
  employmentType?: EmploymentType;
  dateOfBirth?: string;
  address?: string;
  phone?: string;
  baseSalary?: number;
  hourlyRate?: number;
  commissionRate?: number;
  allowance?: number;
}

export interface EmployeeUpdateValues {
  fullName?: string;
  dateOfBirth?: string;
  address?: string;
  phone?: string;
  baseSalary?: number;
  employmentType?: EmploymentType;
  hourlyRate?: number;
  commissionRate?: number;
  allowance?: number;
}

/** M3 #6 – doanh số theo nhân viên trong khoảng thời gian. */
export interface EmployeePerformance {
  employeeId: number;
  fullName: string;
  totalOrders: number;
  deliveredOrders: number;
  revenue: number;
}
