import type { EmploymentType } from './employee.types';

export type PayrollStatus = 'DRAFT' | 'APPROVED' | 'PAID';

export interface PayrollRow {
  payrollId: number;
  periodMonth: number;
  periodYear: number;
  status: PayrollStatus;
  totalAmount: number;
  totalAdvance?: number;
  createdBy: number;
  createdByName?: string;
  approvedBy: number | null;
  approvedByName?: string;
  approvedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  itemCount?: number;
}

export interface PayrollItemRow {
  itemId: number;
  payrollId: number;
  employeeId: number;
  employeeName?: string;
  role?: string;
  employmentType: EmploymentType;
  standardWorkDays: number;
  actualWorkDays: number;
  actualWorkHours: number;
  baseSalaryOrRate: number;
  basePay: number;
  salesRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  kpiBonus: number;
  allowanceAmount: number;
  penaltyAmount: number;
  bonusAmount: number;
  advanceAmount: number;
  netPay: number;
  note: string | null;
}

export interface PayrollDetailResponse {
  payroll: PayrollRow;
  items: PayrollItemRow[];
}
