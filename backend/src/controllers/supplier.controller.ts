import type { Request, Response } from 'express';
import { supplierService } from '../services/supplier.service';
import type { SupplierListQuery } from '../validators/inventory.validator';

export const supplierController = {
  async list(req: Request, res: Response) {
    res.json(await supplierService.list(req.query as unknown as SupplierListQuery));
  },

  async get(req: Request, res: Response) {
    res.json(await supplierService.getDetail(Number(req.params.id)));
  },

  async create(req: Request, res: Response) {
    res.status(201).json(await supplierService.create(req.user!, req.body));
  },

  async update(req: Request, res: Response) {
    res.json(await supplierService.update(req.user!, Number(req.params.id), req.body));
  },

  async remove(req: Request, res: Response) {
    await supplierService.remove(req.user!, Number(req.params.id));
    res.status(204).end();
  },
};
