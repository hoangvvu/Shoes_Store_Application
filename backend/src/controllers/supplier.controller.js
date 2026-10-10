const supplierService = require('../services/supplier.service');
const { sendSuccess } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');

const supplierController = {
  getSuppliers: asyncHandler(async (req, res) => {
    const { q, page, size } = req.query;
    const result = await supplierService.getSuppliers({ q, page, size });
    return sendSuccess(res, result.items, 'Lấy danh sách nhà cung cấp thành công', 200, {
      page: result.page,
      size: result.size,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  getSupplierById: asyncHandler(async (req, res) => {
    const supplier = await supplierService.getSupplierById(parseInt(req.params.id, 10));
    return sendSuccess(res, supplier, 'Lấy thông tin nhà cung cấp thành công');
  }),

  createSupplier: asyncHandler(async (req, res) => {
    const supplier = await supplierService.createSupplier(req.body);
    return sendSuccess(res, supplier, 'Tạo mới nhà cung cấp thành công', 201);
  }),

  updateSupplier: asyncHandler(async (req, res) => {
    const supplier = await supplierService.updateSupplier(parseInt(req.params.id, 10), req.body);
    return sendSuccess(res, supplier, 'Cập nhật nhà cung cấp thành công');
  }),

  deleteSupplier: asyncHandler(async (req, res) => {
    await supplierService.deleteSupplier(parseInt(req.params.id, 10));
    return sendSuccess(res, null, 'Xóa nhà cung cấp thành công');
  }),
};

module.exports = supplierController;
