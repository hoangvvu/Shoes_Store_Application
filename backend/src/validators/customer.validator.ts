import { z } from 'zod';
import { paginationQuery } from '../utils/pagination';
import { fullNameField, phoneField } from './common';

export const customerListQuery = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
});

export const createCustomerSchema = z.object({
  fullName: fullNameField,
  phone: phoneField,
});

export const updateCustomerSchema = z
  .object({
    fullName: fullNameField.optional(),
    phone: phoneField.optional(),
  })
  .refine((v) => v.fullName !== undefined || v.phone !== undefined, {
    message: 'Không có thông tin nào để cập nhật',
  });

export type CustomerListQuery = z.infer<typeof customerListQuery>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
