import { query, sql, type Executor } from '../config/database';
import type { Gender } from '../validators/common';

export interface EmployeeRow {
  employeeId: number;
  fullName: string;
  dateOfBirth: Date | null;
  address: string | null;
  phone: string | null;
  gender: Gender | null;
  email: string | null;
  hireDate: Date | null;
  baseSalary: number;
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
      fullName: string;
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
    const r = await query<{ id: number }>(
      `INSERT INTO employees (full_name, date_of_birth, address, phone, gender, email, hire_date, base_salary)
       VALUES (@fullName, @dob, @address, @phone, @gender, @email, @hire, @salary);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      {
        fullName: [sql.NVarChar(100), d.fullName],
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
      `SELECT employee_id AS employeeId, full_name AS fullName, date_of_birth AS dateOfBirth,
              address, phone, gender, email, hire_date AS hireDate, base_salary AS baseSalary
       FROM employees WHERE employee_id = @id AND is_deleted = 0`,
      { id: [sql.Int, employeeId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  /**
   * Cập nhật hồ sơ cá nhân. Họ tên/ngày sinh/địa chỉ/SĐT: bỏ qua = giữ nguyên.
   * Giới tính và email (không bắt buộc): `undefined` = giữ nguyên, `null` = xóa về NULL.
   * Ngày vào làm do Admin quản lý nên không sửa ở đây.
   */
  async update(
    employeeId: number,
    d: { fullName?: string; dateOfBirth?: Date; address?: string; phone?: string; gender?: Gender | null; email?: string | null },
    exec?: Executor,
  ): Promise<void> {
    await query(
      `UPDATE employees SET
         full_name = COALESCE(@fullName, full_name),
         date_of_birth = COALESCE(@dob, date_of_birth),
         address = COALESCE(@address, address),
         phone = COALESCE(@phone, phone),
         gender = CASE WHEN @genderSet = 1 THEN @gender ELSE gender END,
         email = CASE WHEN @emailSet = 1 THEN @email ELSE email END
       WHERE employee_id = @id AND is_deleted = 0`,
      {
        fullName: [sql.NVarChar(100), d.fullName ?? null],
        dob: [sql.Date, d.dateOfBirth ?? null],
        address: [sql.NVarChar(255), d.address ?? null],
        phone: [sql.VarChar(20), d.phone ?? null],
        genderSet: [sql.Bit, d.gender !== undefined],
        gender: [sql.VarChar(10), d.gender ?? null],
        emailSet: [sql.Bit, d.email !== undefined],
        email: [sql.VarChar(100), d.email ?? null],
        id: [sql.Int, employeeId],
      },
      exec,
    );
  },
};
