import type { Request, Response } from 'express';
import { addressService } from '../services/address.service';

export const addressController = {
  async list(req: Request, res: Response) {
    res.json(await addressService.list(req.user!));
  },
  async create(req: Request, res: Response) {
    res.status(201).json(await addressService.create(req.user!, req.body));
  },
  async update(req: Request, res: Response) {
    res.json(await addressService.update(req.user!, Number(req.params.id), req.body));
  },
  async remove(req: Request, res: Response) {
    await addressService.remove(req.user!, Number(req.params.id));
    res.status(204).end();
  },
  async setDefault(req: Request, res: Response) {
    res.json(await addressService.setDefault(req.user!, Number(req.params.id)));
  },
};
