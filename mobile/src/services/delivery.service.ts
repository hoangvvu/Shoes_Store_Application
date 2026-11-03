import { api } from './api';

export type DeliveryMethodCode = 'CASH' | 'BANK_QR' | 'BANK_TRANSFER' | 'MOMO';

export const deliveryService = {
  async getOrder(id: number | string) {
    const { data } = await api.get(`/delivery/orders/${id}`);
    return data;
  },
  /** Xác nhận đã thu tiền kèm hình thức thực tế (tiền mặt / QR / MoMo). */
  async confirmPayment(orderId: number | string, paymentId: number, methodCode: DeliveryMethodCode, transactionCode?: string) {
    const { data } = await api.post(`/delivery/orders/${orderId}/payments/${paymentId}/confirm`, {
      methodCode,
      ...(transactionCode ? { transactionCode } : {}),
    });
    return data;
  },
  async deliver(orderId: number | string): Promise<void> {
    await api.post(`/delivery/orders/${orderId}/deliver`);
  },
};
