import { z } from 'zod';
import { EMPLOYEE_ROLES, ROLES } from '../constants/auth.constant';
import { fullNameField, passwordField, phoneField, usernameField } from './common';

const anyRole = z.enum([ROLES.ADMIN, ROLES.SALES, ROLES.WAREHOUSE, ROLES.CUSTOMER]);

export const createEmployeeUserSchema = z.object({
  fullName: fullNameField,
  username: usernameField,
  password: passwordField,
  role: z.enum(EMPLOYEE_ROLES, { errorMap: () => ({ message: 'Vai trò phải là ADMIN, SALES hoặc WAREHOUSE' }) }),
  dateOfBirth: z.coerce.date().optional(),
  address: z.string().trim().max(255).optional(),
  phone: phoneField.optional(),
  baseSalary: z.coerce.number().min(0, 'Lương cơ bản không được âm').optional(),
});

export const lockSchema = z.object({ isLocked: z.boolean({ required_error: 'Thiếu isLocked' }) });
export const roleSchema = z.object({ role: anyRole });

export const updateMeSchema = z
  .object({
    fullName: fullNameField.optional(),
    phone: phoneField.optional(),
    dateOfBirth: z.coerce.date().optional(),
    address: z.string().trim().max(255).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Không có thông tin nào để cập nhật',
  });

export type CreateEmployeeUserInput = z.infer<typeof createEmployeeUserSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
