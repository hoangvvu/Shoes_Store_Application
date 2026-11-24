import { AppError } from '../errors/AppError';
import { notificationRepository } from '../repositories/notification.repository';
import type { AuthUser } from '../types/express';
import type { CreateNotificationInput } from '../types/notification.types';
import { toPaged } from '../utils/pagination';

export const notificationService = {
  /* ===================== DÀNH CHO ADMIN ===================== */

  async createNotification(auth: AuthUser, data: CreateNotificationInput) {
    if (!auth.employeeId) {
      throw AppError.forbidden('Chỉ nhân viên/quản trị viên mới có quyền tạo thông báo');
    }
    const id = await notificationRepository.createNotification(data, auth.employeeId);
    return { notificationId: id, message: 'Đã gửi thông báo thành công' };
  },

  async listAdmin(query: { page: number; size: number; type?: string; search?: string }) {
    const offset = (query.page - 1) * query.size;
    const { items, total } = await notificationRepository.listAdmin({
      type: query.type,
      search: query.search,
      offset,
      limit: query.size,
    });
    return toPaged(items, total, query.page, query.size);
  },

  async getAdminDetail(id: number) {
    const detail = await notificationRepository.getAdminDetail(id);
    if (!detail) {
      throw AppError.notFound('Không tìm thấy thông báo', 'NOTIFICATION_NOT_FOUND');
    }
    return detail;
  },

  async deleteAdmin(id: number) {
    const success = await notificationRepository.softDeleteNotification(id);
    if (!success) {
      throw AppError.notFound('Không tìm thấy thông báo hoặc đã bị xóa', 'NOTIFICATION_NOT_FOUND');
    }
    return { message: 'Đã xóa thông báo thành công' };
  },

  /* ===================== DÀNH CHO KHÁCH HÀNG ===================== */

  async countUnread(auth: AuthUser) {
    if (!auth.customerId) {
      throw AppError.forbidden('Chỉ khách hàng mới có hộp thư thông báo');
    }
    const unreadCount = await notificationRepository.countUnread(auth.customerId);
    return { unreadCount };
  },

  async listForCustomer(auth: AuthUser, page: number, size: number) {
    if (!auth.customerId) {
      throw AppError.forbidden('Chỉ khách hàng mới có hộp thư thông báo');
    }
    const offset = (page - 1) * size;
    const { items, total } = await notificationRepository.listForCustomer(auth.customerId, offset, size);
    return toPaged(items, total, page, size);
  },

  async markAsRead(auth: AuthUser, notificationId: number) {
    if (!auth.customerId) {
      throw AppError.forbidden('Chỉ khách hàng mới có quyền đánh dấu thông báo');
    }
    await notificationRepository.markAsRead(notificationId, auth.customerId);
    return { message: 'Đã đánh dấu đã đọc' };
  },

  async markAllAsRead(auth: AuthUser) {
    if (!auth.customerId) {
      throw AppError.forbidden('Chỉ khách hàng mới có quyền đánh dấu thông báo');
    }
    await notificationRepository.markAllAsRead(auth.customerId);
    return { message: 'Đã đánh dấu tất cả thông báo là đã đọc' };
  },

  async deleteForCustomer(auth: AuthUser, notificationId: number) {
    if (!auth.customerId) {
      throw AppError.forbidden('Chỉ khách hàng mới có quyền xóa thông báo');
    }
    await notificationRepository.softDeleteForCustomer(notificationId, auth.customerId);
    return { message: 'Đã xóa thông báo khỏi hộp thư' };
  },
};
