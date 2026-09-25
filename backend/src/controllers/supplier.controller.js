const { supplierService } = require('../services');
const { sendSuccess } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');

class SupplierController {
  getAllSuppliers = asyncHandler(async (req, res) => {
    const result = await supplierService.getAllSuppliers(req.query);
    sendSuccess(res, result, 'Lấy danh sách nhà cung cấp thành công', 200);
  });

  getSupplierById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const supplier = await supplierService.getSupplierById(id);
    sendSuccess(res, supplier, 'Lấy chi tiết nhà cung cấp thành công', 200);
  });

  createSupplier = asyncHandler(async (req, res) => {
    const newSupplier = await supplierService.createSupplier(req.body);
    sendSuccess(res, newSupplier, 'Thêm nhà cung cấp mới thành công', 201);
  });

  updateSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updated = await supplierService.updateSupplier(id, req.body);
    sendSuccess(res, updated, 'Cập nhật thông tin nhà cung cấp thành công', 200);
  });

  deleteSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await supplierService.deleteSupplier(id);
    sendSuccess(res, result, result.message, 200);
  });
}

module.exports = new SupplierController();
