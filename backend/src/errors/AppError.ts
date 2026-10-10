export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown) {
    return new AppError(400, code, message, details);
  }
  static unauthorized(message = 'Chưa xác thực', code = 'UNAUTHORIZED') {
    return new AppError(401, code, message);
  }
  static forbidden(message = 'Không đủ quyền thực hiện', code = 'FORBIDDEN') {
    return new AppError(403, code, message);
  }
  static notFound(message = 'Không tìm thấy dữ liệu', code = 'NOT_FOUND') {
    return new AppError(404, code, message);
  }
  static conflict(message: string, code = 'CONFLICT') {
    return new AppError(409, code, message);
  }
  static tooMany(message: string) {
    return new AppError(429, 'TOO_MANY_REQUESTS', message);
  }
}
