const reportService = require('../services/report.service');
const { sendSuccess } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');

const reportController = {
  getRevenue: asyncHandler(async (req, res) => {
    if (req.query.format === 'xlsx') {
      return reportService.exportReportExcel('revenue', req.query, res);
    }
    const data = await reportService.getRevenueReport(req.query);
    return sendSuccess(res, data, 'Lấy báo cáo doanh thu thành công');
  }),

  getTopProducts: asyncHandler(async (req, res) => {
    if (req.query.format === 'xlsx') {
      return reportService.exportReportExcel('top-products', req.query, res);
    }
    const data = await reportService.getTopProductsReport(req.query);
    return sendSuccess(res, data, 'Lấy báo cáo sản phẩm bán chạy thành công');
  }),

  getOrders: asyncHandler(async (req, res) => {
    const data = await reportService.getOrdersReport(req.query);
    return sendSuccess(res, data, 'Lấy báo cáo trạng thái đơn hàng thành công');
  }),

  getStockAlerts: asyncHandler(async (req, res) => {
    const data = await reportService.getStockReport(req.query);
    return sendSuccess(res, data, 'Lấy báo cáo tồn kho cảnh báo thành công');
  }),

  getInventoryMovement: asyncHandler(async (req, res) => {
    if (req.query.format === 'xlsx') {
      return reportService.exportReportExcel('inventory-movement', req.query, res);
    }
    const data = await reportService.getInventoryMovementReport(req.query);
    return sendSuccess(res, data, 'Lấy báo cáo nhập - xuất - tồn thành công');
  }),

  getTopCustomers: asyncHandler(async (req, res) => {
    if (req.query.format === 'xlsx') {
      return reportService.exportReportExcel('top-customers', req.query, res);
    }
    const data = await reportService.getTopCustomersReport(req.query);
    return sendSuccess(res, data, 'Lấy báo cáo top khách hàng thân thiết thành công');
  }),

  getEmployeesSales: asyncHandler(async (req, res) => {
    if (req.query.format === 'xlsx') {
      return reportService.exportReportExcel('employees', req.query, res);
    }
    const data = await reportService.getEmployeeSalesReport(req.query);
    return sendSuccess(res, data, 'Lấy báo cáo doanh số theo nhân viên thành công');
  }),

  getReturnRates: asyncHandler(async (req, res) => {
    if (req.query.format === 'xlsx') {
      return reportService.exportReportExcel('returns', req.query, res);
    }
    const data = await reportService.getReturnRatesReport(req.query);
    return sendSuccess(res, data, 'Lấy báo cáo tỷ lệ trả hàng thành công');
  }),
};

module.exports = reportController;
