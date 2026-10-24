import type { Paged } from '../types/customer';
import type { InvoiceListParams, InvoiceSummary, OrderDetail, OrderListItem } from '../types/order';
import { api } from './api';

export const invoiceService = {
  async list(p: InvoiceListParams): Promise<Paged<OrderListItem> & { summary?: InvoiceSummary }> {
    const { data } = await api.get<Paged<OrderListItem> & { summary?: InvoiceSummary }>('/invoices', {
      params: { ...p, type: p.type || undefined, channel: p.channel || undefined, from: p.from || undefined, to: p.to || undefined, q: p.q || undefined },
    });
    return data;
  },
  async get(id: number): Promise<OrderDetail> {
    const { data } = await api.get<OrderDetail>(`/invoices/${id}`);
    return data;
  },
  async printHtml(id: number): Promise<string> {
    const { data } = await api.get<string>(`/invoices/${id}/print`, { responseType: 'text', transformResponse: (d) => d });
    return data;
  },
};
