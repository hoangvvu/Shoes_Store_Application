import type { Paged } from '../types/customer';
import type { OrderDetail, OrderListItem, OrderListParams } from '../types/order';
import { api } from './api';

export const orderService = {
  async list(p: OrderListParams): Promise<Paged<OrderListItem>> {
    const { data } = await api.get<Paged<OrderListItem>>('/orders', {
      params: { ...p, status: p.status || undefined, channel: p.channel || undefined, from: p.from || undefined, to: p.to || undefined, q: p.q || undefined },
    });
    return data;
  },
  async get(id: number): Promise<OrderDetail> {
    const { data } = await api.get<OrderDetail>(`/orders/${id}`);
    return data;
  },
  async confirm(id: number, note?: string): Promise<OrderDetail> {
    const { data } = await api.post<OrderDetail>(`/orders/${id}/confirm`, { note });
    return data;
  },
  async ship(id: number, note?: string): Promise<OrderDetail> {
    const { data } = await api.post<OrderDetail>(`/orders/${id}/ship`, { note });
    return data;
  },
  async deliver(id: number, note?: string): Promise<OrderDetail> {
    const { data } = await api.post<OrderDetail>(`/orders/${id}/deliver`, { note });
    return data;
  },
  async cancel(id: number, reason: string): Promise<OrderDetail> {
    const { data } = await api.post<OrderDetail>(`/orders/${id}/cancel`, { reason });
    return data;
  },
  async editItems(id: number, items: { variantId: number; quantity: number }[]): Promise<OrderDetail> {
    const { data } = await api.put<OrderDetail>(`/orders/${id}/items`, { items });
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/orders/${id}`);
  },
  async printHtml(id: number, type: 'invoice' | 'delivery'): Promise<string> {
    const { data } = await api.get<string>(`/orders/${id}/print`, { params: { type }, responseType: 'text', transformResponse: (d) => d });
    return data;
  },
};
