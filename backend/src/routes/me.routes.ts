import { Router } from 'express';
import { meController as c } from '../controllers/me.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { updateMeSchema } from '../validators/user.validator';

const r = Router();
r.get('/', authenticate, h(c.get));
r.put('/', authenticate, validate(updateMeSchema), h(c.update));
export default r;
