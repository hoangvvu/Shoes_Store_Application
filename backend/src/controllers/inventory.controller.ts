import type { Request, Response } from 'express';
import { inventoryService } from '../services/inventory.service';
import type { LedgerQuery, LowStockQuery, StockListQuery } from '../validators/inventory.validator';

export const inventoryController = {
  async list(req: Request, res: Response) {
    res.json(await inventoryService.list(req.query as unknown as StockListQuery));
  },

  async lowStock(req: Request, res: Response) {
    const q = req.query as unknown as LowStockQuery;
    res.json(await inventoryService.lowStock(q.threshold));
  },

  async ledger(req: Request, res: Response) {
    res.json(await inventoryService.ledger(Number(req.params.id), req.query as unknown as LedgerQuery));
  },

  async adjust(req: Request, res: Response) {
    await inventoryService.adjust(req.user!, req.body);
    res.status(204).end();
  },
};
