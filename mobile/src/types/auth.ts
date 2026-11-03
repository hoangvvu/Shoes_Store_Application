export type RoleName = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'CUSTOMER';

export interface AuthUser {
  userId: number;
  username: string;
  userType?: 'EMPLOYEE' | 'CUSTOMER';
  roleName?: string;
  lastName?: string;  
  firstName?: string; 
  email?: string;
  phone?: string;
  employeeId?: number | null;
  customerId?: number | null;
}

export interface LoginPayload { username: string; password: string }
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface RegisterPayload {
  lastName: string;
  firstName: string;
  phone: string;
  username: string;
  password: string;
  /** Không bắt buộc: chỉ gửi khi khách có nhập. */
  gender?: Gender;
  /** YYYY-MM-DD, không bắt buộc. */
  dateOfBirth?: string;
  email?: string;
}
export interface LoginResponse { accessToken: string; refreshToken: string; user: AuthUser }

export interface CustomerProfile {
  customerId: number;
  lastName: string;
  firstName: string;
  fullName: string;
  phone: string | null;
  gender: Gender | null;
  /** YYYY-MM-DD (hoặc ISO) hoặc null nếu chưa cung cấp. */
  dateOfBirth: string | null;
  email: string | null;
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
