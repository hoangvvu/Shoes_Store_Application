import { z } from 'zod';
import { EMPLOYEE_ROLES, ROLES } from '../constants/auth.constant';
import {
  adultBirthDateField, customerBirthDateField, emailField, employeePhoneField, fullNameField, genderField,
  hireDateField, passwordField, phoneField, usernameField,
} from './common';

const anyRole = z.enum([ROLES.ADMIN, ROLES.SALES, ROLES.WAREHOUSE, ROLES.CUSTOMER]);

export const createEmployeeUserSchema = z.object({
  fullName: fullNameField,
  username: usernameField,
  password: passwordField,
  role: z.enum(EMPLOYEE_ROLES, { errorMap: () => ({ message: 'Vai trò phải là ADMIN, SALES hoặc WAREHOUSE' }) }),
  dateOfBirth: adultBirthDateField.optional(),
  address: z.string().trim().max(255).optional(),
  phone: employeePhoneField.optional(),
  gender: genderField.optional(),
  email: emailField.optional(),
  hireDate: hireDateField.optional(),
  baseSalary: z.coerce.number().min(0, 'Lương cơ bản không được âm').optional(),
});

export const lockSchema = z.object({ isLocked: z.boolean({ required_error: 'Thiếu isLocked' }) });
export const roleSchema = z.object({ role: anyRole });

const atLeastOne = (v: Record<string, unknown>) => Object.values(v).some((x) => x !== undefined);
const NOTHING = { message: 'Không có thông tin nào để cập nhật' };

/** PUT /me của khách: chỉ họ tên và SĐT (quy tắc SĐT khách theo M2). */
export const updateCustomerMeSchema = z
  .object({
    fullName: fullNameField.optional(),
    phone: phoneField.optional(),
    gender: genderField.nullable().optional(),
    dateOfBirth: customerBirthDateField.nullable().optional(),
    email: emailField.nullable().optional(),
  })
  .refine(atLeastOne, NOTHING);

/** PUT /me của nhân viên/admin: SĐT 10–11 số bắt đầu bằng 0, ngày sinh đủ 18 tuổi, không ở tương lai (M3 #7). */
export const updateEmployeeMeSchema = z
  .object({
    fullName: fullNameField.optional(),
    phone: employeePhoneField.optional(),
    dateOfBirth: adultBirthDateField.optional(),
    address: z.string().trim().max(255, 'Địa chỉ tối đa 255 ký tự').optional(),
    // Không bắt buộc: null = xóa. Ngày vào làm do Admin quản lý, nhân viên không tự sửa.
    gender: genderField.nullable().optional(),
    email: emailField.nullable().optional(),
  })
  .refine(atLeastOne, NOTHING);

export type CreateEmployeeUserInput = z.infer<typeof createEmployeeUserSchema>;
export interface UpdateMeInput {
  fullName?: string;
  phone?: string;
  /** Khách: null = xóa; nhân viên: không được null (đã chặn ở schema). */
  dateOfBirth?: Date | null;
  address?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  email?: string | null;
}
