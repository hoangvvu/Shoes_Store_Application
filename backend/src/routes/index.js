const express = require('express');
const employeeRoutes = require('./employee.routes');
const productRoutes = require('./product.routes');
const variantRoutes = require('./variant.routes');
const uploadRoutes = require('./upload.routes');
const {
  categoryRouter,
  brandRouter,
  sizeRouter,
  colorRouter,
} = require('./catalog.routes');
const supplierRoutes = require('./supplier.routes');
const purchaseReceiptRoutes = require('./purchaseReceipt.routes');
const inventoryRoutes = require('./inventory.routes');
const reportRoutes = require('./report.routes');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'Shoes Store API Core',
    modules: ['M3: Employees', 'M4: Products & Catalog', 'M5: Suppliers & Purchase Receipts', 'M6: Inventory', 'M15: Reports & Dashboard'],
  });
});

// V1 Prefix routes
const v1Router = express.Router();
v1Router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'UP',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// M3: Quản lý nhân viên
v1Router.use('/employees', employeeRoutes);

// M4: Quản lý sản phẩm, biến thể và danh mục
v1Router.use('/products', productRoutes);
v1Router.use('/categories', categoryRouter);
v1Router.use('/brands', brandRouter);
v1Router.use('/sizes', sizeRouter);
v1Router.use('/colors', colorRouter);
v1Router.use('/variants', variantRoutes);
v1Router.use('/uploads', uploadRoutes);

// M5: Quản lý nhà cung cấp và nhập kho
v1Router.use('/suppliers', supplierRoutes);
v1Router.use('/purchase-receipts', purchaseReceiptRoutes);

// M6: Quản lý tồn kho
v1Router.use('/inventory', inventoryRoutes);

// M15: Báo cáo và bảng điều khiển
v1Router.use('/reports', reportRoutes);

// Attach /v1 and default fallback to root of API router
router.use('/v1', v1Router);

// Forward root requests to v1 as well for backward compatibility
router.use('/employees', employeeRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRouter);
router.use('/brands', brandRouter);
router.use('/sizes', sizeRouter);
router.use('/colors', colorRouter);
router.use('/variants', variantRoutes);
router.use('/uploads', uploadRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchase-receipts', purchaseReceiptRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
