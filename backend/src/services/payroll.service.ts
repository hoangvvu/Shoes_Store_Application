import { withTransaction } from '../config/database';
import { AppError } from '../errors/AppError';
import { attendanceRepository } from '../repositories/attendance.repository';
import { employeeRepository } from '../repositories/employee.repository';
import { payrollRepository } from '../repositories/payroll.repository';
import { reportRepository } from '../repositories/report.repository';
import type { AuthUser } from '../types/express';
import type { PayrollDetailResponse, PayrollItemRow, PayrollRow } from '../types/payroll.types';
import type { GeneratePayrollInput, UpdatePayrollItemInput } from '../validators/payroll.validator';

export const payrollService = {
  async list(): Promise<PayrollRow[]> {
    return payrollRepository.list();
  },

  async getDetail(payrollId: number): Promise<PayrollDetailResponse> {
    const payroll = await payrollRepository.findById(payrollId);
    if (!payroll) throw AppError.notFound('Không tìm thấy kỳ lương');
    const items = await payrollRepository.listItems(payrollId);
    return { payroll, items };
  },

  async generate(actor: AuthUser, input: GeneratePayrollInput): Promise<PayrollDetailResponse> {
    const { month, year } = input;

    // Kiểm tra kỳ lương đã có chưa
    const existing = await payrollRepository.findByPeriod(month, year);
    if (existing) {
      if (existing.status !== 'DRAFT') {
        throw AppError.badRequest(`Kỳ lương tháng ${month}/${year} đã được duyệt hoặc thanh toán, không thể tạo lại`);
      }
      // Xóa DRAFT cũ để tạo lại
      await payrollRepository.delete(existing.payrollId);
    }

    // Xác định khoảng ngày trong tháng
    const lastDay = new Date(year, month, 0).getDate();
    const fromStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const toStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Lấy dữ liệu nguồn
    const { rows: employees } = await employeeRepository.list({ page: 1, size: 1000 });
    const attendanceSummaries = await attendanceRepository.getSummaryByMonth(month, year);
    const attMap = new Map(attendanceSummaries.map((a) => [a.employeeId, a]));

    // Doanh số cá nhân của Sales
    const salesReport = await reportRepository.getEmployeeSales(fromStr, toStr);
    const salesMap = new Map(salesReport.map((s) => [s.employeeId, s.revenue]));

    // Tổng doanh thu cửa hàng trong tháng (để tính quỹ thưởng chung cho kho)
    const revenuePoints = await reportRepository.getRevenue(fromStr, toStr, 'month');
    const totalShopRevenue = revenuePoints.reduce((sum, r) => sum + r.netRevenue, 0);

    // Tính toán cho từng nhân viên
    const payrollId = await payrollRepository.createPayroll({
      periodMonth: month,
      periodYear: year,
      createdBy: actor.employeeId ?? 1,
    });

    const itemsToInsert: Omit<PayrollItemRow, 'itemId' | 'employeeName' | 'role'>[] = [];

    for (const emp of employees) {
      const att = attMap.get(emp.employeeId);
      const actualWorkDays = att?.totalDays ?? 0;
      const actualWorkHours = att?.totalHours ?? 0;
      const lateCount = att?.lateCount ?? 0;

      const isPartTime = emp.employmentType === 'PART_TIME';
      const standardWorkDays = isPartTime ? 0 : 26.0;

      let basePay = 0;
      let baseSalaryOrRate = 0;

      if (isPartTime) {
        baseSalaryOrRate = emp.hourlyRate || 25000; // mặc định nếu chưa set
        basePay = Math.round(actualWorkHours * baseSalaryOrRate);
      } else {
        baseSalaryOrRate = emp.baseSalary;
        basePay = Math.round((emp.baseSalary / 26.0) * actualWorkDays);
      }

      // Doanh số và hoa hồng (chủ yếu là Sales)
      const salesRevenue = salesMap.get(emp.employeeId) ?? 0;
      const commissionRate = emp.commissionRate || 0.01;
      const commissionAmount = Math.round(salesRevenue * commissionRate);

      // Thưởng hiệu suất: nếu là WAREHOUSE -> trích thưởng từ quỹ doanh số hoặc theo ngày công
      let kpiBonus = 0;
      if (emp.role === 'WAREHOUSE') {
        // Ví dụ: thưởng kho 0.2% tổng doanh thu shop chia đều hoặc tính theo công
        if (totalShopRevenue > 0 && actualWorkDays > 0) {
          kpiBonus = Math.round((totalShopRevenue * 0.002) / Math.max(1, employees.filter((e) => e.role === 'WAREHOUSE').length));
        }
      }

      const allowanceAmount = isPartTime ? 0 : (emp.allowance || 0);
      const penaltyAmount = lateCount * 50000; // 50k / lần đi trễ
      const bonusAmount = 0;
      const advanceAmount = 0;

      const netPay = Math.max(0, basePay + commissionAmount + kpiBonus + allowanceAmount + bonusAmount - penaltyAmount - advanceAmount);

      itemsToInsert.push({
        payrollId,
        employeeId: emp.employeeId,
        employmentType: emp.employmentType,
        standardWorkDays,
        actualWorkDays,
        actualWorkHours,
        baseSalaryOrRate,
        basePay,
        salesRevenue,
        commissionRate,
        commissionAmount,
        kpiBonus,
        allowanceAmount,
        penaltyAmount,
        bonusAmount,
        advanceAmount,
        netPay,
        note: lateCount > 0 ? `Đi trễ ${lateCount} lần (-${(lateCount * 50).toLocaleString()}k)` : null,
      });
    }

    await payrollRepository.insertItems(itemsToInsert);

    return this.getDetail(payrollId);
  },

  async updateItem(payrollId: number, itemId: number, input: UpdatePayrollItemInput): Promise<PayrollDetailResponse> {
    const payroll = await payrollRepository.findById(payrollId);
    if (!payroll) throw AppError.notFound('Không tìm thấy kỳ lương');
    if (payroll.status !== 'DRAFT') {
      throw AppError.badRequest('Chỉ có thể điều chỉnh khi bảng lương ở trạng thái Nháp (DRAFT)');
    }

    await payrollRepository.updateItem(itemId, input);
    return this.getDetail(payrollId);
  },

  async approve(actor: AuthUser, payrollId: number): Promise<PayrollDetailResponse> {
    const payroll = await payrollRepository.findById(payrollId);
    if (!payroll) throw AppError.notFound('Không tìm thấy kỳ lương');
    if (payroll.status !== 'DRAFT') {
      throw AppError.badRequest('Bảng lương này đã được duyệt trước đó');
    }

    await payrollRepository.updateStatus(payrollId, 'APPROVED', actor.employeeId ?? 1);
    return this.getDetail(payrollId);
  },

  async markPaid(payrollId: number): Promise<PayrollDetailResponse> {
    const payroll = await payrollRepository.findById(payrollId);
    if (!payroll) throw AppError.notFound('Không tìm thấy kỳ lương');
    if (payroll.status !== 'APPROVED') {
      throw AppError.badRequest('Cần duyệt bảng lương trước khi đánh dấu đã thanh toán');
    }

    await payrollRepository.updateStatus(payrollId, 'PAID');
    return this.getDetail(payrollId);
  },

  async getMyPayslip(user: AuthUser, month?: number, year?: number) {
    if (!user.employeeId) throw AppError.forbidden('Chỉ nhân viên mới có phiếu lương');
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();
    const payslip = await payrollRepository.getMyPayslip(user.employeeId, m, y);
    if (!payslip) {
      throw AppError.notFound(`Chưa có phiếu lương được phê duyệt cho tháng ${m}/${y}`);
    }
    return payslip;
  },
};
