import ExcelJS from 'exceljs';
import { reportRepository } from '../repositories/report.repository';
import type {
  DateRangeQuery,
  RevenueQuery,
  StockReportQuery,
  TopCustomersQuery,
  TopProductsQuery,
} from '../validators/report.validator';

export const reportService = {
  async getRevenue(q: RevenueQuery) {
    return reportRepository.getRevenue(q.from, q.to, q.groupBy);
  },

  async getTopProducts(q: TopProductsQuery) {
    return reportRepository.getTopProducts(q.from, q.to, q.limit, q.by);
  },

  async getOrders(q: DateRangeQuery) {
    return reportRepository.getOrdersReport(q.from, q.to);
  },

  async getStock(q: StockReportQuery) {
    const res = await reportRepository.getStockReport(q.threshold, q.staleDays);
    return {
      lowStock: res.lowStock.map((s) => ({
        ...s,
        lastMovementAt: s.lastMovementAt ? s.lastMovementAt.toISOString() : null,
      })),
      staleStock: res.staleStock.map((s) => ({
        ...s,
        lastMovementAt: s.lastMovementAt ? s.lastMovementAt.toISOString() : null,
      })),
    };
  },

  async getInventoryMovement(q: DateRangeQuery) {
    return reportRepository.getInventoryMovement(q.from, q.to);
  },

  async getTopCustomers(q: TopCustomersQuery) {
    return reportRepository.getTopCustomers(q.from, q.to, q.limit);
  },

  async getEmployeeSales(q: DateRangeQuery) {
    return reportRepository.getEmployeeSales(q.from, q.to);
  },

  async getReturns(q: DateRangeQuery) {
    return reportRepository.getReturns(q.from, q.to);
  },

  async exportExcel(key: string, queryParams: Record<string, unknown>): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ShoeStore System';
    workbook.created = new Date();

    const from = (queryParams.from as string) || '';
    const to = (queryParams.to as string) || '';

    switch (key) {
      case 'revenue': {
        const data = await this.getRevenue({
          from,
          to,
          groupBy: (queryParams.groupBy as 'day' | 'month') || 'day',
        });
        const sheet = workbook.addWorksheet('Doanh thu');
        sheet.columns = [
          { header: 'Kỳ / Thời gian', key: 'period', width: 16 },
          { header: 'Số đơn đã giao', key: 'orders', width: 16 },
          { header: 'Doanh thu gộp (VNĐ)', key: 'grossRevenue', width: 22 },
          { header: 'Hoàn tiền (VNĐ)', key: 'refunded', width: 18 },
          { header: 'Doanh thu thuần (VNĐ)', key: 'netRevenue', width: 22 },
        ];
        data.forEach((r) => sheet.addRow(r));
        break;
      }

      case 'top-products': {
        const data = await this.getTopProducts({
          from,
          to,
          limit: Number(queryParams.limit) || 10,
          by: (queryParams.by as 'quantity' | 'revenue') || 'quantity',
        });
        const sheet = workbook.addWorksheet('Sản phẩm bán chạy');
        sheet.columns = [
          { header: 'Mã SP', key: 'productId', width: 10 },
          { header: 'Tên sản phẩm', key: 'productName', width: 35 },
          { header: 'Số lượng bán', key: 'quantity', width: 16 },
          { header: 'Doanh thu (VNĐ)', key: 'revenue', width: 22 },
        ];
        data.forEach((r) => sheet.addRow(r));
        break;
      }

      case 'orders': {
        const data = await this.getOrders({ from, to });
        const sheet = workbook.addWorksheet('Trạng thái đơn');
        sheet.columns = [
          { header: 'Trạng thái', key: 'status', width: 20 },
          { header: 'Số lượng đơn', key: 'count', width: 16 },
        ];
        data.byStatus.forEach((r) => sheet.addRow(r));
        sheet.addRow({});
        sheet.addRow({ status: 'Đơn chờ xử lý quá 24h', count: data.overduePending });
        break;
      }

      case 'stock': {
        const data = await this.getStock({
          threshold: Number(queryParams.threshold) || 5,
          staleDays: Number(queryParams.staleDays) || 30,
        });
        const sheetLow = workbook.addWorksheet('Sắp hết hàng');
        sheetLow.columns = [
          { header: 'Mã biến thể', key: 'variantId', width: 12 },
          { header: 'SKU', key: 'sku', width: 20 },
          { header: 'Tên sản phẩm', key: 'productName', width: 35 },
          { header: 'Size', key: 'sizeLabel', width: 10 },
          { header: 'Màu', key: 'colorName', width: 15 },
          { header: 'Tồn kho', key: 'stockQuantity', width: 12 },
          { header: 'Lần biến động cuối', key: 'lastMovementAt', width: 22 },
        ];
        data.lowStock.forEach((r) => sheetLow.addRow(r));

        const sheetStale = workbook.addWorksheet('Tồn lâu');
        sheetStale.columns = sheetLow.columns;
        data.staleStock.forEach((r) => sheetStale.addRow(r));
        break;
      }

      case 'inventory-movement': {
        const data = await this.getInventoryMovement({ from, to });
        const sheet = workbook.addWorksheet('Nhập xuất tồn');
        sheet.columns = [
          { header: 'Mã biến thể', key: 'variantId', width: 12 },
          { header: 'SKU', key: 'sku', width: 20 },
          { header: 'Tên sản phẩm', key: 'productName', width: 35 },
          { header: 'Size', key: 'sizeLabel', width: 10 },
          { header: 'Màu', key: 'colorName', width: 15 },
          { header: 'Tồn đầu', key: 'openingStock', width: 12 },
          { header: 'Nhập trong kỳ', key: 'imported', width: 14 },
          { header: 'Xuất trong kỳ', key: 'exported', width: 14 },
          { header: 'Tồn cuối', key: 'closingStock', width: 12 },
        ];
        data.forEach((r) => sheet.addRow(r));
        break;
      }

      case 'top-customers': {
        const data = await this.getTopCustomers({
          from,
          to,
          limit: Number(queryParams.limit) || 10,
        });
        const sheet = workbook.addWorksheet('Khách hàng hàng đầu');
        sheet.columns = [
          { header: 'Mã KH', key: 'customerId', width: 10 },
          { header: 'Họ và tên', key: 'fullName', width: 25 },
          { header: 'Số điện thoại', key: 'phone', width: 16 },
          { header: 'Số đơn hoàn tất', key: 'orders', width: 16 },
          { header: 'Tổng tiền mua (VNĐ)', key: 'totalPurchased', width: 22 },
        ];
        data.forEach((r) => sheet.addRow(r));
        break;
      }

      case 'employees': {
        const data = await this.getEmployeeSales({ from, to });
        const sheet = workbook.addWorksheet('Doanh số nhân viên');
        sheet.columns = [
          { header: 'Mã NV', key: 'employeeId', width: 10 },
          { header: 'Họ và tên', key: 'fullName', width: 25 },
          { header: 'Số đơn đã giao', key: 'orders', width: 16 },
          { header: 'Doanh thu (VNĐ)', key: 'revenue', width: 22 },
        ];
        data.forEach((r) => sheet.addRow(r));
        break;
      }

      case 'returns': {
        const data = await this.getReturns({ from, to });
        const sheet = workbook.addWorksheet('Tỷ lệ trả hàng');
        sheet.columns = [
          { header: 'Mã SP', key: 'productId', width: 10 },
          { header: 'Tên sản phẩm', key: 'productName', width: 35 },
          { header: 'Số lượng bán', key: 'soldQuantity', width: 14 },
          { header: 'Số lượng trả', key: 'returnedQuantity', width: 14 },
          { header: 'Giá trị trả (VNĐ)', key: 'returnedValue', width: 20 },
          { header: 'Tỷ lệ trả (%)', key: 'ratePercent', width: 14 },
        ];
        data.forEach((r) => sheet.addRow(r));
        break;
      }

      default:
        throw new Error(`Loại báo cáo không hỗ trợ: ${key}`);
    }

    // Format all header rows
    workbook.worksheets.forEach((sheet) => {
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  },
};
