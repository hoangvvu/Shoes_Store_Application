import type { Request, Response } from 'express';
import { productService } from '../services/product.service';
import type { ProductListQuery } from '../validators/product.validator';

export const productController = {
  async list(req: Request, res: Response) {
    res.json(await productService.list(req.query as unknown as ProductListQuery, req.user));
  },

  async get(req: Request, res: Response) {
    res.json(await productService.getDetail(Number(req.params.id)));
  },

  async create(req: Request, res: Response) {
    res.status(201).json(await productService.create(req.user!, req.body));
  },

  async update(req: Request, res: Response) {
    res.json(await productService.update(req.user!, Number(req.params.id), req.body));
  },

  async setActive(req: Request, res: Response) {
    await productService.setActive(req.user!, Number(req.params.id), req.body.isActive);
    res.status(204).end();
  },

  async remove(req: Request, res: Response) {
    await productService.remove(req.user!, Number(req.params.id));
    res.status(204).end();
  },

  async bulkVariants(req: Request, res: Response) {
    res.json(await productService.bulkVariants(req.user!, Number(req.params.id), req.body));
  },

  async updateVariant(req: Request, res: Response) {
    res.json(await productService.updateVariant(req.user!, Number(req.params.id), req.body));
  },

  async removeVariant(req: Request, res: Response) {
    await productService.removeVariant(req.user!, Number(req.params.id));
    res.status(204).end();
  },
};
