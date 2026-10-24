import type { Request, Response } from 'express';
import { invoiceService } from '../services/invoice.service';
import type { InvoiceListQuery } from '../validators/order.validator';

const id = (req: Request) => Number(req.params.id);

export const invoiceController = {
  async list(req: Request, res: Response) {
    res.json(await invoiceService.list(req.user!, req.query as unknown as InvoiceListQuery));
  },
  async get(req: Request, res: Response) {
    res.json(await invoiceService.get(req.user!, id(req)));
  },
  async print(req: Request, res: Response) {
    res.type('html').send(await invoiceService.renderPrint(req.user!, id(req)));
  },
};
