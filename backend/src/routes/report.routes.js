const express = require('express');
const reportController = require('../controllers/report.controller');
const { auth, requireRole } = require('../middleware');

const router = express.Router();

router.use(auth);

// Báo cáo vận hành: Nhân viên & Admin được xem
router.get('/top-products', requireRole('ADMIN', 'STAFF'), reportController.getTopProducts);
router.get('/orders', requireRole('ADMIN', 'STAFF'), reportController.getOrders);
router.get('/stock', requireRole('ADMIN', 'STAFF'), reportController.getStockAlerts);
router.get('/inventory-movement', requireRole('ADMIN', 'STAFF'), reportController.getInventoryMovement);

// Báo cáo tài chính, doanh thu, nhân viên, khách hàng: Chỉ Admin
router.get('/revenue', requireRole('ADMIN'), reportController.getRevenue);
router.get('/top-customers', requireRole('ADMIN'), reportController.getTopCustomers);
router.get('/employees', requireRole('ADMIN'), reportController.getEmployeesSales);
router.get('/returns', requireRole('ADMIN'), reportController.getReturnRates);

module.exports = router;
