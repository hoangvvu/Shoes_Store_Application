import { query, sql, type Executor } from '../config/database';
import { likePattern } from '../utils/pagination';
import type { Gender } from '../validators/common';

export interface EmployeeRow {
  employeeId: number;
  lastName: string;
  firstName: string;
  /** Họ + Tên ghép sẵn bằng SQL, chỉ để hiển thị. */
  fullName: string;
  dateOfBirth: Date | null;
  address: string | null;
  phone: string | null;
  gender: Gender | null;
  email: string | null;
  hireDate: Date | null;
  baseSalary: number;
}

export interface EmployeeListItemRow {
  employeeId: number;
  fullName: string;
  phone: string | null;
  baseSalary: number;
  userId: number | null;
  username: string | null;
  role: string | null;
  isLocked: boolean;
}

export interface EmployeeDetailRow extends EmployeeListItemRow {
  dateOfBirth: Date | null;
  address: string | null;
  createdAt: Date | null;
}

export const employeeRepository = {
  /** SĐT không được trùng với nhân viên khác chưa xóa (CSDL không có unique index cho cột này). */
  async phoneExists(phone: string, excludeEmployeeId: number | null, exec?: Executor): Promise<boolean> {
    const r = await query(
      `SELECT 1 AS x FROM employees
       WHERE phone = @phone AND is_deleted = 0 AND (@exclude IS NULL OR employee_id <> @exclude)`,
      { phone: [sql.VarChar(20), phone], exclude: [sql.Int, excludeEmployeeId] },
      exec,
    );
    return r.recordset.length > 0;
  },

  async insert(
    d: {
      lastName?: string;
      firstName?: string;
      fullName?: string;
      dateOfBirth?: Date;
      address?: string;
      phone?: string;
      gender?: Gender;
      email?: string;
      hireDate?: Date;
      baseSalary?: number;
    },
    exec?: Executor,
  ): Promise<number> {
    let lastName = d.lastName ?? '';
    let firstName = d.firstName ?? '';
    if (!lastName && !firstName && d.fullName) {
      const parts = d.fullName.trim().split(/\s+/);
      if (parts.length === 1) {
        firstName = parts[0];
      } else {
        firstName = parts.pop()!;
        lastName = parts.join(' ');
      }
    }

    const r = await query<{ id: number }>(
      `INSERT INTO employees (last_name, first_name, date_of_birth, address, phone, gender, email, hire_date, base_salary)
       VALUES (@lastName, @firstName, @dob, @address, @phone, @gender, @email, @hire, @salary);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      {
        lastName: [sql.NVarChar(50), lastName],
        firstName: [sql.NVarChar(50), firstName],
        dob: [sql.Date, d.dateOfBirth ?? null],
        address: [sql.NVarChar(255), d.address ?? null],
        phone: [sql.VarChar(20), d.phone ?? null],
        gender: [sql.VarChar(10), d.gender ?? null],
        email: [sql.VarChar(100), d.email ?? null],
        hire: [sql.Date, d.hireDate ?? null],
        salary: [sql.Decimal(18, 2), d.baseSalary ?? 0],
      },
      exec,
    );
    return r.recordset[0].id;
  },

  async findById(employeeId: number, exec?: Executor): Promise<EmployeeRow | null> {
    const r = await query<EmployeeRow>(
      `SELECT employee_id AS employeeId, last_name AS lastName, first_name AS firstName,
              LTRIM(RTRIM(CONCAT(last_name, N' ', first_name))) AS fullName, date_of_birth AS dateOfBirth,
              address, phone, gender, email, hire_date AS hireDate, base_salary AS baseSalary
       FROM employees WHERE employee_id = @id AND is_deleted = 0`,
      { id: [sql.Int, employeeId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async findDetailById(employeeId: number, exec?: Executor): Promise<EmployeeDetailRow | null> {
    const r = await query<EmployeeDetailRow>(
      `SELECT e.employee_id AS employeeId,
              LTRIM(RTRIM(CONCAT(e.last_name, N' ', e.first_name))) AS fullName,
              e.date_of_birth AS dateOfBirth,
              e.address, e.phone, e.base_salary AS baseSalary, u.created_at AS createdAt,
              u.user_id AS userId, u.username, r.role_name AS role, ISNULL(u.is_locked, 0) AS isLocked
       FROM employees e
       LEFT JOIN users u ON u.employee_id = e.employee_id AND u.is_deleted = 0
       LEFT JOIN roles r ON r.role_id = u.role_id
       WHERE e.employee_id = @id AND e.is_deleted = 0`,
      { id: [sql.Int, employeeId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async list(
    p: { q?: string; role?: string; page: number; size: number },
    exec?: Executor,
  ): Promise<{ rows: EmployeeListItemRow[]; total: number }> {
    const offset = (p.page - 1) * p.size;
    const qLike = p.q ? likePattern(p.q) : null;

    const countRes = await query<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM employees e
       LEFT JOIN users u ON u.employee_id = e.employee_id AND u.is_deleted = 0
       LEFT JOIN roles r ON r.role_id = u.role_id
       WHERE e.is_deleted = 0
         AND (@q IS NULL OR LTRIM(RTRIM(CONCAT(e.last_name, N' ', e.first_name))) COLLATE Vietnamese_CI_AI LIKE @qLike OR e.phone LIKE @qLike OR u.username LIKE @qLike)
         AND (@role IS NULL OR r.role_name = @role)`,
      {
        q: [sql.NVarChar(100), p.q ?? null],
        qLike: [sql.NVarChar(102), qLike],
        role: [sql.VarChar(30), p.role ?? null],
      },
      exec,
    );

    const rowsRes = await query<EmployeeListItemRow>(
      `SELECT e.employee_id AS employeeId,
              LTRIM(RTRIM(CONCAT(e.last_name, N' ', e.first_name))) AS fullName,
              e.phone, e.base_salary AS baseSalary,
              u.user_id AS userId, u.username, r.role_name AS role, ISNULL(u.is_locked, 0) AS isLocked
       FROM employees e
       LEFT JOIN users u ON u.employee_id = e.employee_id AND u.is_deleted = 0
       LEFT JOIN roles r ON r.role_id = u.role_id
       WHERE e.is_deleted = 0
         AND (@q IS NULL OR LTRIM(RTRIM(CONCAT(e.last_name, N' ', e.first_name))) COLLATE Vietnamese_CI_AI LIKE @qLike OR e.phone LIKE @qLike OR u.username LIKE @qLike)
         AND (@role IS NULL OR r.role_name = @role)
       ORDER BY e.employee_id DESC
       OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      {
        q: [sql.NVarChar(100), p.q ?? null],
        qLike: [sql.NVarChar(102), qLike],
        role: [sql.VarChar(30), p.role ?? null],
        offset: [sql.Int, offset],
        size: [sql.Int, p.size],
      },
      exec,
    );

    return { rows: rowsRes.recordset, total: countRes.recordset[0]?.total ?? 0 };
  },

  /**
   * Cập nhật thông tin nhân viên hoặc hồ sơ cá nhân.
   * Hỗ trợ cả lastName/firstName hoặc fullName (sẽ tự tách họ/tên),
   * ngày sinh/địa chỉ/SĐT/lương cơ bản/giới tính/email.
   */
  async update(
    employeeId: number,
    d: {
      lastName?: string;
      firstName?: string;
      fullName?: string;
      dateOfBirth?: Date;
      address?: string;
      phone?: string;
      baseSalary?: number;
      gender?: Gender | null;
      email?: string | null;
    },
    exec?: Executor,
  ): Promise<void> {
    let lastName = d.lastName;
    let firstName = d.firstName;
    if (d.fullName !== undefined && lastName === undefined && firstName === undefined) {
      const parts = d.fullName.trim().split(/\s+/);
      if (parts.length === 1) {
        lastName = '';
        firstName = parts[0];
      } else {
        firstName = parts.pop()!;
        lastName = parts.join(' ');
      }
    }

    await query(
      `UPDATE employees SET
         last_name = COALESCE(@lastName, last_name),
         first_name = COALESCE(@firstName, first_name),
         date_of_birth = COALESCE(@dob, date_of_birth),
         address = COALESCE(@address, address),
         phone = COALESCE(@phone, phone),
         base_salary = COALESCE(@salary, base_salary),
         gender = CASE WHEN @genderSet = 1 THEN @gender ELSE gender END,
         email = CASE WHEN @emailSet = 1 THEN @email ELSE email END
       WHERE employee_id = @id AND is_deleted = 0`,
      {
        lastName: [sql.NVarChar(50), lastName ?? null],
        firstName: [sql.NVarChar(50), firstName ?? null],
        dob: [sql.Date, d.dateOfBirth ?? null],
        address: [sql.NVarChar(255), d.address ?? null],
        phone: [sql.VarChar(20), d.phone ?? null],
        salary: [sql.Decimal(18, 2), d.baseSalary ?? null],
        genderSet: [sql.Bit, d.gender !== undefined],
        gender: [sql.VarChar(10), d.gender ?? null],
        emailSet: [sql.Bit, d.email !== undefined],
        email: [sql.VarChar(100), d.email ?? null],
        id: [sql.Int, employeeId],
      },
      exec,
    );
  },

  async hasActiveOrders(employeeId: number, exec?: Executor): Promise<boolean> {
    const r = await query(
      `SELECT 1 AS x FROM invoices
       WHERE employee_id = @id AND order_status IN ('PENDING', 'CONFIRMED', 'SHIPPING') AND is_deleted = 0`,
      { id: [sql.Int, employeeId] },
      exec,
    );
    return r.recordset.length > 0;
  },

  async softDelete(employeeId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE employees SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE employee_id = @id`,
      { id: [sql.Int, employeeId] },
      exec,
    );
  },

  async getPerformance(
    employeeId: number,
    from: string,
    to: string,
    exec?: Executor,
  ): Promise<{ totalOrders: number; deliveredOrders: number; revenue: number }> {
    const r = await query<{ totalOrders: number; deliveredOrders: number; revenue: number }>(
      `SELECT
         COUNT(*) AS totalOrders,
         SUM(CASE WHEN order_status = 'DELIVERED' THEN 1 ELSE 0 END) AS deliveredOrders,
         ISNULL(SUM(CASE WHEN order_status = 'DELIVERED' THEN amount_payable ELSE 0 END), 0) AS revenue
       FROM invoices
       WHERE employee_id = @id AND is_deleted = 0
         AND invoice_date >= @from AND invoice_date < @to`,
      {
        id: [sql.Int, employeeId],
        from: [sql.DateTime2, new Date(from)],
        to: [sql.DateTime2, new Date(to)],
      },
      exec,
    );
    const row = r.recordset[0];
    return {
      totalOrders: row?.totalOrders ?? 0,
      deliveredOrders: row?.deliveredOrders ?? 0,
      revenue: Number(row?.revenue ?? 0),
    };
  },
};
