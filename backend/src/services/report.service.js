const reportRepository = require('../repositories/report.repository');
const inventoryRepository = require('../repositories/inventory.repository');
const { exportToExcel } = require('../utils/excel.util');

const reportService = {
  async getRevenueReport({ from, to, groupBy = 'day' }) {
    return reportRepository.getRevenue({ from, to, groupBy });
  },

  async getTopProductsReport({ from, to, limit = 10 }) {
    return reportRepository.getTopProducts({ from, to, limit });
  },

  async getOrdersReport({ from, to }) {
    return reportRepository.getOrderSummary({ from, to });
  },

  async getStockReport({ threshold = 10, staleDays = 30 }) {
    return reportRepository.getStockAlerts({ threshold, staleDays });
  },

  async getInventoryMovementReport({ from, to }) {
    if (!from || !to) {
      const now = new Date();
      to = to || now.toISOString();
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      from = from || past.toISOString();
    }
    return inventoryRepository.getInventoryMovement(from, to);
  },

  async getTopCustomersReport({ limit = 10 }) {
    return reportRepository.getTopCustomers({ limit });
  },

  async getEmployeeSalesReport({ from, to }) {
    return reportRepository.getEmployeeSales({ from, to });
  },

  async getReturnRatesReport({ from, to }) {
    return reportRepository.getReturnRates({ from, to });
  },

  /**
   * Export any report data to Excel (.xlsx) file stream
   */
  async exportReportExcel(reportType, queryParams, res) {
    const nowStr = new Date().toISOString().slice(0, 10);

    switch (reportType) {
      case 'revenue': {
        const data = await this.getRevenueReport(queryParams);
        const columns = [
          { header: 'Kỳ (Ngày/Tháng)', key: 'period', width: 18 },
          { header: 'Số Đơn Giao', key: 'totalOrders', width: 15 },
          { header: 'Tổng Tiền Hàng (VNĐ)', key: 'grossTotal', width: 22 },
          { header: 'Khuyến Mãi (VNĐ)', key: 'totalDiscount', width: 20 },
          { header: 'Doanh Thu Gộp (VNĐ)', key: 'grossRevenue', width: 22 },
          { header: 'Hoàn Tiền (VNĐ)', key: 'totalRefunded', width: 18 },
          { header: 'Doanh Thu Thuần (VNĐ)', key: 'netRevenue', width: 24 },
        ];
        return exportToExcel(res, `Bao_Cao_Doanh_Thu_${nowStr}`, 'Doanh Thu', columns, data);
      }

      case 'top-products': {
        const data = await this.getTopProductsReport(queryParams);
        const columns = [
          { header: 'Mã SP', key: 'productId', width: 12 },
          { header: 'Tên Sản Phẩm', key: 'productName', width: 35 },
          { header: 'Danh Mục', key: 'categoryName', width: 20 },
          { header: 'Thương Hiệu', key: 'brandName', width: 20 },
          { header: 'Đơn Giá (VNĐ)', key: 'currentPrice', width: 18 },
          { header: 'Số Lượng Bán', key: 'totalSoldQuantity', width: 16 },
          { header: 'Tổng Doanh Thu (VNĐ)', key: 'totalSalesAmount', width: 24 },
        ];
        return exportToExcel(res, `Top_San_Pham_Ban_Chay_${nowStr}`, 'Top Sản Phẩm', columns, data);
      }

      case 'inventory-movement': {
        const data = await this.getInventoryMovementReport(queryParams);
        const columns = [
          { header: 'Mã Biến Thể', key: 'variantId', width: 14 },
          { header: 'Mã SKU', key: 'sku', width: 24 },
          { header: 'Tên Sản Phẩm', key: 'productName', width: 32 },
          { header: 'Size', key: 'sizeLabel', width: 10 },
          { header: 'Màu Sắc', key: 'colorName', width: 14 },
          { header: 'Tồn Đầu Kỳ', key: 'tonDau', width: 14 },
          { header: 'Nhập Trong Kỳ', key: 'nhap', width: 16 },
          { header: 'Xuất Trong Kỳ', key: 'xuat', width: 16 },
          { header: 'Tồn Cuối Kỳ', key: 'tonCuoi', width: 14 },
        ];
        return exportToExcel(res, `Nhap_Xuat_Ton_${nowStr}`, 'Nhập Xuất Tồn', columns, data);
      }

      case 'top-customers': {
        const data = await this.getTopCustomersReport(queryParams);
        const columns = [
          { header: 'Mã KH', key: 'customerId', width: 12 },
          { header: 'Họ Và Tên', key: 'fullName', width: 28 },
          { header: 'Số Điện Thoại', key: 'phone', width: 18 },
          { header: 'Số Đơn Đã Giao', key: 'totalDeliveredOrders', width: 18 },
          { header: 'Tổng Tiền Đã Mua (VNĐ)', key: 'totalPurchased', width: 25 },
        ];
        return exportToExcel(res, `Khach_Hang_Tieu_Bieu_${nowStr}`, 'Top Khách Hàng', columns, data);
      }

      case 'employees': {
        const data = await this.getEmployeeSalesReport(queryParams);
        const columns = [
          { header: 'Mã NV', key: 'employeeId', width: 12 },
          { header: 'Họ Và Tên', key: 'fullName', width: 28 },
          { header: 'Số Điện Thoại', key: 'phone', width: 18 },
          { header: 'Lương Cơ Bản (VNĐ)', key: 'baseSalary', width: 22 },
          { header: 'Số Đơn Lập', key: 'totalOrders', width: 15 },
          { header: 'Doanh Thu Đạt Được (VNĐ)', key: 'totalRevenue', width: 26 },
        ];
        return exportToExcel(res, `Doanh_So_Nhan_Vien_${nowStr}`, 'Nhân Viên', columns, data);
      }

      case 'returns': {
        const data = await this.getReturnRatesReport(queryParams);
        const columns = [
          { header: 'Mã SP', key: 'productId', width: 12 },
          { header: 'Tên Sản Phẩm', key: 'productName', width: 35 },
          { header: 'Số Lượng Đã Bán', key: 'totalSold', width: 18 },
          { header: 'Số Lượng Trả Lại', key: 'totalReturned', width: 18 },
          { header: 'Tỷ Lệ Trả (%)', key: 'returnRatePercent', width: 16 },
        ];
        return exportToExcel(res, `Ty_Le_Tra_Hang_${nowStr}`, 'Trả Hàng', columns, data);
      }

      default:
        throw new Error(`Loại báo cáo '${reportType}' không hỗ trợ xuất Excel`);
    }
  },
};

module.exports = reportService;
