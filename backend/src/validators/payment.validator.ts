import { z } from 'zod';

// ─── Payment Methods ──────────────────────────────────────────────────────────

export const createMethodSchema = z.object({
  methodCode: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã phương thức')
    .max(20, 'Mã tối đa 20 ký tự')
    .regex(/^[A-Z0-9_]+$/, 'Mã chỉ gồm chữ in hoa, số và dấu gạch dưới'),
  methodName: z.string().trim().min(1, 'Vui lòng nhập tên').max(100, 'Tên tối đa 100 ký tự'),
  isOnline: z.boolean({ required_error: 'Vui lòng chỉ định loại hình thức' }),
});

export const setMethodActiveSchema = z.object({
  isActive: z.boolean({ required_error: 'Vui lòng chỉ định trạng thái' }),
});

// ─── Payments ─────────────────────────────────────────────────────────────────

export const confirmCashSchema = z.object({});  // no body needed

export const uploadProofSchema = z.object({
  proofUrl: z.string().trim().url('URL chứng từ không hợp lệ').max(500, 'URL tối đa 500 ký tự'),
});

export const reviewProofSchema = z.object({
  status: z.enum(['SUCCESS', 'FAILED'], { required_error: 'Vui lòng chọn kết quả đối soát' }),
  note: z
    .string()
    .trim()
    .max(500, 'Ghi chú tối đa 500 ký tự')
    .default(''),
});

export const retryPaySchema = z.object({
  methodCode: z.string().trim().min(1, 'Vui lòng chọn phương thức thanh toán').max(20),
});

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export const momoWebhookSchema = z.object({
  orderId: z.string().trim().min(1),       // payment_id (stringify)
  transId: z.string().trim().min(1),       // mã giao dịch MoMo
  amount: z.coerce.number().positive(),
  resultCode: z.coerce.number(),           // 0 = thành công
});

export const bankWebhookSchema = z.object({
  paymentId: z.coerce.number().int().positive(),
  transactionCode: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  resultCode: z.coerce.number().int(),     // 0 = thành công
});

// ─── Refunds ─────────────────────────────────────────────────────────────────

export const createRefundSchema = z.object({
  paymentId: z.coerce.number({ invalid_type_error: 'Mã giao dịch không hợp lệ' }).int().positive(),
  amount: z
    .coerce
    .number({ invalid_type_error: 'Số tiền không hợp lệ' })
    .positive('Số tiền hoàn phải lớn hơn 0'),
  reason: z
    .string({ required_error: 'Vui lòng nhập lý do hoàn tiền' })
    .trim()
    .min(1, 'Vui lòng nhập lý do hoàn tiền')
    .max(500, 'Lý do tối đa 500 ký tự'),
});

export const completeRefundSchema = z.object({
  transactionCode: z
    .string({ required_error: 'Vui lòng nhập mã giao dịch hoàn tiền' })
    .trim()
    .min(1, 'Vui lòng nhập mã giao dịch')
    .max(100, 'Mã giao dịch tối đa 100 ký tự'),
});

export const rejectRefundSchema = z.object({
  reason: z
    .string({ required_error: 'Vui lòng nhập lý do từ chối' })
    .trim()
    .min(1, 'Vui lòng nhập lý do từ chối')
    .max(500, 'Lý do tối đa 500 ký tự'),
});

export type CreateMethodInput    = z.infer<typeof createMethodSchema>;
export type ReviewProofInput     = z.infer<typeof reviewProofSchema>;
export type MomoWebhookInput     = z.infer<typeof momoWebhookSchema>;
export type BankWebhookInput     = z.infer<typeof bankWebhookSchema>;
export type CreateRefundInput    = z.infer<typeof createRefundSchema>;
export type CompleteRefundInput  = z.infer<typeof completeRefundSchema>;
