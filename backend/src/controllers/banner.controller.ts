import type { Request, Response } from 'express';
import { bannerService } from '../services/banner.service';
import type { BannerFilter } from '../types/banner.types';

export const bannerController = {
  async list(req: Request, res: Response) {
    const q = req.query as any;
    const filter: BannerFilter = {
      platform: q.platform,
      position: q.position,
      isActive:
        q.isActive !== undefined
          ? q.isActive === true || q.isActive === 'true' || q.isActive === 1 || q.isActive === '1'
          : undefined,
    };
    const banners = await bannerService.list(filter);
    res.json(banners);
  },

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const banner = await bannerService.getById(id);
    res.json(banner);
  },

  async create(req: Request, res: Response) {
    const userId = (req as any).user?.userId ?? null;
    const banner = await bannerService.create(req.body, userId);
    res.status(201).json(banner);
  },

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const banner = await bannerService.update(id, req.body);
    res.json(banner);
  },

  async remove(req: Request, res: Response) {
    const id = Number(req.params.id);
    await bannerService.remove(id);
    res.status(204).end();
  },
};
