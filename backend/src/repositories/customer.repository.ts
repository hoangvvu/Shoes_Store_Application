import { query, sql, type Executor, type Param } from '../config/database';
import { likePattern } from '../utils/pagination';
import type { Gender } from '../validators/common';

export interface CustomerRow {
  customerId: number;
  fullName: string;
  phone: string | null;
  gender: Gender | null;
  dateOfBirth: Date | null;
  email: string | null;
  totalPurchased: number;
}

export interface CustomerListRow extends CustomerRow {
  hasAccount: boolean;
}

export interface CustomerFilter {
  q?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'NONE';
  hasAccount?: boolean;
  /** Ngày sinh phải <= giá trị này (đã tính từ tuổi tối thiểu). */
  bornOnOrBefore?: Date;
  /** Ngày sinh phải > giá trị này (đã tính từ tuổi tối đa). */
  bornAfter?: Date;
  minPurchased?: number;
  maxPurchased?: number;
  sort: 'newest' | 'name' | 'spent';
  page: number;
  size: number;
}

const COLS = `c.customer_id AS customerId, c.full_name AS fullName, c.phone, c.gender,
  c.date_of_birth AS dateOfBirth, c.email, c.total_purchased AS totalPurchased`;

// Thứ tự cố định (không nhận từ client) để tránh chèn SQL
const ORDER: Record<CustomerFilter['sort'], string> = {
  newest: 'c.customer_id DESC',
  name: 'c.full_name ASC, c.customer_id DESC',
  spent: 'c.total_purchased DESC, c.customer_id DESC',
};

export const customerRepository = {
  /** Tìm kiếm nâng cao: các điều kiện kết hợp bằng AND; mặc định ẩn bản ghi đã xóa mềm. */
  async list(f: CustomerFilter, exec?: Executor): Promise<{ rows: CustomerListRow[]; total: number }> {
    const params: Record<string, Param> = {
      pattern: [sql.NVarChar(210), f.q ? likePattern(f.q) : null],
      gender: [sql.VarChar(10), f.gender && f.gender !== 'NONE' ? f.gender : null],
      noGender: [sql.Bit, f.gender === 'NONE'],
      hasAccount: [sql.Bit, f.hasAccount ?? null],
      bornOnOrBefore: [sql.Date, f.bornOnOrBefore ?? null],
      bornAfter: [sql.Date, f.bornAfter ?? null],
      minPurchased: [sql.Decimal(18, 2), f.minPurchased ?? null],
      maxPurchased: [sql.Decimal(18, 2), f.maxPurchased ?? null],
    };
    const accountExists = `EXISTS (SELECT 1 FROM users u WHERE u.customer_id = c.customer_id AND u.is_deleted = 0)`;
    const where = `c.is_deleted = 0
      AND (@pattern IS NULL OR c.full_name LIKE @pattern ESCAPE '\\' OR c.phone LIKE @pattern ESCAPE '\\' OR c.email LIKE @pattern ESCAPE '\\')
      AND (@gender IS NULL OR c.gender = @gender)
      AND (@noGender = 0 OR c.gender IS NULL)
      AND (@hasAccount IS NULL OR (@hasAccount = 1 AND ${accountExists}) OR (@hasAccount = 0 AND NOT ${accountExists}))
      AND (@bornOnOrBefore IS NULL OR c.date_of_birth <= @bornOnOrBefore)
      AND (@bornAfter IS NULL OR c.date_of_birth > @bornAfter)
      AND (@minPurchased IS NULL OR c.total_purchased >= @minPurchased)
      AND (@maxPurchased IS NULL OR c.total_purchased <= @maxPurchased)`;

    const count = await query<{ total: number }>(`SELECT COUNT(*) AS total FROM customers c WHERE ${where}`, params, exec);
    const rows = await query<CustomerListRow>(
      `SELECT ${COLS}, CAST(CASE WHEN ${accountExists} THEN 1 ELSE 0 END AS BIT) AS hasAccount
       FROM customers c WHERE ${where}
       ORDER BY ${ORDER[f.sort]}
       OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      { ...params, offset: [sql.Int, (f.page - 1) * f.size], size: [sql.Int, f.size] },
      exec,
    );
    return { rows: rows.recordset.map((r) => ({ ...r, totalPurchased: Number(r.totalPurchased) })), total: count.recordset[0].total };
  },

  async hasAccount(customerId: number, exec?: Executor): Promise<boolean> {
    const r = await query(`SELECT 1 AS x FROM users WHERE customer_id = @id AND is_deleted = 0`, { id: [sql.Int, customerId] }, exec);
    return r.recordset.length > 0;
  },

  async softDelete(customerId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE customers SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE customer_id = @id AND is_deleted = 0`,
      { id: [sql.Int, customerId] },
      exec,
    );
  },

  async insert(
    d: { fullName: string; phone: string; gender?: Gender | null; dateOfBirth?: Date | null; email?: string | null },
    exec?: Executor,
  ): Promise<number> {
    const r = await query<{ id: number }>(
      `INSERT INTO customers (full_name, phone, gender, date_of_birth, email) VALUES (@fullName, @phone, @gender, @dob, @email);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      {
        fullName: [sql.NVarChar(100), d.fullName],
        phone: [sql.VarChar(20), d.phone],
        gender: [sql.VarChar(10), d.gender ?? null],
        dob: [sql.Date, d.dateOfBirth ?? null],
        email: [sql.VarChar(100), d.email ?? null],
      },
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
      `SELECT ${COLS} FROM customers c WHERE c.customer_id = @id AND c.is_deleted = 0`,
      { id: [sql.Int, customerId] },
      exec,
    );
    const row = r.recordset[0];
    return row ? { ...row, totalPurchased: Number(row.totalPurchased) } : null;
  },

  /**
   * Cập nhật một phần. Họ tên/SĐT: bỏ qua = giữ nguyên. Giới tính/ngày sinh/email là thông tin không bắt buộc:
   * `undefined` = giữ nguyên, `null` = xóa về NULL (cờ *Set phân biệt hai trường hợp).
   */
  async update(
    customerId: number,
    d: { fullName?: string; phone?: string; gender?: Gender | null; dateOfBirth?: Date | null; email?: string | null },
    exec?: Executor,
  ): Promise<void> {
    await query(
      `UPDATE customers SET
         full_name = COALESCE(@fullName, full_name),
         phone = COALESCE(@phone, phone),
         gender = CASE WHEN @genderSet = 1 THEN @gender ELSE gender END,
         date_of_birth = CASE WHEN @dobSet = 1 THEN @dob ELSE date_of_birth END,
         email = CASE WHEN @emailSet = 1 THEN @email ELSE email END
       WHERE customer_id = @id AND is_deleted = 0`,
      {
        id: [sql.Int, customerId],
        fullName: [sql.NVarChar(100), d.fullName ?? null],
        phone: [sql.VarChar(20), d.phone ?? null],
        genderSet: [sql.Bit, d.gender !== undefined],
        gender: [sql.VarChar(10), d.gender ?? null],
        dobSet: [sql.Bit, d.dateOfBirth !== undefined],
        dob: [sql.Date, d.dateOfBirth ?? null],
        emailSet: [sql.Bit, d.email !== undefined],
        email: [sql.VarChar(100), d.email ?? null],
      },
      exec,
    );
  },
};
