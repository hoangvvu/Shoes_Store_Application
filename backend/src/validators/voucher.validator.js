const AppError = require('../errors/AppError');

const validateCreateVoucher = (req, res, next) => {
  const { code, title, discountType, discountValue, minOrderValue, startDate, endDate } = req.body;
  const errors = {};

  if (!code || !code.trim()) {
    errors.code = 'Mã voucher không được để trống';
  }

  if (!title || !title.trim()) {
    errors.title = 'Tiêu đề voucher không được để trống';
  }

  if (!discountType || !['PERCENT', 'FIXED_AMOUNT'].includes(discountType)) {
    errors.discountType = 'Loại giảm giá phải là PERCENT hoặc FIXED_AMOUNT';
  }

  if (discountValue === undefined || Number(discountValue) <= 0) {
    errors.discountValue = 'Giá trị giảm giá phải lớn hơn 0';
  } else if (discountType === 'PERCENT' && Number(discountValue) > 100) {
    errors.discountValue = 'Mức giảm phần trăm không được vượt quá 100%';
  }

  if (minOrderValue !== undefined && Number(minOrderValue) < 0) {
    errors.minOrderValue = 'Giá trị đơn tối thiểu không được âm';
  }

  if (!startDate) {
    errors.startDate = 'Vui lòng chọn ngày bắt đầu hiệu lực';
  }

  if (!endDate) {
    errors.endDate = 'Vui lòng chọn ngày kết thúc hiệu lực';
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime())) {
      errors.startDate = 'Ngày bắt đầu không hợp lệ';
    }
    if (isNaN(end.getTime())) {
      errors.endDate = 'Ngày kết thúc không hợp lệ';
    }
    if (start.getTime() > end.getTime()) {
      errors.endDate = 'Ngày kết thúc phải diễn ra sau ngày bắt đầu';
    }
  }

  if (Object.keys(errors).length > 0) {
    return next(new AppError('Dữ liệu tạo voucher không hợp lệ', 400, errors));
  }

  next();
};

const validateUpdateVoucher = (req, res, next) => {
  const { discountType, discountValue, minOrderValue, startDate, endDate } = req.body;
  const errors = {};

  if (discountType !== undefined && !['PERCENT', 'FIXED_AMOUNT'].includes(discountType)) {
    errors.discountType = 'Loại giảm giá phải là PERCENT hoặc FIXED_AMOUNT';
  }

  if (discountValue !== undefined) {
    if (Number(discountValue) <= 0) {
      errors.discountValue = 'Giá trị giảm giá phải lớn hơn 0';
    } else if (discountType === 'PERCENT' && Number(discountValue) > 100) {
      errors.discountValue = 'Mức giảm phần trăm không được vượt quá 100%';
    }
  }

  if (minOrderValue !== undefined && Number(minOrderValue) < 0) {
    errors.minOrderValue = 'Giá trị đơn tối thiểu không được âm';
  }

  if (startDate && isNaN(new Date(startDate).getTime())) {
    errors.startDate = 'Ngày bắt đầu không hợp lệ';
  }

  if (endDate && isNaN(new Date(endDate).getTime())) {
    errors.endDate = 'Ngày kết thúc không hợp lệ';
  }

  if (startDate && endDate && new Date(startDate).getTime() > new Date(endDate).getTime()) {
    errors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
  }

  if (Object.keys(errors).length > 0) {
    return next(new AppError('Dữ liệu cập nhật voucher không hợp lệ', 400, errors));
  }

  next();
};

const validateUpdateVoucherStatus = (req, res, next) => {
  const { isActive } = req.body;

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    return next(new AppError('Trạng thái isActive phải là kiểu boolean (true hoặc false)', 400));
  }

  next();
};

module.exports = {
  validateCreateVoucher,
  validateUpdateVoucher,
  validateUpdateVoucherStatus,
};
