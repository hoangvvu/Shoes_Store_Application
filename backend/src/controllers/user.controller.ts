import type { Request, Response } from 'express';
import { userService } from '../services/user.service';

export const userController = {
  async create(req: Request, res: Response) {
    res.status(201).json(await userService.createEmployeeAccount(req.body, req.user!.userId));
  },
  async lock(req: Request, res: Response) {
    res.json(await userService.setLocked(req.user!.userId, Number(req.params.id), req.body.isLocked));
  },
  async changeRole(req: Request, res: Response) {
    res.json(await userService.changeRole(req.user!.userId, Number(req.params.id), req.body.role));
  },
  async remove(req: Request, res: Response) {
    await userService.softDelete(req.user!.userId, Number(req.params.id));
    res.status(204).end();
  },
};
