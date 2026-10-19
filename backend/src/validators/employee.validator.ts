import { z } from 'zod';
import { EMPLOYEE_ROLES, ROLES } from '../constants/auth.constant';
import { adultBirthDateField, employeePhoneField, fullNameField, passwordField, usernameField } from './common';
import { paginationQuery } from '../utils/pagination';

export const createEmployeeSchema = z.object({
  fullName: fullNameField,
  username: usernameField,
  password: passwordField,
  role: z.enum(EMPLOYEE_ROLES, { errorMap: () => ({ message: 'Vai trò phải là ADMIN, SALES hoặc WAREHOUSE' }) }),
  dateOfBirth: adultBirthDateField.optional(),
  address: z.string().trim().max(255).optional(),
  phone: employeePhoneField.optional(),
  baseSalary: z.coerce.number().min(0, 'Lương cơ bản không được âm').optional(),
});

export const updateEmployeeSchema = z.object({
  fullName: fullNameField.optional(),
  dateOfBirth: adultBirthDateField.optional(),
  address: z.string().trim().max(255).optional(),
  phone: employeePhoneField.optional(),
  baseSalary: z.coerce.number().min(0, 'Lương cơ bản không được âm').optional(),
});

export const employeeListQuery = paginationQuery.extend({
  q: z.string().trim().optional(),
  role: z.enum(EMPLOYEE_ROLES).optional(),
});

export const employeePerformanceQuery = z.object({
  from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày bắt đầu phải là YYYY-MM-DD'),
  to: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày kết thúc phải là YYYY-MM-DD'),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeListQuery = z.infer<typeof employeeListQuery>;
export type EmployeePerformanceQuery = z.infer<typeof employeePerformanceQuery>;
