import type { Request, Response } from 'express';
import { attendanceService } from '../services/attendance.service';

export const attendanceController = {
  async shifts(_req: Request, res: Response) {
    const data = await attendanceService.listShifts();
    res.json({ success: true, data });
  },

  async status(req: Request, res: Response) {
    const data = await attendanceService.getTodayStatus(req.user!);
    res.json({ success: true, data });
  },

  async checkIn(req: Request, res: Response) {
    const data = await attendanceService.checkIn(req.user!, req.body);
    res.status(201).json({ success: true, message: 'Check-in thành công', data });
  },

  async checkOut(req: Request, res: Response) {
    const data = await attendanceService.checkOut(req.user!, req.body);
    res.json({ success: true, message: 'Check-out thành công', data });
  },

  async myHistory(req: Request, res: Response) {
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const data = await attendanceService.getMyHistory(req.user!, month, year);
    res.json({ success: true, data });
  },

  async adminSummary(req: Request, res: Response) {
    const data = await attendanceService.getAdminSummary(req.query as any);
    res.json({ success: true, data });
  },

  async adjust(req: Request, res: Response) {
    const attendanceId = Number(req.params.id);
    const data = await attendanceService.adjust(req.user!, attendanceId, req.body);
    res.json({ success: true, message: 'Điều chỉnh chấm công thành công', data });
  },

  async mySchedules(req: Request, res: Response) {
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;
    const data = await attendanceService.getMySchedules(req.user!, from, to);
    res.json({ success: true, data });
  },

  async occupancy(req: Request, res: Response) {
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;
    const data = await attendanceService.getOccupancy(req.user!, from, to);
    res.json({ success: true, data });
  },

  async registerShifts(req: Request, res: Response) {
    const data = await attendanceService.registerMyShifts(req.user!, req.body);
    res.json({ success: true, message: 'Đăng ký ca làm việc thành công', data });
  },

  async listSchedules(req: Request, res: Response) {
    const data = await attendanceService.listAllSchedules(req.query as any);
    res.json({ success: true, data });
  },
};
