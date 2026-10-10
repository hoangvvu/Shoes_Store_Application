import type { Address, AddressInput } from '@/types/address';
import { api } from './api';

export const addressService = {
  async list(): Promise<Address[]> {
    const { data } = await api.get<Address[]>('/me/addresses');
    return data;
  },
  async create(input: AddressInput): Promise<Address> {
    const { data } = await api.post<Address>('/me/addresses', input);
    return data;
  },
  async update(id: number, input: Partial<AddressInput>): Promise<Address> {
    const { data } = await api.put<Address>(`/me/addresses/${id}`, input);
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/me/addresses/${id}`);
  },
  async setDefault(id: number): Promise<Address> {
    const { data } = await api.patch<Address>(`/me/addresses/${id}/default`);
    return data;
  },
};
