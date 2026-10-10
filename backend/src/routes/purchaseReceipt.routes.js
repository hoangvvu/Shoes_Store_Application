const express = require('express');
const purchaseReceiptController = require('../controllers/purchaseReceipt.controller');
const { auth, requireRole } = require('../middleware');

const router = express.Router();

router.use(auth);

// NV và Admin được xem danh sách, chi tiết và lập phiếu nhập
router.get('/', requireRole('ADMIN', 'STAFF'), purchaseReceiptController.getPurchaseReceipts);
router.get('/:id', requireRole('ADMIN', 'STAFF'), purchaseReceiptController.getPurchaseReceiptById);
router.post('/', requireRole('ADMIN', 'STAFF'), purchaseReceiptController.createPurchaseReceipt);

// Chỉ Admin được xóa mềm phiếu nhập (hoàn tác kho)
router.delete('/:id', requireRole('ADMIN'), purchaseReceiptController.deletePurchaseReceipt);

module.exports = router;
