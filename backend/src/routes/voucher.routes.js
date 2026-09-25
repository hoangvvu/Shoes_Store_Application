const express = require('express');
const router = express.Router();
const { voucherController } = require('../controllers');
const { authenticate, checkPermission } = require('../middleware');
const { PERMISSIONS } = require('../constants/role.constant');
const {
  validateCreateVoucher,
  validateUpdateVoucher,
  validateUpdateVoucherStatus,
} = require('../validators');

// 1. Tuyến đường công khai / khách hàng kiểm tra mã
router.get('/active', voucherController.getActiveVouchers);
router.post('/check', voucherController.checkVoucher);

// 2. Tuyến đường quản trị viên (yêu cầu đăng nhập & quyền VOUCHER_MANAGE)
// Lấy danh sách toàn bộ voucher
router.get(
  '/',
  authenticate,
  checkPermission(PERMISSIONS.VOUCHER_MANAGE),
  voucherController.getAllVouchers
);

// Lấy chi tiết voucher theo ID
router.get(
  '/:id',
  authenticate,
  checkPermission(PERMISSIONS.VOUCHER_MANAGE),
  voucherController.getVoucherById
);

// Tạo mới voucher
router.post(
  '/',
  authenticate,
  checkPermission(PERMISSIONS.VOUCHER_MANAGE),
  validateCreateVoucher,
  voucherController.createVoucher
);

// Sửa voucher
router.put(
  '/:id',
  authenticate,
  checkPermission(PERMISSIONS.VOUCHER_MANAGE),
  validateUpdateVoucher,
  voucherController.updateVoucher
);

// Khóa / Mở khóa voucher
router.patch(
  '/:id/status',
  authenticate,
  checkPermission(PERMISSIONS.VOUCHER_MANAGE),
  validateUpdateVoucherStatus,
  voucherController.toggleVoucherStatus
);

module.exports = router;
