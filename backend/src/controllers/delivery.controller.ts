import type { Request, Response } from 'express';
import { deliveryService } from '../services/delivery.service';

const id = (req: Request) => Number(req.params.id);

export const deliveryController = {
  async list(_req: Request, res: Response) {
    res.json(await deliveryService.listShipping());
  },
  async get(req: Request, res: Response) {
    res.json(await deliveryService.getDetail(id(req)));
  },
  async confirmPayment(req: Request, res: Response) {
    res.json(await deliveryService.confirmPayment(req.user!, id(req), Number(req.params.paymentId), req.body));
  },
  async deliver(req: Request, res: Response) {
    res.json(await deliveryService.deliver(req.user!, id(req)));
  },
};
