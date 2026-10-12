import type { Request, Response } from 'express';
import { reviewService } from '../services/review.service';
import type { ModerationListQuery, ProductReviewsQuery } from '../validators/review.validator';

const id = (req: Request) => Number(req.params.id);

export const reviewController = {
  // khách
  async create(req: Request, res: Response) {
    res.status(201).json(await reviewService.create(req.user!, Number(req.params.productId), req.body));
  },
  async update(req: Request, res: Response) {
    res.json(await reviewService.update(req.user!, id(req), req.body));
  },
  async remove(req: Request, res: Response) {
    await reviewService.remove(req.user!, id(req));
    res.status(204).end();
  },
  async listForProduct(req: Request, res: Response) {
    res.json(await reviewService.listForProduct(req.user!, Number(req.params.productId), req.query as unknown as ProductReviewsQuery));
  },
  // nhân viên / admin
  async listForModeration(req: Request, res: Response) {
    res.json(await reviewService.listForModeration(req.user!, req.query as unknown as ModerationListQuery));
  },
  async setStatus(req: Request, res: Response) {
    res.json(await reviewService.setStatus(req.user!, id(req), req.body.status));
  },
  async addReply(req: Request, res: Response) {
    res.status(201).json(await reviewService.addReply(req.user!, id(req), req.body.content));
  },
  async updateReply(req: Request, res: Response) {
    res.json(await reviewService.updateReply(req.user!, id(req), req.body.content));
  },
  async removeReply(req: Request, res: Response) {
    await reviewService.removeReply(req.user!, id(req));
    res.status(204).end();
  },
};
