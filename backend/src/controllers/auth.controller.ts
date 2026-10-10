import type { Request, Response } from 'express';
import { authService } from '../services/auth.service';

const clientIp = (req: Request) => req.ip ?? req.socket.remoteAddress ?? 'unknown';

export const authController = {
  async register(req: Request, res: Response) {
    res.status(201).json(await authService.register(req.body));
  },
  async login(req: Request, res: Response) {
    res.json(await authService.login(req.body, clientIp(req)));
  },
  async refresh(req: Request, res: Response) {
    res.json(await authService.refresh(req.body.refreshToken));
  },
  /** Token là stateless nên client tự xóa token; endpoint này để thống nhất luồng và mở rộng thu hồi sau. */
  async logout(_req: Request, res: Response) {
    res.status(204).end();
  },
  async changePassword(req: Request, res: Response) {
    await authService.changePassword(req.user!.userId, req.body.oldPassword, req.body.newPassword);
    res.json({ message: 'Đổi mật khẩu thành công' });
  },
  async forgot(req: Request, res: Response) {
    await authService.forgotPassword(req.body.username);
    res.json({ message: 'Nếu tài khoản tồn tại, mã xác nhận đã được gửi tới số điện thoại đã đăng ký' });
  },
  async reset(req: Request, res: Response) {
    await authService.resetPassword(req.body.username, req.body.otp, req.body.newPassword, clientIp(req));
    res.json({ message: 'Đặt lại mật khẩu thành công' });
  },
};
