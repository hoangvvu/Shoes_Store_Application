const express = require('express');
const productController = require('../controllers/product.controller');
const { auth, requireRole } = require('../middleware');

const router = express.Router();

// Staff / Admin: Quản lý biến thể (sửa SKU hoặc xóa mềm biến thể)
router.use(auth, requireRole('ADMIN', 'STAFF'));

router.put('/:id', productController.updateVariant);
router.delete('/:id', productController.deleteVariant);

module.exports = router;
