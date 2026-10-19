import { z } from 'zod';

export const dateRangeQuery = z.object({
  from: z.string({ required_error: 'Vui lòng chọn ngày bắt đầu' }).trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'from phải là YYYY-MM-DD'),
  to: z.string({ required_error: 'Vui lòng chọn ngày kết thúc' }).trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'to phải là YYYY-MM-DD'),
  format: z.enum(['json', 'xlsx']).optional(),
});

export const revenueQuery = dateRangeQuery.extend({
  groupBy: z.enum(['day', 'month']).default('day'),
});

export const topProductsQuery = dateRangeQuery.extend({
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  by: z.enum(['quantity', 'revenue']).default('quantity').optional(),
});

export const stockReportQuery = z.object({
  threshold: z.coerce.number().int().min(0).default(5).optional(),
  staleDays: z.coerce.number().int().min(1).default(30).optional(),
  format: z.enum(['json', 'xlsx']).optional(),
});

export const topCustomersQuery = dateRangeQuery.extend({
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});

export type DateRangeQuery = z.infer<typeof dateRangeQuery>;
export type RevenueQuery = z.infer<typeof revenueQuery>;
export type TopProductsQuery = z.infer<typeof topProductsQuery>;
export type StockReportQuery = z.infer<typeof stockReportQuery>;
export type TopCustomersQuery = z.infer<typeof topCustomersQuery>;
