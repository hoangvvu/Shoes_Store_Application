import type { EmployeeRole, RoleName } from '../types/auth';

export const EMPLOYEE_ROLES: EmployeeRole[] = ['ADMIN', 'SALES', 'WAREHOUSE'];

export const isEmployeeRole = (role: RoleName): role is EmployeeRole =>
  (EMPLOYEE_ROLES as RoleName[]).includes(role);

/** Trang đầu của từng vai trò sau khi đăng nhập. */
export const ROLE_HOME: Record<EmployeeRole, string> = {
  ADMIN: '/admin',
  SALES: '/sales',
  WAREHOUSE: '/warehouse',
};

export const ROLE_LABEL: Record<EmployeeRole, string> = {
  ADMIN: 'Quản trị viên',
  SALES: 'Nhân viên bán hàng',
  WAREHOUSE: 'Nhân viên kho',
};

/** Tên ngắn hiển thị ở sidebar / header. */
export const ROLE_SHORT: Record<EmployeeRole, string> = {
  ADMIN: 'Admin',
  SALES: 'Bán hàng',
  WAREHOUSE: 'Kho',
};
