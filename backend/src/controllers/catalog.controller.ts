import type { Request, Response } from 'express';
import { catalogService } from '../services/catalog.service';

export const catalogController = {
  // Categories
  async listCategories(_req: Request, res: Response) {
    res.json(await catalogService.listCategories());
  },
  async createCategory(req: Request, res: Response) {
    res.status(201).json(await catalogService.createCategory(req.body));
  },
  async updateCategory(req: Request, res: Response) {
    res.json(await catalogService.updateCategory(Number(req.params.id), req.body));
  },
  async removeCategory(req: Request, res: Response) {
    await catalogService.removeCategory(Number(req.params.id));
    res.status(204).end();
  },

  // Brands
  async listBrands(_req: Request, res: Response) {
    res.json(await catalogService.listBrands());
  },
  async createBrand(req: Request, res: Response) {
    res.status(201).json(await catalogService.createBrand(req.body));
  },
  async updateBrand(req: Request, res: Response) {
    res.json(await catalogService.updateBrand(Number(req.params.id), req.body));
  },
  async removeBrand(req: Request, res: Response) {
    await catalogService.removeBrand(Number(req.params.id));
    res.status(204).end();
  },

  // Sizes
  async listSizes(_req: Request, res: Response) {
    res.json(await catalogService.listSizes());
  },
  async createSize(req: Request, res: Response) {
    res.status(201).json(await catalogService.createSize(req.body));
  },
  async updateSize(req: Request, res: Response) {
    res.json(await catalogService.updateSize(Number(req.params.id), req.body));
  },
  async removeSize(req: Request, res: Response) {
    await catalogService.removeSize(Number(req.params.id));
    res.status(204).end();
  },

  // Colors
  async listColors(_req: Request, res: Response) {
    res.json(await catalogService.listColors());
  },
  async createColor(req: Request, res: Response) {
    res.status(201).json(await catalogService.createColor(req.body));
  },
  async updateColor(req: Request, res: Response) {
    res.json(await catalogService.updateColor(Number(req.params.id), req.body));
  },
  async removeColor(req: Request, res: Response) {
    await catalogService.removeColor(Number(req.params.id));
    res.status(204).end();
  },
};
