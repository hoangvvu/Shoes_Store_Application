const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const rbacRoutes = require('./rbac.routes');
const productRoutes = require('./product.routes');
const orderRoutes = require('./order.routes');

// Endpoint kiểm tra sức khỏe hệ thống
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Shoes Store Backend Core API is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/rbac', rbacRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);

module.exports = router;
