import type { Request, Response } from 'express';
import { meService } from '../services/me.service';

export const meController = {
  async get(req: Request, res: Response) {
    res.json(await meService.getMe(req.user!));
  },
  async update(req: Request, res: Response) {
    res.json(await meService.updateMe(req.user!, req.body));
  },
};
