const authController = require('./auth.controller');
const rbacController = require('./rbac.controller');
const productController = require('./product.controller');
const orderController = require('./order.controller');
const voucherController = require('./voucher.controller');
const supplierController = require('./supplier.controller');

module.exports = {
  authController,
  rbacController,
  productController,
  orderController,
  voucherController,
  supplierController,
};
