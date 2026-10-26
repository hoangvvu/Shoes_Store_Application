import { query, sql, type Executor } from '../config/database';
import type { PayrollItemRow, PayrollRow, PayrollStatus } from '../types/payroll.types';

export const payrollRepository = {
  async list(exec?: Executor): Promise<PayrollRow[]> {
    const r = await query<PayrollRow>(
      `SELECT p.payroll_id AS payrollId, p.period_month AS periodMonth, p.period_year AS periodYear,
              p.status, p.total_amount AS totalAmount, p.created_by AS createdBy,
              LTRIM(RTRIM(CONCAT(c.last_name, N' ', c.first_name))) AS createdByName,
              p.approved_by AS approvedBy,
              LTRIM(RTRIM(CONCAT(a.last_name, N' ', a.first_name))) AS approvedByName,
              p.approved_at AS approvedAt, p.paid_at AS paidAt, p.created_at AS createdAt,
              (SELECT COUNT(*) FROM payroll_items pi WHERE pi.payroll_id = p.payroll_id) AS itemCount,
              (SELECT ISNULL(SUM(advance_amount), 0) FROM payroll_items pi WHERE pi.payroll_id = p.payroll_id) AS totalAdvance
       FROM payrolls p
       JOIN employees c ON c.employee_id = p.created_by
       LEFT JOIN employees a ON a.employee_id = p.approved_by
       ORDER BY p.period_year DESC, p.period_month DESC`,
      {},
      exec,
    );
    return r.recordset.map((row) => ({
      ...row,
      totalAmount: Number(row.totalAmount),
      totalAdvance: Number((row as unknown as { totalAdvance?: number }).totalAdvance ?? 0),
      itemCount: Number(row.itemCount),
    }));
  },

  async findByPeriod(month: number, year: number, exec?: Executor): Promise<PayrollRow | null> {
    const r = await query<PayrollRow>(
      `SELECT payroll_id AS payrollId, period_month AS periodMonth, period_year AS periodYear,
              status, total_amount AS totalAmount, created_by AS createdBy,
              approved_by AS approvedBy, approved_at AS approvedAt, paid_at AS paidAt, created_at AS createdAt
       FROM payrolls
       WHERE period_month = @month AND period_year = @year`,
      {
        month: [sql.Int, month],
        year: [sql.Int, year],
      },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async findById(payrollId: number, exec?: Executor): Promise<PayrollRow | null> {
    const r = await query<PayrollRow>(
      `SELECT p.payroll_id AS payrollId, p.period_month AS periodMonth, p.period_year AS periodYear,
              p.status, p.total_amount AS totalAmount, p.created_by AS createdBy,
              LTRIM(RTRIM(CONCAT(c.last_name, N' ', c.first_name))) AS createdByName,
              p.approved_by AS approvedBy,
              LTRIM(RTRIM(CONCAT(a.last_name, N' ', a.first_name))) AS approvedByName,
              p.approved_at AS approvedAt, p.paid_at AS paidAt, p.created_at AS createdAt
       FROM payrolls p
       JOIN employees c ON c.employee_id = p.created_by
       LEFT JOIN employees a ON a.employee_id = p.approved_by
       WHERE p.payroll_id = @id`,
      { id: [sql.Int, payrollId] },
      exec,
    );
    if (!r.recordset[0]) return null;
    return { ...r.recordset[0], totalAmount: Number(r.recordset[0].totalAmount) };
  },

  async listItems(payrollId: number, exec?: Executor): Promise<PayrollItemRow[]> {
    const r = await query<PayrollItemRow>(
      `SELECT pi.item_id AS itemId, pi.payroll_id AS payrollId, pi.employee_id AS employeeId,
              LTRIM(RTRIM(CONCAT(e.last_name, N' ', e.first_name))) AS employeeName,
              r.role_name AS role,
              pi.employment_type AS employmentType,
              pi.standard_work_days AS standardWorkDays,
              pi.actual_work_days AS actualWorkDays,
              pi.actual_work_hours AS actualWorkHours,
              pi.base_salary_or_rate AS baseSalaryOrRate,
              pi.base_pay AS basePay,
              pi.sales_revenue AS salesRevenue,
              pi.commission_rate AS commissionRate,
              pi.commission_amount AS commissionAmount,
              pi.kpi_bonus AS kpiBonus,
              pi.allowance_amount AS allowanceAmount,
              pi.penalty_amount AS penaltyAmount,
              pi.bonus_amount AS bonusAmount,
              pi.advance_amount AS advanceAmount,
              pi.net_pay AS netPay,
              pi.note
       FROM payroll_items pi
       JOIN employees e ON e.employee_id = pi.employee_id
       LEFT JOIN users u ON u.employee_id = e.employee_id AND u.is_deleted = 0
       LEFT JOIN roles r ON r.role_id = u.role_id
       WHERE pi.payroll_id = @id
       ORDER BY r.role_name, e.employee_id`,
      { id: [sql.Int, payrollId] },
      exec,
    );
    return r.recordset.map((row) => ({
      ...row,
      standardWorkDays: Number(row.standardWorkDays),
      actualWorkDays: Number(row.actualWorkDays),
      actualWorkHours: Number(row.actualWorkHours),
      baseSalaryOrRate: Number(row.baseSalaryOrRate),
      basePay: Number(row.basePay),
      salesRevenue: Number(row.salesRevenue),
      commissionRate: Number(row.commissionRate),
      commissionAmount: Number(row.commissionAmount),
      kpiBonus: Number(row.kpiBonus),
      allowanceAmount: Number(row.allowanceAmount),
      penaltyAmount: Number(row.penaltyAmount),
      bonusAmount: Number(row.bonusAmount),
      advanceAmount: Number(row.advanceAmount),
      netPay: Number(row.netPay),
    }));
  },

  async createPayroll(
    d: { periodMonth: number; periodYear: number; createdBy: number },
    exec?: Executor,
  ): Promise<number> {
    const r = await query<{ id: number }>(
      `INSERT INTO payrolls (period_month, period_year, created_by, status, total_amount)
       VALUES (@month, @year, @createdBy, 'DRAFT', 0);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      {
        month: [sql.Int, d.periodMonth],
        year: [sql.Int, d.periodYear],
        createdBy: [sql.Int, d.createdBy],
      },
      exec,
    );
    return r.recordset[0].id;
  },

  async insertItems(
    items: Omit<PayrollItemRow, 'itemId' | 'employeeName' | 'role'>[],
    exec?: Executor,
  ): Promise<void> {
    for (const it of items) {
      await query(
        `INSERT INTO payroll_items (
           payroll_id, employee_id, employment_type, standard_work_days, actual_work_days,
           actual_work_hours, base_salary_or_rate, base_pay, sales_revenue, commission_rate,
           commission_amount, kpi_bonus, allowance_amount, penalty_amount, bonus_amount,
           advance_amount, net_pay, note
         ) VALUES (
           @payrollId, @employeeId, @employmentType, @stdDays, @actDays,
           @actHours, @baseRate, @basePay, @salesRevenue, @commRate,
           @commAmt, @kpiBonus, @allowance, @penalty, @bonus,
           @advance, @netPay, @note
         )`,
        {
          payrollId: [sql.Int, it.payrollId],
          employeeId: [sql.Int, it.employeeId],
          employmentType: [sql.VarChar(10), it.employmentType],
          stdDays: [sql.Decimal(4, 1), it.standardWorkDays],
          actDays: [sql.Decimal(4, 1), it.actualWorkDays],
          actHours: [sql.Decimal(6, 2), it.actualWorkHours],
          baseRate: [sql.Decimal(18, 2), it.baseSalaryOrRate],
          basePay: [sql.Decimal(18, 2), it.basePay],
          salesRevenue: [sql.Decimal(18, 2), it.salesRevenue],
          commRate: [sql.Decimal(5, 4), it.commissionRate],
          commAmt: [sql.Decimal(18, 2), it.commissionAmount],
          kpiBonus: [sql.Decimal(18, 2), it.kpiBonus],
          allowance: [sql.Decimal(18, 2), it.allowanceAmount],
          penalty: [sql.Decimal(18, 2), it.penaltyAmount],
          bonus: [sql.Decimal(18, 2), it.bonusAmount],
          advance: [sql.Decimal(18, 2), it.advanceAmount],
          netPay: [sql.Decimal(18, 2), it.netPay],
          note: [sql.NVarChar(500), it.note ?? null],
        },
        exec,
      );
    }

    // Cập nhật lại tổng tiền cho bảng payrolls
    if (items.length > 0) {
      const payrollId = items[0].payrollId;
      await query(
        `UPDATE payrolls 
         SET total_amount = (SELECT ISNULL(SUM(net_pay), 0) FROM payroll_items WHERE payroll_id = @id)
         WHERE payroll_id = @id`,
        { id: [sql.Int, payrollId] },
        exec,
      );
    }
  },

  async updateItem(
    itemId: number,
    d: {
      bonusAmount?: number;
      penaltyAmount?: number;
      advanceAmount?: number;
      kpiBonus?: number;
      allowanceAmount?: number;
      note?: string | null;
    },
    exec?: Executor,
  ): Promise<void> {
    // Lấy thông tin hiện tại để tính lại net_pay
    const cur = await query<{
      payrollId: number;
      basePay: number;
      commissionAmount: number;
      kpiBonus: number;
      allowanceAmount: number;
      bonusAmount: number;
      penaltyAmount: number;
      advanceAmount: number;
    }>(
      `SELECT payroll_id AS payrollId, base_pay AS basePay, commission_amount AS commissionAmount,
              kpi_bonus AS kpiBonus, allowance_amount AS allowanceAmount, bonus_amount AS bonusAmount,
              penalty_amount AS penaltyAmount, advance_amount AS advanceAmount
       FROM payroll_items WHERE item_id = @id`,
      { id: [sql.Int, itemId] },
      exec,
    );
    if (!cur.recordset[0]) return;
    const row = cur.recordset[0];

    const kpiBonus = d.kpiBonus !== undefined ? d.kpiBonus : Number(row.kpiBonus);
    const allowanceAmount = d.allowanceAmount !== undefined ? d.allowanceAmount : Number(row.allowanceAmount);
    const bonusAmount = d.bonusAmount !== undefined ? d.bonusAmount : Number(row.bonusAmount);
    const penaltyAmount = d.penaltyAmount !== undefined ? d.penaltyAmount : Number(row.penaltyAmount);
    const advanceAmount = d.advanceAmount !== undefined ? d.advanceAmount : Number(row.advanceAmount);
    const netPay =
      Number(row.basePay) +
      Number(row.commissionAmount) +
      kpiBonus +
      allowanceAmount +
      bonusAmount -
      penaltyAmount -
      advanceAmount;

    await query(
      `UPDATE payroll_items SET
         bonus_amount = @bonus,
         penalty_amount = @penalty,
         advance_amount = @advance,
         kpi_bonus = @kpi,
         allowance_amount = @allowance,
         net_pay = @netPay,
         note = COALESCE(@note, note)
       WHERE item_id = @id`,
      {
        id: [sql.Int, itemId],
        bonus: [sql.Decimal(18, 2), bonusAmount],
        penalty: [sql.Decimal(18, 2), penaltyAmount],
        advance: [sql.Decimal(18, 2), advanceAmount],
        kpi: [sql.Decimal(18, 2), kpiBonus],
        allowance: [sql.Decimal(18, 2), allowanceAmount],
        netPay: [sql.Decimal(18, 2), netPay < 0 ? 0 : netPay],
        note: [sql.NVarChar(500), d.note ?? null],
      },
      exec,
    );

    // Cập nhật lại total_amount của payroll
    await query(
      `UPDATE payrolls 
       SET total_amount = (SELECT ISNULL(SUM(net_pay), 0) FROM payroll_items WHERE payroll_id = @pId)
       WHERE payroll_id = @pId`,
      { pId: [sql.Int, row.payrollId] },
      exec,
    );
  },

  async updateStatus(
    payrollId: number,
    status: PayrollStatus,
    adminId?: number,
    exec?: Executor,
  ): Promise<void> {
    if (status === 'APPROVED') {
      await query(
        `UPDATE payrolls SET
           status = 'APPROVED',
           approved_by = @adminId,
           approved_at = SYSUTCDATETIME()
         WHERE payroll_id = @id`,
        { id: [sql.Int, payrollId], adminId: [sql.Int, adminId ?? null] },
        exec,
      );
    } else if (status === 'PAID') {
      await query(
        `UPDATE payrolls SET
           status = 'PAID',
           paid_at = SYSUTCDATETIME()
         WHERE payroll_id = @id`,
        { id: [sql.Int, payrollId] },
        exec,
      );
    } else {
      await query(`UPDATE payrolls SET status = @status WHERE payroll_id = @id`, {
        id: [sql.Int, payrollId],
        status: [sql.VarChar(20), status],
      }, exec);
    }
  },

  async delete(payrollId: number, exec?: Executor): Promise<void> {
    await query(`DELETE FROM payrolls WHERE payroll_id = @id AND status = 'DRAFT'`, {
      id: [sql.Int, payrollId],
    }, exec);
  },

  async getMyPayslip(employeeId: number, month: number, year: number, exec?: Executor): Promise<PayrollItemRow | null> {
    const r = await query<PayrollItemRow>(
      `SELECT pi.item_id AS itemId, pi.payroll_id AS payrollId, pi.employee_id AS employeeId,
              LTRIM(RTRIM(CONCAT(e.last_name, N' ', e.first_name))) AS employeeName,
              r.role_name AS role,
              pi.employment_type AS employmentType,
              pi.standard_work_days AS standardWorkDays,
              pi.actual_work_days AS actualWorkDays,
              pi.actual_work_hours AS actualWorkHours,
              pi.base_salary_or_rate AS baseSalaryOrRate,
              pi.base_pay AS basePay,
              pi.sales_revenue AS salesRevenue,
              pi.commission_rate AS commissionRate,
              pi.commission_amount AS commissionAmount,
              pi.kpi_bonus AS kpiBonus,
              pi.allowance_amount AS allowanceAmount,
              pi.penalty_amount AS penaltyAmount,
              pi.bonus_amount AS bonusAmount,
              pi.advance_amount AS advanceAmount,
              pi.net_pay AS netPay,
              pi.note
       FROM payroll_items pi
       JOIN payrolls p ON p.payroll_id = pi.payroll_id
       JOIN employees e ON e.employee_id = pi.employee_id
       LEFT JOIN users u ON u.employee_id = e.employee_id AND u.is_deleted = 0
       LEFT JOIN roles r ON r.role_id = u.role_id
       WHERE pi.employee_id = @empId
         AND p.period_month = @month AND p.period_year = @year
         AND p.status IN ('APPROVED', 'PAID')`,
      {
        empId: [sql.Int, employeeId],
        month: [sql.Int, month],
        year: [sql.Int, year],
      },
      exec,
    );
    if (!r.recordset[0]) return null;
    const row = r.recordset[0];
    return {
      ...row,
      standardWorkDays: Number(row.standardWorkDays),
      actualWorkDays: Number(row.actualWorkDays),
      actualWorkHours: Number(row.actualWorkHours),
      baseSalaryOrRate: Number(row.baseSalaryOrRate),
      basePay: Number(row.basePay),
      salesRevenue: Number(row.salesRevenue),
      commissionRate: Number(row.commissionRate),
      commissionAmount: Number(row.commissionAmount),
      kpiBonus: Number(row.kpiBonus),
      allowanceAmount: Number(row.allowanceAmount),
      penaltyAmount: Number(row.penaltyAmount),
      bonusAmount: Number(row.bonusAmount),
      advanceAmount: Number(row.advanceAmount),
      netPay: Number(row.netPay),
    };
  },
};
