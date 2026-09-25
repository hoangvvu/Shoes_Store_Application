const { validateLogin, validateRegister } = require('./auth.validator');
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateUpdateProductStatus,
} = require('./product.validator');
const {
  validateCreateVoucher,
  validateUpdateVoucher,
  validateUpdateVoucherStatus,
} = require('./voucher.validator');
const {
  validateCreateSupplier,
  validateUpdateSupplier,
} = require('./supplier.validator');

module.exports = {
  validateLogin,
  validateRegister,
  validateCreateProduct,
  validateUpdateProduct,
  validateUpdateProductStatus,
  validateCreateVoucher,
  validateUpdateVoucher,
  validateUpdateVoucherStatus,
  validateCreateSupplier,
  validateUpdateSupplier,
};
