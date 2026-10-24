import type {
  PaymentMethod,
  PaymentStatusResult,
  RetryPayResult,
} from '@/types/payment';
import { api } from './api';

export const paymentService = {
  /** M9 #1 – Danh sách hình thức thanh toán đang bật */
  async listMethods(): Promise<PaymentMethod[]> {
    const { data } = await api.get<PaymentMethod[]>('/payment-methods');
    return data;
  },

  /** M9 #6 – Xem trạng thái thanh toán của một đơn hàng */
  async getPaymentStatus(orderId: number): Promise<PaymentStatusResult> {
    const { data } = await api.get<PaymentStatusResult>(`/orders/${orderId}/payment`);
    return data;
  },

  /** M9 #3 – Tải ảnh chứng từ chuyển khoản thủ công */
  async uploadProof(paymentId: number, proofUrl: string): Promise<{ paymentId: number; proofUrl: string }> {
    const { data } = await api.post(`/payments/${paymentId}/proof`, { proofUrl });
    return data;
  },

  /** M9 #7 – Thanh toán lại sau khi FAILED */
  async retryPay(orderId: number, methodCode: string): Promise<RetryPayResult> {
    const { data } = await api.post<RetryPayResult>(`/orders/${orderId}/pay`, { methodCode });
    return data;
  },

  /** Giả lập webhook xác nhận thanh toán thành công (dành cho test/demo) */
  async simulateSuccess(paymentId: number, amount: number): Promise<void> {
    await api.post('/webhooks/bank', {
      paymentId,
      transactionCode: `TEST_BANK_${Date.now()}`,
      amount,
      resultCode: 0,
    });
  },
};
