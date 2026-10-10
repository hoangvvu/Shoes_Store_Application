import type { RoleName, UserType } from '../constants/auth.constant';

export interface AuthUser {
  userId: number;
  role: RoleName;
  userType: UserType;
  customerId?: number;
  employeeId?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
