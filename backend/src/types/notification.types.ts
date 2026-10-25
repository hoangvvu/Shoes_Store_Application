export type NotificationType = 'SYSTEM' | 'PROMOTION' | 'ORDER' | 'OTHER';
export type NotificationTargetType = 'ALL' | 'SELECTED';

export interface CustomerNotificationItem {
  notificationId: number;
  title: string;
  content: string;
  notificationType: NotificationType;
  linkUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface AdminNotificationItem {
  notificationId: number;
  title: string;
  content: string;
  notificationType: NotificationType;
  targetType: NotificationTargetType;
  linkUrl: string | null;
  promotionId: number | null;
  createdAt: string;
  createdBy: number;
  createdByName: string;
  totalRecipients: number;
  readCount: number;
}

export interface AdminNotificationDetail extends AdminNotificationItem {
  recipients?: {
    customerId: number;
    customerName: string;
    customerPhone: string | null;
    isRead: boolean;
    readAt: string | null;
  }[];
}

export interface CreateNotificationInput {
  title: string;
  content: string;
  notificationType: NotificationType;
  targetType: NotificationTargetType;
  linkUrl?: string | null;
  promotionId?: number | null;
  customerIds?: number[];
}
