const express = require('express');
const router = express.Router();
const { productController } = require('../controllers');
const { authenticate, checkPermission } = require('../middleware');
const { PERMISSIONS } = require('../constants/role.constant');
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateUpdateProductStatus,
} = require('../validators');

// 1. Tuyến đường công khai (Khách hàng & Khách vãng lai xem sản phẩm)
router.get('/', productController.getProducts);
router.get('/id/:id', productController.getProductById);
router.get('/:slug', productController.getProductBySlug);

// 2. Tuyến đường Quản trị viên (Yêu cầu đăng nhập & quyền PRODUCT_MANAGE)
// Thêm mới sản phẩm
router.post(
  '/',
  authenticate,
  checkPermission(PERMISSIONS.PRODUCT_MANAGE),
  validateCreateProduct,
  productController.createProduct
);

// Sửa sản phẩm
router.put(
  '/:id',
  authenticate,
  checkPermission(PERMISSIONS.PRODUCT_MANAGE),
  validateUpdateProduct,
  productController.updateProduct
);

// Khóa / Mở khóa sản phẩm (isActive: false / true)
router.patch(
  '/:id/status',
  authenticate,
  checkPermission(PERMISSIONS.PRODUCT_MANAGE),
  validateUpdateProductStatus,
  productController.toggleProductStatus
);

module.exports = router;
