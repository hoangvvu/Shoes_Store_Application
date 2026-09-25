const AppError = require('../errors/AppError');

const validateCreateSupplier = (req, res, next) => {
  const { name, contactEmail, phone } = req.body;
  const errors = {};

  if (!name || !name.trim()) {
    errors.name = 'Tên nhà cung cấp không được để trống';
  }

  if (contactEmail && contactEmail.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      errors.contactEmail = 'Địa chỉ email liên hệ không đúng định dạng';
    }
  }

  if (phone && phone.trim()) {
    if (!/^[0-9+() -]{8,20}$/.test(phone.trim())) {
      errors.phone = 'Số điện thoại liên hệ không hợp lệ';
    }
  }

  if (Object.keys(errors).length > 0) {
    return next(new AppError('Dữ liệu nhà cung cấp không hợp lệ', 400, errors));
  }

  next();
};

const validateUpdateSupplier = (req, res, next) => {
  const { name, contactEmail, phone } = req.body;
  const errors = {};

  if (name !== undefined && (!name || !name.trim())) {
    errors.name = 'Tên nhà cung cấp không được để trống nếu cập nhật';
  }

  if (contactEmail && contactEmail.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      errors.contactEmail = 'Địa chỉ email liên hệ không đúng định dạng';
    }
  }

  if (phone && phone.trim()) {
    if (!/^[0-9+() -]{8,20}$/.test(phone.trim())) {
      errors.phone = 'Số điện thoại liên hệ không hợp lệ';
    }
  }

  if (Object.keys(errors).length > 0) {
    return next(new AppError('Dữ liệu cập nhật nhà cung cấp không hợp lệ', 400, errors));
  }

  next();
};

module.exports = {
  validateCreateSupplier,
  validateUpdateSupplier,
};
