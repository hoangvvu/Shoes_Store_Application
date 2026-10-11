import type { RoleName } from './auth';

export interface EmployeeMe {
  userId: number;
  username: string;
  role: RoleName;
  userType: string;
  profile: {
    employeeId: number;
    fullName: string;
    dateOfBirth: string | null;
    address: string | null;
    phone: string | null;
  };
}

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
}
