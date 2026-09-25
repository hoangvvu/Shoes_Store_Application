const express = require('express');
const router = express.Router();
const { supplierController } = require('../controllers');
const { authenticate, checkPermission } = require('../middleware');
const { PERMISSIONS } = require('../constants/role.constant');
const {
  validateCreateSupplier,
  validateUpdateSupplier,
} = require('../validators');

// Tất cả các thao tác với nhà cung cấp yêu cầu đăng nhập và có quyền PRODUCT_MANAGE hoặc INVENTORY_MANAGE (hoặc Super Admin)
const requireSupplierPermission = checkPermission([
  PERMISSIONS.PRODUCT_MANAGE,
  PERMISSIONS.INVENTORY_MANAGE,
]);

// 1. Lấy danh sách tất cả nhà cung cấp (hỗ trợ phân trang và tìm kiếm)
router.get('/', authenticate, requireSupplierPermission, supplierController.getAllSuppliers);

// 2. Lấy chi tiết một nhà cung cấp theo ID
router.get('/:id', authenticate, requireSupplierPermission, supplierController.getSupplierById);

// 3. Thêm mới nhà cung cấp (kiểm tra ràng buộc chống trùng lặp tên, email, phone)
router.post(
  '/',
  authenticate,
  requireSupplierPermission,
  validateCreateSupplier,
  supplierController.createSupplier
);

// 4. Sửa thông tin nhà cung cấp (kiểm tra chống trùng lặp với nhà cung cấp khác)
router.put(
  '/:id',
  authenticate,
  requireSupplierPermission,
  validateUpdateSupplier,
  supplierController.updateSupplier
);

// 5. Xóa nhà cung cấp (kiểm tra ràng buộc toàn vẹn: không cho xóa nếu đang có sản phẩm liên kết)
router.delete(
  '/:id',
  authenticate,
  requireSupplierPermission,
  supplierController.deleteSupplier
);

module.exports = router;
