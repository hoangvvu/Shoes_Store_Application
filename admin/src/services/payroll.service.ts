import { api } from './api';
import type { Payroll, PayrollDetailResponse, PayrollItem } from '../types/payroll';

export const payrollService = {
  async list(): Promise<Payroll[]> {
    const res = await api.get<{ success: boolean; data: Payroll[] }>('/payrolls');
    return res.data.data;
  },

  async getDetail(id: number): Promise<PayrollDetailResponse> {
    const res = await api.get<{ success: boolean; data: PayrollDetailResponse }>(`/payrolls/${id}`);
    return res.data.data;
  },

  async generate(month: number, year: number): Promise<PayrollDetailResponse> {
    const res = await api.post<{ success: boolean; data: PayrollDetailResponse }>('/payrolls/generate', { month, year });
    return res.data.data;
  },

  async updateItem(
    payrollId: number,
    itemId: number,
    payload: {
      bonusAmount?: number;
      penaltyAmount?: number;
      advanceAmount?: number;
      kpiBonus?: number;
      allowanceAmount?: number;
      note?: string;
    },
  ): Promise<PayrollDetailResponse> {
    const res = await api.put<{ success: boolean; data: PayrollDetailResponse }>(`/payrolls/${payrollId}/items/${itemId}`, payload);
    return res.data.data;
  },

  async approve(id: number): Promise<PayrollDetailResponse> {
    const res = await api.post<{ success: boolean; data: PayrollDetailResponse }>(`/payrolls/${id}/approve`);
    return res.data.data;
  },

  async markPaid(id: number): Promise<PayrollDetailResponse> {
    const res = await api.post<{ success: boolean; data: PayrollDetailResponse }>(`/payrolls/${id}/pay`);
    return res.data.data;
  },

  async getMyPayslip(month?: number, year?: number): Promise<PayrollItem> {
    const res = await api.get<{ success: boolean; data: PayrollItem }>('/payrolls/my-payslip', {
      params: { month, year },
    });
    return res.data.data;
  },
};
