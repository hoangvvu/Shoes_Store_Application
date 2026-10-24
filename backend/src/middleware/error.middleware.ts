import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { isDuplicateKey } from '../utils/sqlError';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound(`Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
}

/** Mọi lỗi trả về dạng { code, message, details } */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ code: err.code, message: err.message, details: err.details ?? null });
  }
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: details[0]?.message ?? 'Dữ liệu không hợp lệ', details });
  }
  if (err instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({ code: 'TOKEN_INVALID', message: 'Token không hợp lệ', details: null });
  }
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400 && 'body' in err) {
    return res.status(400).json({ code: 'INVALID_JSON', message: 'Dữ liệu JSON không hợp lệ', details: null });
  }
  if (isDuplicateKey(err)) {
    return res.status(409).json({ code: 'DUPLICATE', message: 'Dữ liệu đã tồn tại', details: null });
  }
  // Lỗi THROW từ trigger/procedure (mã 50000+): thông điệp tiếng Việt do CSDL soạn sẵn
  const sqlNumber = (err as { number?: number })?.number;
  if (typeof sqlNumber === 'number' && sqlNumber >= 50000) {
    return res.status(409).json({ code: `DB_${sqlNumber}`, message: (err as Error).message, details: null });
  }

  console.error(err);
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'Lỗi hệ thống, vui lòng thử lại sau',
    details: env.isProd ? null : String((err as Error)?.message ?? err),
  });
}
