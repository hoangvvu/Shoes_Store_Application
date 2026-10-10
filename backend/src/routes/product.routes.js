const express = require('express');
const productController = require('../controllers/product.controller');
const { auth, requireRole, optionalAuth } = require('../middleware');

const router = express.Router();

// Public: Khách xem, tìm kiếm, lọc sản phẩm
router.get('/', optionalAuth, productController.getProducts);
router.get('/:id', optionalAuth, productController.getProductById);

// Staff / Admin: Quản lý sản phẩm
router.post('/', auth, requireRole('ADMIN', 'STAFF'), productController.createProduct);
router.put('/:id', auth, requireRole('ADMIN', 'STAFF'), productController.updateProduct);
router.patch('/:id/active', auth, requireRole('ADMIN', 'STAFF'), productController.toggleActive);
router.post('/:id/variants/bulk', auth, requireRole('ADMIN', 'STAFF'), productController.bulkCreateVariants);

// Admin only: Xóa mềm sản phẩm
router.delete('/:id', auth, requireRole('ADMIN'), productController.deleteProduct);

module.exports = router;
