const { BadRequestError } = require('../errors');

const validateSupplier = (data) => {
  if (!data.supplierName || !data.supplierName.trim()) {
    throw new BadRequestError('Tên nhà cung cấp là bắt buộc');
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    throw new BadRequestError('Email nhà cung cấp không hợp lệ');
  }
  if (data.phone && !/^[0-9+]{9,15}$/.test(data.phone.trim())) {
    throw new BadRequestError('Số điện thoại nhà cung cấp không hợp lệ');
  }
};

module.exports = {
  validateSupplier,
};
