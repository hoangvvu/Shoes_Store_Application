const AppError = require('../errors/AppError');

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = {};

  if (!email || !email.trim()) {
    errors.email = 'Vui lòng nhập địa chỉ email';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Địa chỉ email không đúng định dạng';
  }

  if (!password) {
    errors.password = 'Vui lòng nhập mật khẩu';
  }

  if (Object.keys(errors).length > 0) {
    return next(new AppError('Dữ liệu đăng nhập không hợp lệ', 400, errors));
  }

  next();
};

const validateRegister = (req, res, next) => {
  const { fullName, email, password, phone } = req.body;
  const errors = {};

  if (!fullName || !fullName.trim()) {
    errors.fullName = 'Họ và tên không được để trống';
  }

  if (!email || !email.trim()) {
    errors.email = 'Địa chỉ email không được để trống';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Địa chỉ email không đúng định dạng';
  }

  if (!password || password.length < 6) {
    errors.password = 'Mật khẩu phải có độ dài tối thiểu 6 ký tự';
  }

  if (phone && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(phone)) {
    errors.phone = 'Số điện thoại không đúng định dạng Việt Nam';
  }

  if (Object.keys(errors).length > 0) {
    return next(new AppError('Dữ liệu đăng ký không hợp lệ', 400, errors));
  }

  next();
};

module.exports = {
  validateLogin,
  validateRegister,
};
