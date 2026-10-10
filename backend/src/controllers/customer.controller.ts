import type { Request, Response } from 'express';
import { customerService } from '../services/customer.service';
import type { CustomerListQuery } from '../validators/customer.validator';

export const customerController = {
  async list(req: Request, res: Response) {
    res.json(await customerService.list(req.query as unknown as CustomerListQuery));
  },
  async get(req: Request, res: Response) {
    res.json(await customerService.getDetail(Number(req.params.id)));
  },
  async create(req: Request, res: Response) {
    res.status(201).json(await customerService.create(req.user!, req.body));
  },
  async update(req: Request, res: Response) {
    res.json(await customerService.update(req.user!, Number(req.params.id), req.body));
  },
  async remove(req: Request, res: Response) {
    await customerService.remove(req.user!, Number(req.params.id));
    res.status(204).end();
  },
};
