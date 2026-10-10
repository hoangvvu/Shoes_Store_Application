const { BadRequestError } = require('../errors');

const validateCreatePurchaseReceipt = (data) => {
  const { supplierId, items } = data;
  if (!supplierId || isNaN(supplierId)) {
    throw new BadRequestError('Nhà cung cấp (supplierId) là bắt buộc');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new BadRequestError('Danh sách mặt hàng nhập kho (items) không được rỗng');
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.variantId || isNaN(item.variantId)) {
      throw new BadRequestError(`Dòng #${i + 1}: Mã biến thể (variantId) không hợp lệ`);
    }
    if (!item.quantity || isNaN(item.quantity) || Number(item.quantity) <= 0) {
      throw new BadRequestError(`Dòng #${i + 1}: Số lượng nhập phải lớn hơn 0`);
    }
    if (item.importPrice === undefined || isNaN(item.importPrice) || Number(item.importPrice) < 0) {
      throw new BadRequestError(`Dòng #${i + 1}: Giá nhập không được âm`);
    }
  }
};

module.exports = {
  validateCreatePurchaseReceipt,
};
