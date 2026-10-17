import type { CustomerDetail, CustomerFilters, CustomerFormValues, CustomerListItem, Paged } from '../types/customer';
import { toApiParams } from '../utils/customerSearch';
import { api } from './api';

export const customerService = {
  /** `filters` là bộ lọc ĐÃ ÁP DỤNG (sau khi bấm "Tìm kiếm"). */
  async list(filters: CustomerFilters, page: number, size: number): Promise<Paged<CustomerListItem>> {
    const { data } = await api.get<Paged<CustomerListItem>>('/customers', { params: { ...toApiParams(filters), page, size } });
    return data;
  },
  async get(id: number): Promise<CustomerDetail> {
    const { data } = await api.get<CustomerDetail>(`/customers/${id}`);
    return data;
  },
  async create(v: CustomerFormValues): Promise<CustomerDetail> {
    const { data } = await api.post<CustomerDetail>('/customers', v);
    return data;
  },
  async update(id: number, v: Partial<CustomerFormValues>): Promise<CustomerDetail> {
    const { data } = await api.put<CustomerDetail>(`/customers/${id}`, v);
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/customers/${id}`);
  },
};
