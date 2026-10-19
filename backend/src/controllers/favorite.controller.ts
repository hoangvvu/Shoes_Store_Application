import type { Request, Response } from 'express';
import { favoriteService } from '../services/favorite.service';

export const favoriteController = {
  async like(req: Request, res: Response) {
    res.json(await favoriteService.like(req.user!, Number(req.params.productId)));
  },
  async unlike(req: Request, res: Response) {
    await favoriteService.unlike(req.user!, Number(req.params.productId));
    res.status(204).end();
  },
  async list(req: Request, res: Response) {
    const { page, size } = req.query as unknown as { page: number; size: number };
    res.json(await favoriteService.list(req.user!, page, size));
  },
};
