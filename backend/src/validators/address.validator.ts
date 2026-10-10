import { z } from 'zod';
import { phoneField } from './common';

export const ADDRESS_LABELS = ['HOME', 'OFFICE', 'OTHER'] as const;

const text = (label: string, max = 100) =>
  z.string({ required_error: `Vui lòng nhập ${label}` }).trim().min(1, `Vui lòng nhập ${label}`).max(max, `${label} tối đa ${max} ký tự`);

const addressFields = {
  label: z.enum(ADDRESS_LABELS, { errorMap: () => ({ message: 'Nhãn địa chỉ phải là HOME, OFFICE hoặc OTHER' }) }),
  receiverName: text('tên người nhận'),
  receiverPhone: phoneField,
  province: text('tỉnh/thành phố'),
  district: text('quận/huyện'),
  ward: text('phường/xã'),
  streetDetail: text('địa chỉ chi tiết', 255),
};

export const createAddressSchema = z.object({ ...addressFields, label: addressFields.label.default('HOME') });

export const updateAddressSchema = z
  .object(addressFields)
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Không có thông tin nào để cập nhật' });

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
