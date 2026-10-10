const inventoryService = require('../services/inventory.service');
const { sendSuccess } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');

const inventoryController = {
  getStockList: asyncHandler(async (req, res) => {
    const result = await inventoryService.getStockList(req.query);
    return sendSuccess(res, result.items, 'Lấy danh sách tồn kho thành công', 200, {
      page: result.page,
      size: result.size,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  getVariantLedger: asyncHandler(async (req, res) => {
    const { variantId } = req.params;
    const result = await inventoryService.getVariantLedger(parseInt(variantId, 10), req.query);
    return sendSuccess(res, result.items, 'Lấy lịch sử thẻ kho thành công', 200, {
      page: result.page,
      size: result.size,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  adjustStock: asyncHandler(async (req, res) => {
    const userId = req.user?.userId;
    const updated = await inventoryService.adjustStock(req.body, userId);
    return sendSuccess(res, updated, 'Điều chỉnh số lượng tồn kho thành công');
  }),

  getLowStock: asyncHandler(async (req, res) => {
    const { threshold } = req.query;
    const items = await inventoryService.getLowStockVariants(threshold);
    return sendSuccess(res, items, 'Lấy danh sách cảnh báo sắp hết hàng thành công');
  }),

  getMovementReport: asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const items = await inventoryService.getInventoryMovementReport(from, to);
    return sendSuccess(res, items, 'Lấy báo cáo nhập - xuất - tồn thành công');
  }),
};

module.exports = inventoryController;
