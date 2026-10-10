class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Dữ liệu yêu cầu không hợp lệ', code = 'BAD_REQUEST', details = null) {
    super(message, 400, code, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Chưa xác thực hoặc token không hợp lệ', code = 'UNAUTHORIZED', details = null) {
    super(message, 401, code, details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Bạn không có quyền thực hiện hành động này', code = 'FORBIDDEN', details = null) {
    super(message, 403, code, details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy tài nguyên yêu cầu', code = 'NOT_FOUND', details = null) {
    super(message, 404, code, details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Dữ liệu đã tồn tại hoặc xảy ra xung đột', code = 'CONFLICT', details = null) {
    super(message, 409, code, details);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
