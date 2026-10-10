import { Router } from 'express';
import { authController as c } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import {
  changePasswordSchema,
  forgotSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetSchema,
} from '../validators/auth.validator';

const r = Router();
r.post('/register', validate(registerSchema), h(c.register));
r.post('/login', validate(loginSchema), h(c.login));
r.post('/refresh', validate(refreshSchema), h(c.refresh));
r.post('/logout', h(c.logout));
r.put('/password', authenticate, validate(changePasswordSchema), h(c.changePassword));
r.post('/forgot', validate(forgotSchema), h(c.forgot));
r.post('/reset', validate(resetSchema), h(c.reset));
export default r;
