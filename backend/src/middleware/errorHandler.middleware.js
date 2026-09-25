const { env } = require('../config');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Lỗi máy chủ nội bộ';

  // Xử lý lỗi trùng lặp dữ liệu từ Prisma (Unique constraint violation)
  if (err.code === 'P2002') {
    statusCode = 409;
    const target = err.meta?.target ? err.meta.target.join(', ') : 'Trường dữ liệu';
    message = `${target} đã tồn tại trong hệ thống. Vui lòng chọn giá trị khác.`;
  }

  // Xử lý lỗi không tìm thấy bản ghi trong Prisma
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Bản ghi yêu cầu không tồn tại hoặc đã bị xóa.';
  }

  // Xử lý lỗi JWT
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Mã xác thực không hợp lệ. Vui lòng đăng nhập lại.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Mã xác thực đã hết hạn. Vui lòng đăng nhập lại.';
  }

  const response = {
    success: false,
    message,
    errors: err.errors || null,
  };

  if (env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
