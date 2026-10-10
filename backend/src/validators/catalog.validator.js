const { BadRequestError } = require('../errors');

const validateCategory = (data) => {
  if (!data.categoryName || !data.categoryName.trim()) {
    throw new BadRequestError('Tên danh mục là bắt buộc');
  }
};

const validateBrand = (data) => {
  if (!data.brandName || !data.brandName.trim()) {
    throw new BadRequestError('Tên thương hiệu là bắt buộc');
  }
};

const validateSize = (data) => {
  if (!data.sizeLabel || !data.sizeLabel.trim()) {
    throw new BadRequestError('Cỡ giày (size) là bắt buộc');
  }
};

const validateColor = (data) => {
  if (!data.colorName || !data.colorName.trim()) {
    throw new BadRequestError('Tên màu là bắt buộc');
  }
  if (data.hexCode && !/^#[0-9A-Fa-f]{6}$/.test(data.hexCode.trim())) {
    throw new BadRequestError('Mã màu hex không đúng định dạng (VD: #FFFFFF)');
  }
};

module.exports = {
  validateCategory,
  validateBrand,
  validateSize,
  validateColor,
};
