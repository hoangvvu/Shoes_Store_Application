import { Router, type NextFunction, type Request, type Response } from 'express';
import { ROLES } from '../constants/auth.constant';
import { meController as c } from '../controllers/me.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { updateCustomerMeSchema, updateEmployeeMeSchema } from '../validators/user.validator';

// Khách và nhân viên có quy tắc dữ liệu khác nhau nên chọn schema theo vai trò trong token
const validateMeUpdate = (req: Request, res: Response, next: NextFunction) =>
  validate(req.user!.role === ROLES.CUSTOMER ? updateCustomerMeSchema : updateEmployeeMeSchema)(req, res, next);

const r = Router();
r.get('/', authenticate, h(c.get));
r.put('/', authenticate, validateMeUpdate, h(c.update));
export default r;
