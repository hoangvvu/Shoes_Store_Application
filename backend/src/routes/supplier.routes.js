const express = require('express');
const supplierController = require('../controllers/supplier.controller');
const { auth, requireRole } = require('../middleware');

const router = express.Router();

router.use(auth);

// NV và Admin được xem, thêm, sửa nhà cung cấp
router.get('/', requireRole('ADMIN', 'STAFF'), supplierController.getSuppliers);
router.get('/:id', requireRole('ADMIN', 'STAFF'), supplierController.getSupplierById);
router.post('/', requireRole('ADMIN', 'STAFF'), supplierController.createSupplier);
router.put('/:id', requireRole('ADMIN', 'STAFF'), supplierController.updateSupplier);

// Chỉ Admin được xóa nhà cung cấp
router.delete('/:id', requireRole('ADMIN'), supplierController.deleteSupplier);

module.exports = router;
