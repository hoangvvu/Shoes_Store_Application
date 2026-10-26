import type { EmploymentType } from './employee';

export type PayrollStatus = 'DRAFT' | 'APPROVED' | 'PAID';

export interface Payroll {
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
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  itemCount?: number;
}

export interface PayrollItem {
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
  payroll: Payroll;
  items: PayrollItem[];
}
