import type { Request, Response } from 'express';
import { cartService } from '../services/cart.service';

export const cartController = {
  async get(req: Request, res: Response) {
    res.json(await cartService.getCart(req.user!));
  },
  async addItem(req: Request, res: Response) {
    res.json(await cartService.addItem(req.user!, req.body.variantId, req.body.quantity));
  },
  async updateItem(req: Request, res: Response) {
    res.json(await cartService.updateQuantity(req.user!, Number(req.params.variantId), req.body.quantity));
  },
  async removeItem(req: Request, res: Response) {
    res.json(await cartService.removeItem(req.user!, Number(req.params.variantId)));
  },
  async clear(req: Request, res: Response) {
    res.json(await cartService.clear(req.user!));
  },
  async validate(req: Request, res: Response) {
    res.json(await cartService.validate(req.user!, req.body.removeUnavailable));
  },
};
