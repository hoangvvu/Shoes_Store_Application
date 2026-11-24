export type NotificationType = 'SYSTEM' | 'PROMOTION' | 'ORDER' | 'OTHER';
export type NotificationTargetType = 'ALL' | 'SELECTED';

export interface NotificationItem {
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

export interface NotificationRecipient {
  customerId: number;
  customerName: string;
  customerPhone: string | null;
  isRead: boolean;
  readAt: string | null;
}

export interface NotificationDetail extends NotificationItem {
  recipients?: NotificationRecipient[];
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

export interface NotificationFilters {
  q: string;
  type: string;
}
