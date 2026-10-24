import type { Request, Response } from 'express';
import { reportService } from '../services/report.service';
import type {
  DateRangeQuery,
  RevenueQuery,
  StockReportQuery,
  TopCustomersQuery,
  TopProductsQuery,
} from '../validators/report.validator';

async function sendExcelOrJson<T>(
  req: Request,
  res: Response,
  key: string,
  getData: () => Promise<T>,
) {
  if (req.query.format === 'xlsx') {
    const buffer = await reportService.exportExcel(key, req.query as Record<string, unknown>);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=bao-cao-${key}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    res.send(buffer);
    return;
  }
  res.json(await getData());
}

export const reportController = {
  async revenue(req: Request, res: Response) {
    await sendExcelOrJson(req, res, 'revenue', () =>
      reportService.getRevenue(req.query as unknown as RevenueQuery),
    );
  },

  async topProducts(req: Request, res: Response) {
    await sendExcelOrJson(req, res, 'top-products', () =>
      reportService.getTopProducts(req.query as unknown as TopProductsQuery),
    );
  },

  async orders(req: Request, res: Response) {
    await sendExcelOrJson(req, res, 'orders', () =>
      reportService.getOrders(req.query as unknown as DateRangeQuery),
    );
  },

  async stock(req: Request, res: Response) {
    await sendExcelOrJson(req, res, 'stock', () =>
      reportService.getStock(req.query as unknown as StockReportQuery),
    );
  },

  async inventoryMovement(req: Request, res: Response) {
    await sendExcelOrJson(req, res, 'inventory-movement', () =>
      reportService.getInventoryMovement(req.query as unknown as DateRangeQuery),
    );
  },

  async topCustomers(req: Request, res: Response) {
    await sendExcelOrJson(req, res, 'top-customers', () =>
      reportService.getTopCustomers(req.query as unknown as TopCustomersQuery),
    );
  },

  async employees(req: Request, res: Response) {
    await sendExcelOrJson(req, res, 'employees', () =>
      reportService.getEmployeeSales(req.query as unknown as DateRangeQuery),
    );
  },

  async returns(req: Request, res: Response) {
    await sendExcelOrJson(req, res, 'returns', () =>
      reportService.getReturns(req.query as unknown as DateRangeQuery),
    );
  },

  async exportByKey(req: Request, res: Response) {
    const key = req.params.key;
    const buffer = await reportService.exportExcel(key, req.query as Record<string, unknown>);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=bao-cao-${key}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    res.send(buffer);
  },
};
