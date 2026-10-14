import type { CreateOrderPayload, OrderDetail, OrderListItem, OrderPreview, OrderStatus, Paged, ReorderResult } from '@/types/order';
import { api } from './api';

export const orderService = {
  async preview(voucherCode?: string): Promise<OrderPreview> {
    const { data } = await api.post<OrderPreview>('/orders/preview', { voucherCode: voucherCode || undefined });
    return data;
  },
  async create(p: CreateOrderPayload): Promise<OrderDetail> {
    const { data } = await api.post<OrderDetail>('/orders', p);
    return data;
  },
  async listMine(params: { status?: OrderStatus; page: number; size: number }): Promise<Paged<OrderListItem>> {
    const { data } = await api.get<Paged<OrderListItem>>('/me/orders', { params });
    return data;
  },
  async get(id: number): Promise<OrderDetail> {
    const { data } = await api.get<OrderDetail>(`/orders/${id}`);
    return data;
  },
  async cancel(id: number, reason?: string): Promise<OrderDetail> {
    const { data } = await api.post<OrderDetail>(`/orders/${id}/cancel`, { reason });
    return data;
  },
  async reorder(id: number): Promise<ReorderResult> {
    const { data } = await api.post<ReorderResult>(`/orders/${id}/reorder`);
    return data;
  },
};
