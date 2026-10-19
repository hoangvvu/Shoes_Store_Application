import { query, sql, type Executor } from '../config/database';
import { likePattern } from '../utils/pagination';

export interface SupplierRow {
  supplierId: number;
  supplierName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export const supplierRepository = {
  async list(
    p: { q?: string; page: number; size: number },
    exec?: Executor,
  ): Promise<{ rows: SupplierRow[]; total: number }> {
    const offset = (p.page - 1) * p.size;
    const qLike = p.q ? likePattern(p.q) : null;

    const countRes = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM suppliers
       WHERE is_deleted = 0
         AND (@q IS NULL OR supplier_name COLLATE Vietnamese_CI_AI LIKE @qLike OR phone LIKE @qLike OR email LIKE @qLike)`,
      {
        q: [sql.NVarChar(150), p.q ?? null],
        qLike: [sql.NVarChar(152), qLike],
      },
      exec,
    );

    const rowsRes = await query<SupplierRow>(
      `SELECT supplier_id AS supplierId, supplier_name AS supplierName, phone, email, address
       FROM suppliers
       WHERE is_deleted = 0
         AND (@q IS NULL OR supplier_name COLLATE Vietnamese_CI_AI LIKE @qLike OR phone LIKE @qLike OR email LIKE @qLike)
       ORDER BY supplier_id DESC
       OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      {
        q: [sql.NVarChar(150), p.q ?? null],
        qLike: [sql.NVarChar(152), qLike],
        offset: [sql.Int, offset],
        size: [sql.Int, p.size],
      },
      exec,
    );

    return { rows: rowsRes.recordset, total: countRes.recordset[0]?.total ?? 0 };
  },

  async findById(id: number, exec?: Executor): Promise<SupplierRow | null> {
    const r = await query<SupplierRow>(
      `SELECT supplier_id AS supplierId, supplier_name AS supplierName, phone, email, address
       FROM suppliers WHERE supplier_id = @id AND is_deleted = 0`,
      { id: [sql.Int, id] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async insert(
    d: { supplierName: string; phone?: string | null; email?: string | null; address?: string | null },
    exec?: Executor,
  ): Promise<SupplierRow> {
    const r = await query<SupplierRow>(
      `INSERT INTO suppliers (supplier_name, phone, email, address)
       VALUES (@name, @phone, @email, @address);
       SELECT supplier_id AS supplierId, supplier_name AS supplierName, phone, email, address
       FROM suppliers WHERE supplier_id = SCOPE_IDENTITY();`,
      {
        name: [sql.NVarChar(150), d.supplierName],
        phone: [sql.VarChar(20), d.phone ?? null],
        email: [sql.VarChar(100), d.email ?? null],
        address: [sql.NVarChar(255), d.address ?? null],
      },
      exec,
    );
    return r.recordset[0];
  },

  async update(
    id: number,
    d: { supplierName?: string; phone?: string | null; email?: string | null; address?: string | null },
    exec?: Executor,
  ): Promise<SupplierRow> {
    const r = await query<SupplierRow>(
      `UPDATE suppliers SET
         supplier_name = COALESCE(@name, supplier_name),
         phone = CASE WHEN @phoneProvided = 1 THEN @phone ELSE phone END,
         email = CASE WHEN @emailProvided = 1 THEN @email ELSE email END,
         address = CASE WHEN @addrProvided = 1 THEN @address ELSE address END
       WHERE supplier_id = @id AND is_deleted = 0;
       SELECT supplier_id AS supplierId, supplier_name AS supplierName, phone, email, address
       FROM suppliers WHERE supplier_id = @id;`,
      {
        id: [sql.Int, id],
        name: [sql.NVarChar(150), d.supplierName ?? null],
        phoneProvided: [sql.Bit, d.phone !== undefined ? 1 : 0],
        phone: [sql.VarChar(20), d.phone ?? null],
        emailProvided: [sql.Bit, d.email !== undefined ? 1 : 0],
        email: [sql.VarChar(100), d.email ?? null],
        addrProvided: [sql.Bit, d.address !== undefined ? 1 : 0],
        address: [sql.NVarChar(255), d.address ?? null],
      },
      exec,
    );
    return r.recordset[0];
  },

  async softDelete(id: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE suppliers SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE supplier_id = @id`,
      { id: [sql.Int, id] },
      exec,
    );
  },
};
