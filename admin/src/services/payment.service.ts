import { api } from './api';
import type { PaymentMethod, Payment, Refund } from '../types/payment';

export const paymentService = {
  // ─── Payment Methods ───────────────────────────────────────────
  async listMethods(all = true): Promise<PaymentMethod[]> {
    const { data } = await api.get<PaymentMethod[]>('/payment-methods', {
      params: all ? { all: '1' } : {},
    });
    return data;
  },

  async createMethod(payload: { methodCode: string; methodName: string; isOnline?: boolean }): Promise<{ methodId: number }> {
    const { data } = await api.post<{ methodId: number }>('/payment-methods', payload);
    return data;
  },

  async setActive(methodId: number, isActive: boolean): Promise<{ success: boolean }> {
    const { data } = await api.patch<{ success: boolean }>(`/payment-methods/${methodId}/active`, { isActive });
    return data;
  },

  async removeMethod(methodId: number): Promise<{ success: boolean }> {
    const { data } = await api.delete<{ success: boolean }>(`/payment-methods/${methodId}`);
    return data;
  },

  // ─── Payments Actions ──────────────────────────────────────────
  async getOrderPayments(orderId: number): Promise<{ invoiceId: number; payments: Payment[]; refunds: Refund[] }> {
    const { data } = await api.get<{ invoiceId: number; payments: Payment[]; refunds: Refund[] }>(`/orders/${orderId}/payment`);
    return data;
  },

  async confirmCash(paymentId: number): Promise<{ paymentId: number; status: string }> {
    const { data } = await api.post<{ paymentId: number; status: string }>(`/payments/${paymentId}/confirm-cash`);
    return data;
  },

  async reviewProof(paymentId: number, status: 'SUCCESS' | 'FAILED', note: string): Promise<{ paymentId: number; status: string }> {
    const { data } = await api.post<{ paymentId: number; status: string }>(`/payments/${paymentId}/review`, { status, note });
    return data;
  },

  // ─── Refunds ───────────────────────────────────────────────────
  async createRefund(payload: { invoiceId: number; amount: number; reason: string }): Promise<{ refundId: number }> {
    const { data } = await api.post<{ refundId: number }>('/refunds', payload);
    return data;
  },

  async completeRefund(refundId: number, payload?: { transId?: string; note?: string }): Promise<{ refundId: number; status: string }> {
    const { data } = await api.post<{ refundId: number; status: string }>(`/refunds/${refundId}/complete`, payload ?? {});
    return data;
  },

  async rejectRefund(refundId: number, note: string): Promise<{ refundId: number; status: string }> {
    const { data } = await api.post<{ refundId: number; status: string }>(`/refunds/${refundId}/reject`, { note });
    return data;
  },

  async listRefunds(params?: { invoiceId?: number; status?: string }): Promise<Refund[]> {
    const { data } = await api.get<Refund[]>('/refunds', { params });
    return data;
  },
};
