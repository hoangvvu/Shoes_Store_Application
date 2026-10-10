import type { NextFunction, Request, Response } from 'express';
import type { RoleName } from '../constants/auth.constant';
import { AppError } from '../errors/AppError';

/** Phân quyền RBAC ở backend; luôn đặt sau `authenticate`. */
export const requireRole =
  (...roles: RoleName[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
