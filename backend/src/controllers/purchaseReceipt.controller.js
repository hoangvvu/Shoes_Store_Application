const purchaseReceiptService = require('../services/purchaseReceipt.service');
const { sendSuccess } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');

const purchaseReceiptController = {
  getPurchaseReceipts: asyncHandler(async (req, res) => {
    const { supplierId, employeeId, from, to, page, size } = req.query;
    const result = await purchaseReceiptService.getPurchaseReceipts({
      supplierId,
      employeeId,
      from,
      to,
      page,
      size,
    });
    return sendSuccess(res, result.items, 'Lấy danh sách phiếu nhập kho thành công', 200, {
      page: result.page,
      size: result.size,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  getPurchaseReceiptById: asyncHandler(async (req, res) => {
    const receipt = await purchaseReceiptService.getPurchaseReceiptById(
      parseInt(req.params.id, 10)
    );
    return sendSuccess(res, receipt, 'Lấy chi tiết phiếu nhập kho thành công');
  }),

  createPurchaseReceipt: asyncHandler(async (req, res) => {
    const receipt = await purchaseReceiptService.createPurchaseReceipt(req.body, req.user);
    return sendSuccess(res, receipt, 'Lập phiếu nhập kho thành công', 201);
  }),

  deletePurchaseReceipt: asyncHandler(async (req, res) => {
    const actorUserId = req.user?.userId || null;
    await purchaseReceiptService.deletePurchaseReceipt(
      parseInt(req.params.id, 10),
      actorUserId
    );
    return sendSuccess(res, null, 'Xóa mềm phiếu nhập kho thành công (đã hoàn tác tồn kho)');
  }),
};

module.exports = purchaseReceiptController;
