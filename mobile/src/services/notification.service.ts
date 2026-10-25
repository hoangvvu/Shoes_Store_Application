import { api } from './api';

export interface NotificationItem {
  notificationId: number;
  title: string;
  content: string;
  notificationType: 'ORDER' | 'SYSTEM' | 'PROMOTION' | 'OTHER';
  linkUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export const notificationService = {
  /** Lấy số lượng thông báo chưa đọc của khách */
  async getUnreadCount(): Promise<number> {
    try {
      const res = await api.get<{ unreadCount?: number; data?: { unreadCount: number } }>(
        '/me/notifications/unread-count',
      );
      return res.data?.unreadCount ?? res.data?.data?.unreadCount ?? 0;
    } catch {
      return 0;
    }
  },

  /** Danh sách thông báo trong hộp thư */
  async list(page = 1, size = 20): Promise<{ items: NotificationItem[]; total: number }> {
    const res = await api.get<{
      items?: NotificationItem[];
      total?: number;
      data?: { items: NotificationItem[]; pagination?: { total: number }; total?: number };
    }>(`/me/notifications?page=${page}&size=${size}`);

    const items = res.data?.items ?? res.data?.data?.items ?? [];
    const total =
      res.data?.total ?? res.data?.data?.pagination?.total ?? res.data?.data?.total ?? items.length;

    return { items, total };
  },

  /** Đánh dấu 1 thông báo là đã đọc */
  async markAsRead(notificationId: number): Promise<void> {
    await api.patch(`/me/notifications/${notificationId}/read`);
  },

  /** Đánh dấu tất cả thông báo là đã đọc */
  async markAllAsRead(): Promise<void> {
    await api.patch('/me/notifications/read-all');
  },

  /** Khách xóa thông báo khỏi hộp thư của mình */
  async deleteNotification(notificationId: number): Promise<void> {
    await api.delete(`/me/notifications/${notificationId}`);
  },
};
