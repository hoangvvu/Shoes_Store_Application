import { z } from 'zod';
import { paginationQuery } from '../utils/pagination';
import { customerBirthDateField, emailField, firstNameField, genderField, lastNameField, phoneField } from './common';

export const CUSTOMER_SORTS = ['newest', 'name', 'spent'] as const;

const money = (label: string) => z.coerce.number({ invalid_type_error: `${label} không hợp lệ` }).min(0, `${label} không được âm`);
const age = (label: string) => z.coerce.number({ invalid_type_error: `${label} không hợp lệ` }).int().min(0).max(120);

/**
 * Tìm kiếm nâng cao khách hàng (đều không bắt buộc, kết hợp theo AND):
 * q (tên/SĐT/email) · gender (MALE|FEMALE|OTHER|NONE = chưa cung cấp) · hasAccount · ageMin/ageMax (tính từ ngày sinh,
 * khách chưa có ngày sinh bị loại khi lọc tuổi) · minPurchased/maxPurchased (tổng tiền đã mua) · sort.
 */
export const customerListQuery = paginationQuery
  .extend({
    q: z.string().trim().max(100).optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'NONE']).optional(),
    hasAccount: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    ageMin: age('Tuổi tối thiểu').optional(),
    ageMax: age('Tuổi tối đa').optional(),
    minPurchased: money('Mức mua tối thiểu').optional(),
    maxPurchased: money('Mức mua tối đa').optional(),
    sort: z.enum(CUSTOMER_SORTS).default('newest'),
  })
  .refine((v) => v.ageMin === undefined || v.ageMax === undefined || v.ageMin <= v.ageMax, { message: 'Tuổi tối thiểu phải nhỏ hơn hoặc bằng tuổi tối đa' })
  .refine((v) => v.minPurchased === undefined || v.maxPurchased === undefined || v.minPurchased <= v.maxPurchased, { message: 'Mức mua tối thiểu phải nhỏ hơn hoặc bằng mức tối đa' });

/** Trường cá nhân không bắt buộc: bỏ qua = không gửi; `null` (khi sửa) = xóa giá trị. */
const optionalProfile = {
  gender: genderField.nullable().optional(),
  dateOfBirth: customerBirthDateField.nullable().optional(),
  email: emailField.nullable().optional(),
};

export const createCustomerSchema = z.object({
  lastName: lastNameField,
  firstName: firstNameField,
  phone: phoneField,
  ...optionalProfile,
});

export const updateCustomerSchema = z
  .object({
    lastName: lastNameField.optional(),
    firstName: firstNameField.optional(),
    phone: phoneField.optional(),
    ...optionalProfile,
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Không có thông tin nào để cập nhật' });

export type CustomerListQuery = z.infer<typeof customerListQuery>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
