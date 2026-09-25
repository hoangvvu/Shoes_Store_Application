const { voucherService } = require('../services');
const { sendSuccess } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');

class VoucherController {
  getActiveVouchers = asyncHandler(async (req, res) => {
    const vouchers = await voucherService.getActiveVouchers();
    sendSuccess(res, vouchers, 'Lấy danh sách mã giảm giá khả dụng thành công', 200);
  });

  checkVoucher = asyncHandler(async (req, res) => {
    const { code, orderValue } = req.body;
    const result = await voucherService.checkVoucher(code, Number(orderValue || 0));
    sendSuccess(res, result, 'Áp dụng mã giảm giá hợp lệ', 200);
  });

  getAllVouchers = asyncHandler(async (req, res) => {
    const result = await voucherService.getAllVouchers(req.query);
    sendSuccess(res, result, 'Lấy tất cả voucher thành công', 200);
  });

  getVoucherById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const voucher = await voucherService.getVoucherById(id);
    sendSuccess(res, voucher, 'Lấy thông tin voucher thành công', 200);
  });

  createVoucher = asyncHandler(async (req, res) => {
    const newVoucher = await voucherService.createVoucher(req.body);
    sendSuccess(res, newVoucher, 'Tạo mã giảm giá mới thành công', 201);
  });

  updateVoucher = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updatedVoucher = await voucherService.updateVoucher(id, req.body);
    sendSuccess(res, updatedVoucher, 'Cập nhật mã giảm giá thành công', 200);
  });

  toggleVoucherStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const result = await voucherService.toggleVoucherStatus(id, isActive);
    sendSuccess(res, result.voucher, result.message, 200);
  });
}

module.exports = new VoucherController();
