import type { Request, Response } from 'express';
import { receiptService } from '../services/receipt.service';
import type { ReceiptListQuery } from '../validators/inventory.validator';

export const receiptController = {
  async list(req: Request, res: Response) {
    res.json(await receiptService.list(req.query as unknown as ReceiptListQuery));
  },

  async get(req: Request, res: Response) {
    res.json(await receiptService.getDetail(Number(req.params.id)));
  },

  async create(req: Request, res: Response) {
    res.status(201).json(await receiptService.create(req.user!, req.body));
  },

  async remove(req: Request, res: Response) {
    await receiptService.remove(req.user!, Number(req.params.id), req.body?.reason);
    res.status(204).end();
  },
};
