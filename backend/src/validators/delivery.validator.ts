import { z } from 'zod';

const id = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} không hợp lệ` }).int().positive(`${label} không hợp lệ`);

export const deliveryOrderParam = z.object({ id: id('Mã đơn hàng') });
export const deliveryPaymentParam = z.object({ id: id('Mã đơn hàng'), paymentId: id('Mã giao dịch') });

/** Hình thức thực tế mà người giao đã thu: tiền mặt hoặc chuyển khoản/QR/ví. */
export const DELIVERY_METHOD_CODES = ['CASH', 'BANK_QR', 'BANK_TRANSFER', 'MOMO'] as const;

export const confirmDeliveryPaymentSchema = z.object({
  methodCode: z.enum(DELIVERY_METHOD_CODES, { errorMap: () => ({ message: 'Hình thức thu tiền không hợp lệ' }) }),
  transactionCode: z.string().trim().min(1).max(100).optional(),
});

export type ConfirmDeliveryPaymentInput = z.infer<typeof confirmDeliveryPaymentSchema>;
