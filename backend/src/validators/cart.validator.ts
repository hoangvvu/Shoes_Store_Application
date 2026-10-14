import { z } from 'zod';

const quantity = z.coerce
  .number({ invalid_type_error: 'Số lượng không hợp lệ' })
  .int('Số lượng phải là số nguyên')
  .min(1, 'Số lượng phải lớn hơn 0')
  .max(99, 'Mỗi lần chỉ thêm tối đa 99 sản phẩm');

export const addCartItemSchema = z.object({
  variantId: z.coerce.number({ invalid_type_error: 'Mã biến thể không hợp lệ' }).int().positive('Mã biến thể không hợp lệ'),
  quantity: quantity.default(1),
});

export const updateCartItemSchema = z.object({ quantity });

export const variantParam = z.object({
  variantId: z.coerce.number({ invalid_type_error: 'Mã biến thể không hợp lệ' }).int().positive('Mã biến thể không hợp lệ'),
});

export const validateCartSchema = z.object({
  /** true: tự xóa mềm các dòng UNAVAILABLE (sản phẩm đã xóa / ngừng bán) khỏi giỏ. */
  removeUnavailable: z.boolean().optional().default(false),
});
