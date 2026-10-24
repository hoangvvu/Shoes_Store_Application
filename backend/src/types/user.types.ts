import type { RoleName, UserType } from '../constants/auth.constant';

export interface UserRow {
  userId: number;
  username: string;
  passwordHash: string;
  roleId: number;
  role: RoleName;
  userType: UserType;
  employeeId: number | null;
  customerId: number | null;
  isLocked: boolean;
}

export interface RoleRow {
  roleId: number;
  name: RoleName;
  userType: UserType;
}
