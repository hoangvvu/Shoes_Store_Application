export type RoleName = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'CUSTOMER';

export interface AuthUser {
  userId: number;
  username: string;
  role: RoleName;
  userType: 'EMPLOYEE' | 'CUSTOMER';
  /** Họ (kèm tên đệm) và Tên; phiên cũ lưu trước khi tách tên có thể chưa có. */
  lastName?: string | null;
  firstName?: string | null;
  /** Họ + Tên do backend ghép sẵn, dùng để hiển thị. */
  fullName: string;
}

export interface LoginPayload { username: string; password: string }
export interface RegisterPayload { lastName: string; firstName: string; phone: string; username: string; password: string }
export interface LoginResponse { accessToken: string; refreshToken: string; user: AuthUser }

export interface CustomerProfile {
  customerId: number;
  lastName: string;
  firstName: string;
  fullName: string;
  phone: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
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
