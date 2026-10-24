import type { Request, Response } from 'express';
import { orderService } from '../services/order.service';
import { posService } from '../services/pos.service';
import { runOnce } from '../utils/idempotency';
import type { MyOrdersQuery, OrderListQuery, PosProductQuery } from '../validators/order.validator';

const id = (req: Request) => Number(req.params.id);

export const orderController = {
  // khách
  async preview(req: Request, res: Response) {
    res.json(await orderService.preview(req.user!, req.body.voucherCode));
  },
  async create(req: Request, res: Response) {
    res.status(201).json(await orderService.create(req.user!, req.body));
  },
  async listMine(req: Request, res: Response) {
    res.json(await orderService.listMine(req.user!, req.query as unknown as MyOrdersQuery));
  },
  async reorder(req: Request, res: Response) {
    res.json(await orderService.reorder(req.user!, id(req)));
  },
  // chung
  async get(req: Request, res: Response) {
    res.json(await orderService.getOrder(req.user!, id(req)));
  },
  async cancel(req: Request, res: Response) {
    res.json(await orderService.cancel(req.user!, id(req), req.body.reason));
  },
  // nhân viên / admin
  async list(req: Request, res: Response) {
    res.json(await orderService.list(req.query as unknown as OrderListQuery));
  },
  async confirm(req: Request, res: Response) {
    res.json(await orderService.confirm(req.user!, id(req), req.body.note));
  },
  async ship(req: Request, res: Response) {
    res.json(await orderService.ship(req.user!, id(req), req.body.note));
  },
  async deliver(req: Request, res: Response) {
    res.json(await orderService.deliver(req.user!, id(req), req.body.note));
  },
  async editItems(req: Request, res: Response) {
    res.json(await orderService.editItems(req.user!, id(req), req.body.items));
  },
  async print(req: Request, res: Response) {
    const html = await orderService.renderPrint(req.user!, id(req), (req.query as { type: 'invoice' | 'delivery' }).type);
    res.type('html').send(html);
  },
  async remove(req: Request, res: Response) {
    await orderService.remove(req.user!, id(req));
    res.status(204).end();
  },
  // POS
  async createPos(req: Request, res: Response) {
    // Idempotency-Key do giao diện sinh cho mỗi lần thanh toán: bấm đúp / gửi lại chỉ tạo 1 hóa đơn, 1 giao dịch thu
    const key = req.header('Idempotency-Key')?.trim() || undefined;
    const result = await runOnce(`pos:${req.user!.userId}`, key, req.body, () => orderService.createPos(req.user!, req.body));
    res.status(201).json(result);
  },
  async previewPos(req: Request, res: Response) {
    res.json(await orderService.previewPos(req.body));
  },
  async posProducts(req: Request, res: Response) {
    res.json(await posService.searchProducts(req.query as unknown as PosProductQuery));
  },
  async posPaymentMethods(_req: Request, res: Response) {
    res.json(await posService.paymentMethods());
  },
};
