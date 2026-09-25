const AppError = require('../errors/AppError');

const validateCreateProduct = (req, res, next) => {
  const { name, categoryId, brandId, basePrice, gender } = req.body;
  const errors = {};

  if (!name || !name.trim()) {
    errors.name = 'Tên sản phẩm không được để trống';
  }

  if (!categoryId || !categoryId.trim()) {
    errors.categoryId = 'Vui lòng chọn danh mục cho sản phẩm';
  }

  if (!brandId || !brandId.trim()) {
    errors.brandId = 'Vui lòng chọn thương hiệu cho sản phẩm';
  }

  if (basePrice === undefined || basePrice === null || Number(basePrice) <= 0) {
    errors.basePrice = 'Giá bán cơ bản phải là số dương lớn hơn 0';
  }

  if (gender && !['MEN', 'WOMEN', 'UNISEX', 'KIDS'].includes(gender.toUpperCase())) {
    errors.gender = 'Đối tượng sử dụng không hợp lệ (MEN, WOMEN, UNISEX, KIDS)';
  }

  if (Object.keys(errors).length > 0) {
    return next(new AppError('Dữ liệu sản phẩm không hợp lệ', 400, errors));
  }

  next();
};

const validateUpdateProduct = (req, res, next) => {
  const { name, basePrice, gender } = req.body;
  const errors = {};

  if (name !== undefined && (!name || !name.trim())) {
    errors.name = 'Tên sản phẩm không được để trống nếu cung cấp';
  }

  if (basePrice !== undefined && Number(basePrice) <= 0) {
    errors.basePrice = 'Giá bán cơ bản phải là số dương lớn hơn 0';
  }

  if (gender && !['MEN', 'WOMEN', 'UNISEX', 'KIDS'].includes(gender.toUpperCase())) {
    errors.gender = 'Đối tượng sử dụng không hợp lệ (MEN, WOMEN, UNISEX, KIDS)';
  }

  if (Object.keys(errors).length > 0) {
    return next(new AppError('Dữ liệu cập nhật sản phẩm không hợp lệ', 400, errors));
  }

  next();
};

const validateUpdateProductStatus = (req, res, next) => {
  const { isActive } = req.body;

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    return next(new AppError('Trạng thái isActive phải là kiểu boolean (true hoặc false)', 400));
  }

  next();
};

module.exports = {
  validateCreateProduct,
  validateUpdateProduct,
  validateUpdateProductStatus,
};
