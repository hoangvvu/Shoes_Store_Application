const { BadRequestError } = require('../errors');

const validateCreateProduct = (data) => {
  const { productName, currentPrice, unit } = data;
  if (!productName || !productName.trim()) {
    throw new BadRequestError('Tên sản phẩm là bắt buộc');
  }
  if (currentPrice === undefined || isNaN(currentPrice) || Number(currentPrice) < 0) {
    throw new BadRequestError('Giá hiện hành phải là số không âm');
  }
};

const validateUpdateProduct = (data) => {
  const { productName, currentPrice } = data;
  if (productName !== undefined && !productName.trim()) {
    throw new BadRequestError('Tên sản phẩm không được để trống');
  }
  if (currentPrice !== undefined && (isNaN(currentPrice) || Number(currentPrice) < 0)) {
    throw new BadRequestError('Giá hiện hành phải là số không âm');
  }
};

const validateBulkVariants = (data) => {
  const { sizeIds, colorIds } = data;
  if (!Array.isArray(sizeIds) || sizeIds.length === 0) {
    throw new BadRequestError('Danh sách sizeIds phải là mảng và không được rỗng');
  }
  if (!Array.isArray(colorIds) || colorIds.length === 0) {
    throw new BadRequestError('Danh sách colorIds phải là mảng và không được rỗng');
  }
};

const validateUpdateVariant = (data) => {
  if (data.stockQuantity !== undefined) {
    throw new BadRequestError('Không được sửa tồn kho trực tiếp qua API biến thể. Hãy lập phiếu nhập hoặc điều chỉnh kho.');
  }
  if (data.sku !== undefined && !data.sku.trim()) {
    throw new BadRequestError('SKU không được để trống');
  }
};

module.exports = {
  validateCreateProduct,
  validateUpdateProduct,
  validateBulkVariants,
  validateUpdateVariant,
};
