export type RoleName = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'CUSTOMER';

export interface AuthUser {
  userId: number;
  username: string;
  role: RoleName;
  userType: 'EMPLOYEE' | 'CUSTOMER';
  fullName: string;
}

export interface LoginPayload { username: string; password: string }
export interface RegisterPayload { fullName: string; phone: string; username: string; password: string }
export interface LoginResponse { accessToken: string; refreshToken: string; user: AuthUser }

export interface CustomerProfile {
  customerId: number;
  fullName: string;
  phone: string | null;
  totalPurchased: number;
}
export interface MeResponse {
  userId: number;
  username: string;
  role: RoleName;
  userType: string;
  profile: CustomerProfile;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: { field: string; message: string }[] | string | null;
}
