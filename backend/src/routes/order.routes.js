const express = require('express');
const router = express.Router();
const { orderController } = require('../controllers');
const { authenticate } = require('../middleware');

// Các thao tác đơn hàng của người dùng yêu cầu đăng nhập
router.use(authenticate);

router.post('/', orderController.createOrder);
router.get('/my-orders', orderController.getMyOrders);
router.get('/:id', orderController.getOrderDetail);

module.exports = router;
