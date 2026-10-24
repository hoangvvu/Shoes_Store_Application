import { query, sql, type Executor } from '../config/database';
import type { RecentOrderRow } from '../types/invoice.types';

/** Giữ re-export để các file cũ import kiểu từ repository vẫn chạy; có thể bỏ sau khi đổi import. */
export type { RecentOrderRow } from '../types/invoice.types';

/** Mới chứa phần M2 cần; M8 sẽ mở rộng repository này. */
export const invoiceRepository = {
  async findRecentByCustomer(customerId: number, limit = 5, exec?: Executor): Promise<RecentOrderRow[]> {
    const r = await query<RecentOrderRow>(
      `SELECT TOP (@limit) invoice_id AS invoiceId, invoice_date AS invoiceDate, channel,
              order_status AS orderStatus, amount_payable AS amountPayable
       FROM invoices
       WHERE customer_id = @customerId AND is_deleted = 0
       ORDER BY invoice_date DESC, invoice_id DESC`,
      { customerId: [sql.Int, customerId], limit: [sql.Int, limit] },
      exec,
    );
    return r.recordset;
  },

  /** Còn đơn đang xử lý (PENDING/CONFIRMED/SHIPPING) thì không cho xóa mềm khách. */
  async hasActiveByCustomer(customerId: number, exec?: Executor): Promise<boolean> {
    const r = await query(
      `SELECT TOP 1 1 AS x FROM invoices
       WHERE customer_id = @customerId AND is_deleted = 0 AND order_status IN ('PENDING','CONFIRMED','SHIPPING')`,
      { customerId: [sql.Int, customerId] },
      exec,
    );
    return r.recordset.length > 0;
  },
};
