const AUTH_MESSAGES = {
  LOGIN_SUCCESS: 'Đăng nhập thành công',
  REGISTER_SUCCESS: 'Đăng ký tài khoản thành công',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác',
  ACCOUNT_LOCKED: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên',
  UNAUTHORIZED: 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn',
  FORBIDDEN: 'Bạn không có quyền thực hiện hành động này',
  EMAIL_ALREADY_EXISTS: 'Địa chỉ email này đã được sử dụng',
};

const COMMON_MESSAGES = {
  NOT_FOUND: 'Không tìm thấy tài nguyên yêu cầu',
  SERVER_ERROR: 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau',
  VALIDATION_ERROR: 'Dữ liệu đầu vào không hợp lệ',
};

module.exports = {
  AUTH_MESSAGES,
  COMMON_MESSAGES,
};
