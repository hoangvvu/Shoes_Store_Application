export type RoleName = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'CUSTOMER';
export type EmployeeRole = Exclude<RoleName, 'CUSTOMER'>;
export type UserType = 'EMPLOYEE' | 'CUSTOMER';

export interface AuthUser {
  userId: number;
  username: string;
  role: RoleName;
  userType: UserType;
  fullName: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: { field: string; message: string }[] | string | null;
}
