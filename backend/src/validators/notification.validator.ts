import { z } from 'zod';

export const createNotificationSchema = z
  .object({
    title: z
      .string({ required_error: 'Vui lòng nhập tiêu đề thông báo' })
      .trim()
      .min(1, 'Tiêu đề không được để trống')
      .max(150, 'Tiêu đề tối đa 150 ký tự'),
    content: z
      .string({ required_error: 'Vui lòng nhập nội dung thông báo' })
      .trim()
      .min(1, 'Nội dung không được để trống'),
    notificationType: z.enum(['SYSTEM', 'PROMOTION', 'ORDER', 'OTHER']).default('SYSTEM'),
    targetType: z.enum(['ALL', 'SELECTED']).default('SELECTED'),
    linkUrl: z
      .string()
      .max(500, 'Đường dẫn tối đa 500 ký tự')
      .nullish()
      .transform((v) => (v && v.trim() ? v.trim() : null)),
    promotionId: z.coerce
      .number()
      .int()
      .positive('Mã khuyến mãi không hợp lệ')
      .nullish()
      .transform((v) => v || null),
    customerIds: z.array(z.coerce.number().int().positive()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.targetType === 'SELECTED') {
      if (!data.customerIds || data.customerIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vui lòng chọn ít nhất 1 khách hàng khi chọn đối tượng gửi là "Chọn lọc"',
          path: ['customerIds'],
        });
      }
    }
  });

export const adminNotificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(10),
  type: z.enum(['SYSTEM', 'PROMOTION', 'ORDER', 'OTHER']).optional(),
  search: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export const customerNotificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(50).default(20),
});

export const notificationIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID thông báo không hợp lệ'),
});
