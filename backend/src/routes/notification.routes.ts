import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { notificationController as c } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import {
  adminNotificationQuerySchema,
  createNotificationSchema,
  customerNotificationQuerySchema,
  notificationIdParamSchema,
} from '../validators/notification.validator';

/* ==========================================
 * Router dành cho Khách hàng: /api/v1/me/notifications
 * ========================================== */
export const customerNotificationRouter = Router();
customerNotificationRouter.use(authenticate, requireRole(ROLES.CUSTOMER));

// 1. Số lượng thông báo chưa đọc
customerNotificationRouter.get('/unread-count', h(c.countUnread));

// 2. Danh sách thông báo của khách
customerNotificationRouter.get('/', validate(customerNotificationQuerySchema, 'query'), h(c.listCustomer));

// 3. Đánh dấu đã đọc tất cả
customerNotificationRouter.patch('/read-all', h(c.markAllAsRead));

// 4. Đánh dấu 1 thông báo là đã đọc
customerNotificationRouter.patch('/:id/read', validate(notificationIdParamSchema, 'params'), h(c.markAsRead));

// 5. Khách xóa mềm thông báo khỏi hộp thư của mình
customerNotificationRouter.delete('/:id', validate(notificationIdParamSchema, 'params'), h(c.deleteCustomer));

/* ==========================================
 * Router dành cho Quản trị viên: /api/v1/notifications
 * ========================================== */
export const adminNotificationRouter = Router();
adminNotificationRouter.use(authenticate, requireRole(ROLES.ADMIN));

// 1. Soạn và gửi thông báo mới
adminNotificationRouter.post('/', validate(createNotificationSchema, 'body'), h(c.create));

// 2. Lịch sử thông báo đã gửi
adminNotificationRouter.get('/', validate(adminNotificationQuerySchema, 'query'), h(c.listAdmin));

// 3. Chi tiết 1 thông báo
adminNotificationRouter.get('/:id', validate(notificationIdParamSchema, 'params'), h(c.getAdminDetail));

// 4. Xóa mềm thông báo
adminNotificationRouter.delete('/:id', validate(notificationIdParamSchema, 'params'), h(c.deleteAdmin));
