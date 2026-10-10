import { query, sql, type Executor } from '../config/database';

export interface CustomerRow {
  customerId: number;
  fullName: string;
  phone: string | null;
  totalPurchased: number;
}

export const customerRepository = {
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
