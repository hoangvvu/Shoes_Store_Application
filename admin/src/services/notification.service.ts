import type { Paged } from '../types/customer';
import type {
  CreateNotificationInput,
  NotificationDetail,
  NotificationItem,
} from '../types/notification';
import { api } from './api';

export interface NotificationListParams {
  page: number;
  size: number;
  type?: string;
  search?: string;
}

export const notificationService = {
  async list(p: NotificationListParams): Promise<Paged<NotificationItem>> {
    const { data } = await api.get<Paged<NotificationItem>>('/notifications', {
      params: {
        page: p.page,
        size: p.size,
        type: p.type || undefined,
        search: p.search ? p.search.trim() : undefined,
      },
    });
    return data;
  },

  async getById(id: number): Promise<NotificationDetail> {
    const { data } = await api.get<NotificationDetail>(`/notifications/${id}`);
    return data;
  },

  async create(payload: CreateNotificationInput): Promise<{ notificationId: number; message: string }> {
    const { data } = await api.post<{ notificationId: number; message: string }>('/notifications', payload);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};
