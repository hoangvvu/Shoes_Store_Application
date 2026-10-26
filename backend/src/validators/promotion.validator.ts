import { z } from 'zod';

export const PROMO_TYPES = ['PRODUCT', 'INVOICE', 'VOUCHER'] as const;
export type PromoType = (typeof PROMO_TYPES)[number];

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createPromotionSchema = z
  .object({
    promotionName: z
      .string({ required_error: 'Vui lòng nhập tên chương trình khuyến mãi' })
      .trim()
      .min(2, 'Tên chương trình tối thiểu 2 ký tự')
      .max(150, 'Tên chương trình tối đa 150 ký tự'),
    promoType: z.enum(PROMO_TYPES, {
      errorMap: () => ({ message: 'Loại khuyến mãi phải là PRODUCT, INVOICE hoặc VOUCHER' }),
    }),
    startDate: z
      .string({ required_error: 'Vui lòng chọn ngày bắt đầu' })
      .trim()
      .regex(dateRegex, 'Ngày bắt đầu phải theo định dạng YYYY-MM-DD'),
    endDate: z
      .string({ required_error: 'Vui lòng chọn ngày kết thúc' })
      .trim()
      .regex(dateRegex, 'Ngày kết thúc phải theo định dạng YYYY-MM-DD'),
    isActive: z.boolean().optional().default(true),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu',
    path: ['endDate'],
  });

export const updatePromotionSchema = z
  .object({
    promotionName: z
      .string()
      .trim()
      .min(2, 'Tên chương trình tối thiểu 2 ký tự')
      .max(150, 'Tên chương trình tối đa 150 ký tự')
      .optional(),
    startDate: z
      .string()
      .trim()
      .regex(dateRegex, 'Ngày bắt đầu phải theo định dạng YYYY-MM-DD')
      .optional(),
    endDate: z
      .string()
      .trim()
      .regex(dateRegex, 'Ngày kết thúc phải theo định dạng YYYY-MM-DD')
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) return data.endDate >= data.startDate;
      return true;
    },
    {
      message: 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu',
      path: ['endDate'],
    },
  );

export const updatePromotionStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'Vui lòng cung cấp trạng thái isActive' }),
});

export const syncPromotionProductsSchema = z.object({
  products: z.array(
    z.object({
      productId: z.number().int().positive('Mã sản phẩm không hợp lệ'),
      discountPercent: z
        .number({ required_error: 'Vui lòng nhập phần trăm giảm giá' })
        .min(0.01, 'Phần trăm giảm giá phải lớn hơn 0')
        .max(100, 'Phần trăm giảm giá tối đa 100%'),
    }),
  ),
});

export const syncPromotionTiersSchema = z.object({
  tiers: z
    .array(
      z.object({
        minInvoiceAmount: z
          .number({ required_error: 'Vui lòng nhập mức tiền hóa đơn tối thiểu' })
          .min(0, 'Mức tiền tối thiểu phải lớn hơn hoặc bằng 0'),
        discountPercent: z
          .number({ required_error: 'Vui lòng nhập phần trăm giảm giá' })
          .min(0.01, 'Phần trăm giảm giá phải lớn hơn 0')
          .max(100, 'Phần trăm giảm giá tối đa 100%'),
      }),
    )
    .refine(
      (items) => {
        const amounts = items.map((i) => i.minInvoiceAmount);
        return new Set(amounts).size === amounts.length;
      },
      {
        message: 'Không được có 2 bậc trùng mức tiền tối thiểu',
      },
    ),
});

export const createVoucherSchema = z.object({
  voucherCode: z
    .string({ required_error: 'Vui lòng nhập mã voucher' })
    .trim()
    .min(3, 'Mã voucher tối thiểu 3 ký tự')
    .max(30, 'Mã voucher tối đa 30 ký tự')
    .regex(/^[A-Za-z0-9_-]+$/, 'Mã voucher chỉ chứa chữ cái, số, dấu gạch dưới hoặc gạch ngang'),
  discountPercent: z
    .number({ required_error: 'Vui lòng nhập phần trăm giảm giá' })
    .min(0.01, 'Phần trăm giảm giá phải lớn hơn 0')
    .max(100, 'Phần trăm giảm giá tối đa 100%'),
  usageLimit: z.number().int().positive('Giới hạn lượt dùng phải là số nguyên dương').nullable().optional(),
});

export const generateBatchVouchersSchema = z.object({
  count: z
    .number({ required_error: 'Vui lòng nhập số lượng voucher cần sinh' })
    .int()
    .min(1, 'Số lượng tối thiểu là 1')
    .max(500, 'Chỉ sinh tối đa 500 voucher mỗi lần'),
  discountPercent: z
    .number({ required_error: 'Vui lòng nhập phần trăm giảm giá' })
    .min(0.01, 'Phần trăm giảm giá phải lớn hơn 0')
    .max(100, 'Phần trăm giảm giá tối đa 100%'),
  usageLimit: z.number().int().positive('Giới hạn lượt dùng phải là số nguyên dương').nullable().optional(),
  prefix: z
    .string()
    .trim()
    .max(10, 'Tiền tố voucher tối đa 10 ký tự')
    .regex(/^[A-Za-z0-9]*$/, 'Tiền tố chỉ gồm chữ cái và số')
    .optional(),
  codeLength: z.number().int().min(6).max(20).optional().default(8),
});

export const validateVoucherSchema = z.object({
  voucherCode: z
    .string({ required_error: 'Vui lòng cung cấp mã voucher' })
    .trim()
    .min(1, 'Vui lòng cung cấp mã voucher'),
  totalAmount: z.number().min(0, 'Tổng tiền phải lớn hơn hoặc bằng 0').optional().default(0),
});

export const voucherCodeParam = z.object({
  code: z.string().trim().min(1, 'Mã voucher không hợp lệ'),
});
