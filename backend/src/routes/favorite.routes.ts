import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { favoriteController as c } from '../controllers/favorite.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { favoriteParam, favoritesQuery } from '../validators/review.validator';

/** /api/v1/me/favorites (chỉ khách; customerId lấy từ token) */
const r = Router();
r.use(authenticate, requireRole(ROLES.CUSTOMER));
r.get('/', validate(favoritesQuery, 'query'), h(c.list));
r.put('/:productId', validate(favoriteParam, 'params'), h(c.like));
r.delete('/:productId', validate(favoriteParam, 'params'), h(c.unlike));
export default r;
