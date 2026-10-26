import type { Request, Response } from 'express';
import { payrollService } from '../services/payroll.service';

export const payrollController = {
  async list(_req: Request, res: Response) {
    const data = await payrollService.list();
    res.json({ success: true, data });
  },

  async getDetail(req: Request, res: Response) {
    const data = await payrollService.getDetail(Number(req.params.id));
    res.json({ success: true, data });
  },

  async generate(req: Request, res: Response) {
    const data = await payrollService.generate(req.user!, req.body);
    res.status(201).json({ success: true, message: 'Tính bảng lương thành công', data });
  },

  async updateItem(req: Request, res: Response) {
    const payrollId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const data = await payrollService.updateItem(payrollId, itemId, req.body);
    res.json({ success: true, message: 'Cập nhật mục lương thành công', data });
  },

  async approve(req: Request, res: Response) {
    const payrollId = Number(req.params.id);
    const data = await payrollService.approve(req.user!, payrollId);
    res.json({ success: true, message: 'Phê duyệt bảng lương thành công', data });
  },

  async markPaid(req: Request, res: Response) {
    const payrollId = Number(req.params.id);
    const data = await payrollService.markPaid(payrollId);
    res.json({ success: true, message: 'Đánh dấu đã thanh toán lương thành công', data });
  },

  async myPayslip(req: Request, res: Response) {
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const data = await payrollService.getMyPayslip(req.user!, month, year);
    res.json({ success: true, data });
  },
};
