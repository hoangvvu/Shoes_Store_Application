import { query, sql, type Executor, type Param } from '../config/database';
import { likePattern } from '../utils/pagination';

export interface CustomerRow {
  customerId: number;
  fullName: string;
  phone: string | null;
  totalPurchased: number;
}

export interface CustomerListRow extends CustomerRow {
  hasAccount: boolean;
}

export const customerRepository = {
  /** Danh sách + tìm theo tên/SĐT, mặc định ẩn bản ghi đã xóa mềm. */
  async list(
    p: { q?: string; page: number; size: number },
    exec?: Executor,
  ): Promise<{ rows: CustomerListRow[]; total: number }> {
    const params: Record<'pattern' | 'offset' | 'size', Param> = {
      pattern: [sql.NVarChar(210), p.q ? likePattern(p.q) : null],
      offset: [sql.Int, (p.page - 1) * p.size],
      size: [sql.Int, p.size],
    };
    const filter = `c.is_deleted = 0
      AND (@pattern IS NULL OR c.full_name LIKE @pattern ESCAPE '\\' OR c.phone LIKE @pattern ESCAPE '\\')`;

    const count = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM customers c WHERE ${filter}`,
      { pattern: params.pattern },
      exec,
    );
    const rows = await query<CustomerListRow>(
      `SELECT c.customer_id AS customerId, c.full_name AS fullName, c.phone,
              c.total_purchased AS totalPurchased,
              CAST(CASE WHEN EXISTS (SELECT 1 FROM users u WHERE u.customer_id = c.customer_id AND u.is_deleted = 0)
                        THEN 1 ELSE 0 END AS BIT) AS hasAccount
       FROM customers c
       WHERE ${filter}
       ORDER BY c.customer_id DESC
       OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      { pattern: params.pattern, offset: params.offset, size: params.size },
      exec,
    );
    return { rows: rows.recordset, total: count.recordset[0].total };
  },

  async hasAccount(customerId: number, exec?: Executor): Promise<boolean> {
    const r = await query(
      `SELECT 1 AS x FROM users WHERE customer_id = @id AND is_deleted = 0`,
      { id: [sql.Int, customerId] },
      exec,
    );
    return r.recordset.length > 0;
  },

  async softDelete(customerId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE customers SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE customer_id = @id AND is_deleted = 0`,
      { id: [sql.Int, customerId] },
      exec,
    );
  },

  async insert(d: { fullName: string; phone: string }, exec?: Executor): Promise<number> {
    const r = await query<{ id: number }>(
      `INSERT INTO customers (full_name, phone) VALUES (@fullName, @phone);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      { fullName: [sql.NVarChar(100), d.fullName], phone: [sql.VarChar(20), d.phone] },
      exec,
    );
    return r.recordset[0].id;
  },

  async phoneExists(phone: string, excludeCustomerId: number | null, exec?: Executor): Promise<boolean> {
    const r = await query(
      `SELECT 1 AS x FROM customers
       WHERE phone = @phone AND is_deleted = 0 AND (@exclude IS NULL OR customer_id <> @exclude)`,
      { phone: [sql.VarChar(20), phone], exclude: [sql.Int, excludeCustomerId] },
      exec,
    );
    return r.recordset.length > 0;
  },

  async findById(customerId: number, exec?: Executor): Promise<CustomerRow | null> {
    const r = await query<CustomerRow>(
      `SELECT customer_id AS customerId, full_name AS fullName, phone, total_purchased AS totalPurchased
       FROM customers WHERE customer_id = @id AND is_deleted = 0`,
      { id: [sql.Int, customerId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async update(
    customerId: number,
    d: { fullName?: string; phone?: string },
    exec?: Executor,
  ): Promise<void> {
    await query(
      `UPDATE customers SET full_name = COALESCE(@fullName, full_name), phone = COALESCE(@phone, phone)
       WHERE customer_id = @id AND is_deleted = 0`,
      {
        fullName: [sql.NVarChar(100), d.fullName ?? null],
        phone: [sql.VarChar(20), d.phone ?? null],
        id: [sql.Int, customerId],
      },
      exec,
    );
  },
};
