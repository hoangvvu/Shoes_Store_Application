import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { userController as c } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import { adminResetPasswordSchema, createEmployeeUserSchema, lockSchema, roleSchema } from '../validators/user.validator';

const r = Router();
r.use(authenticate, requireRole(ROLES.ADMIN));
r.post('/', validate(createEmployeeUserSchema), h(c.create));
r.patch('/:id/lock', validate(idParam, 'params'), validate(lockSchema), h(c.lock));
r.patch('/:id/role', validate(idParam, 'params'), validate(roleSchema), h(c.changeRole));
r.patch('/:id/reset-password', validate(idParam, 'params'), validate(adminResetPasswordSchema), h(c.adminResetPassword));
r.delete('/:id', validate(idParam, 'params'), h(c.remove));
export default r;
