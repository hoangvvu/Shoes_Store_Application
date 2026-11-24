import { z } from 'zod';
import { paginationQuery } from '../utils/pagination';

export const createSupplierSchema = z.object({
  supplierName: z.string({ required_error: 'Vui lòng nhập tên nhà cung cấp' }).trim().min(1, 'Tên nhà cung cấp không được để trống').max(150),
  phone: z
    .string({ required_error: 'Vui lòng nhập số điện thoại' })
    .trim()
    .regex(/^0\d{9,10}$/, 'Số điện thoại nhà cung cấp phải gồm 10–11 chữ số và bắt đầu bằng số 0'),
  email: z.string().trim().email('Email không đúng định dạng').max(100).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
});

export const updateSupplierSchema = z.object({
  supplierName: z.string().trim().min(1, 'Tên nhà cung cấp không được để trống').max(150).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{9,10}$/, 'Số điện thoại nhà cung cấp phải gồm 10–11 chữ số và bắt đầu bằng số 0')
    .optional(),
  email: z.string().trim().email('Email không đúng định dạng').max(100).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
});

export const supplierListQuery = paginationQuery.extend({
  q: z.string().trim().optional(),
});

export const receiptLineSchema = z.object({
  variantId: z.coerce.number().int().positive('Mã biến thể không hợp lệ'),
  quantity: z.coerce.number().int().positive('Số lượng nhập phải lớn hơn 0'),
  importPrice: z.coerce.number().min(0, 'Giá nhập không được âm'),
});

export const createReceiptSchema = z.object({
  supplierId: z.coerce.number().int().positive('Vui lòng chọn nhà cung cấp'),
  lines: z.array(receiptLineSchema).min(1, 'Phiếu nhập phải có ít nhất 1 dòng sản phẩm'),
});

export const deleteReceiptSchema = z.object({
  reason: z.string().trim().max(255).optional(),
});

export const receiptListQuery = paginationQuery.extend({
  from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'from phải là YYYY-MM-DD').optional(),
  to: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'to phải là YYYY-MM-DD').optional(),
  supplierId: z.coerce.number().int().positive().optional(),
  status: z.enum(['ALL', 'ACTIVE', 'DELETED']).default('ALL').optional(),
});

export const stockListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(500).default(10),
  q: z.string().trim().optional(),
  lowStockOnly: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  threshold: z.coerce.number().int().min(0).default(5).optional(),
  supplierId: z.coerce.number().int().positive().optional(),
});

export const lowStockQuery = z.object({
  threshold: z.coerce.number().int().min(0).default(5).optional(),
});

export const ledgerQuery = paginationQuery.extend({
  from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'from phải là YYYY-MM-DD').optional(),
  to: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'to phải là YYYY-MM-DD').optional(),
});

export const adjustStockSchema = z.object({
  variantId: z.coerce.number().int().positive('Vui lòng chọn biến thể'),
  quantityChange: z.coerce.number().int().refine((n) => n !== 0, 'Số lượng điều chỉnh phải khác 0'),
  reason: z.string({ required_error: 'Vui lòng nhập lý do điều chỉnh' }).trim().min(1, 'Lý do không được để trống').max(255),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type SupplierListQuery = z.infer<typeof supplierListQuery>;
export type CreateReceiptInput = z.infer<typeof createReceiptSchema>;
export type DeleteReceiptInput = z.infer<typeof deleteReceiptSchema>;
export type ReceiptListQuery = z.infer<typeof receiptListQuery>;
export type StockListQuery = z.infer<typeof stockListQuery>;
export type LowStockQuery = z.infer<typeof lowStockQuery>;
export type LedgerQuery = z.infer<typeof ledgerQuery>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
