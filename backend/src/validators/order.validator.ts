import { z } from 'zod';
import { CHANNELS, INVOICE_TYPES, ORDER_STATUSES } from '../constants/order.constant';
import { paginationQuery } from '../utils/pagination';

const id = (label: string) => z.coerce.number({ invalid_type_error: `${label} không hợp lệ` }).int().positive(`${label} không hợp lệ`);
const voucher = z.string().trim().min(1).max(30, 'Mã voucher tối đa 30 ký tự');
const note = z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự');

const lineItem = z.object({
  variantId: id('Mã biến thể'),
  quantity: z.coerce.number({ invalid_type_error: 'Số lượng không hợp lệ' }).int('Số lượng phải là số nguyên').min(1, 'Số lượng phải lớn hơn 0').max(999, 'Số lượng tối đa 999'),
});

const items = z
  .array(lineItem, { required_error: 'Thiếu danh sách sản phẩm' })
  .min(1, 'Đơn hàng phải có ít nhất 1 sản phẩm')
  .max(100, 'Tối đa 100 dòng sản phẩm')
  .refine((a) => new Set(a.map((x) => x.variantId)).size === a.length, { message: 'Mỗi biến thể chỉ xuất hiện một lần' });

export const previewOrderSchema = z.object({ voucherCode: voucher.optional() });

export const createOrderSchema = z.object({
  addressId: id('Mã địa chỉ'),
  methodCode: z.string().trim().min(1, 'Vui lòng chọn phương thức thanh toán').max(20),
  voucherCode: voucher.optional(),
  note: note.optional(),
});

export const myOrdersQuery = paginationQuery.extend({ status: z.enum(ORDER_STATUSES).optional() });

export const orderListQuery = paginationQuery.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  channel: z.enum(CHANNELS).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  customerId: id('Mã khách hàng').optional(),
  employeeId: id('Mã nhân viên').optional(),
  q: z.string().trim().max(100).optional(),
});

export const noteSchema = z.object({ note: note.optional() });
/** Khách: lý do không bắt buộc. Nhân viên/Admin: bắt buộc (service kiểm tra). */
export const cancelSchema = z.object({ reason: note.optional() });
export const editItemsSchema = z.object({ items });

/** Danh sách hóa đơn: chỉ đơn hoàn thành + đã thanh toán, và đơn đã hoàn tiền. */
export const invoiceListQuery = paginationQuery.extend({
  type: z.enum(INVOICE_TYPES).optional(),
  channel: z.enum(CHANNELS).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().trim().max(100).optional(),
});

export const posOrderSchema = z.object({
  items,
  customerId: id('Mã khách hàng').optional(),
  methodCode: z.string().trim().min(1).max(20).default('CASH'),
  voucherCode: voucher.optional(),
  note: note.optional(),
  /** Tiền khách đưa (chỉ để tính tiền thừa khi trả tiền mặt, không lưu). */
  amountReceived: z.coerce.number().min(0).optional(),
  /** Mã giao dịch ngân hàng/ví (không bắt buộc, không áp dụng cho tiền mặt). */
  transactionCode: z.string().trim().min(1).max(100).optional(),
});

export const posPreviewSchema = z.object({ items, voucherCode: voucher.optional() });

export const posProductQuery = paginationQuery.extend({
  size: z.coerce.number().int().min(1).max(50).default(12),
  q: z.string().trim().max(100).optional(),
  inStock: z.enum(['true', 'false']).optional(),
});

export const printQuery = z.object({ type: z.enum(['invoice', 'delivery']).default('invoice') });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderListQuery = z.infer<typeof orderListQuery>;
export type MyOrdersQuery = z.infer<typeof myOrdersQuery>;
export type InvoiceListQuery = z.infer<typeof invoiceListQuery>;
export type PosPreviewInput = z.infer<typeof posPreviewSchema>;
export type PosProductQuery = z.infer<typeof posProductQuery>;
export type PosOrderInput = z.infer<typeof posOrderSchema>;
export type LineInput = z.infer<typeof lineItem>;
