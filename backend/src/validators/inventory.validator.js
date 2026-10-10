const { BadRequestError } = require('../errors');

const validateAdjustStock = (data) => {
  const { variantId, quantityChange, reason } = data;
  if (!variantId || isNaN(variantId)) {
    throw new BadRequestError('Mã biến thể (variantId) là bắt buộc');
  }
  if (quantityChange === undefined || isNaN(quantityChange) || Number(quantityChange) === 0) {
    throw new BadRequestError('Số lượng điều chỉnh (quantityChange) phải khác 0');
  }
  if (!reason || !reason.trim()) {
    throw new BadRequestError('Lý do điều chỉnh tồn kho là bắt buộc');
  }
};

module.exports = {
  validateAdjustStock,
};
