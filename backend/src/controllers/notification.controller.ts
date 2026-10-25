import type { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';

export const notificationController = {
  /* Admin endpoints */
  async create(req: Request, res: Response) {
    const result = await notificationService.createNotification(req.user!, req.body);
    res.status(201).json(result);
  },

  async listAdmin(req: Request, res: Response) {
    const result = await notificationService.listAdmin(req.query as any);
    res.json(result);
  },

  async getAdminDetail(req: Request, res: Response) {
    const result = await notificationService.getAdminDetail(Number(req.params.id));
    res.json(result);
  },

  async deleteAdmin(req: Request, res: Response) {
    const result = await notificationService.deleteAdmin(Number(req.params.id));
    res.json(result);
  },

  /* Customer endpoints */
  async countUnread(req: Request, res: Response) {
    const result = await notificationService.countUnread(req.user!);
    res.json({
      success: true,
      unreadCount: result.unreadCount,
      data: { unreadCount: result.unreadCount },
    });
  },

  async listCustomer(req: Request, res: Response) {
    const { page, size } = req.query as unknown as { page: number; size: number };
    const result = await notificationService.listForCustomer(req.user!, page, size);
    res.json({
      success: true,
      items: result.items,
      page: result.page,
      size: result.size,
      total: result.total,
      totalPages: result.totalPages,
      data: {
        items: result.items,
        pagination: { page: result.page, size: result.size, total: result.total, totalPages: result.totalPages },
      },
    });
  },

  async markAsRead(req: Request, res: Response) {
    const result = await notificationService.markAsRead(req.user!, Number(req.params.id));
    res.json({ success: true, ...result, data: result });
  },

  async markAllAsRead(req: Request, res: Response) {
    const result = await notificationService.markAllAsRead(req.user!);
    res.json({ success: true, ...result, data: result });
  },

  async deleteCustomer(req: Request, res: Response) {
    const result = await notificationService.deleteForCustomer(req.user!, Number(req.params.id));
    res.json({ success: true, ...result, data: result });
  },
};
