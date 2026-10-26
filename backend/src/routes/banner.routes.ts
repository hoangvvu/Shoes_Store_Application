import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { bannerController as c } from '../controllers/banner.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import { bannerQuerySchema, createBannerSchema, updateBannerSchema } from '../validators/banner.validator';

const { ADMIN, SALES } = ROLES;
const bannerRouter = Router();

bannerRouter.get('/', optionalAuth, validate(bannerQuerySchema, 'query'), h(c.list));
bannerRouter.get('/:id', optionalAuth, validate(idParam, 'params'), h(c.getById));
bannerRouter.post('/', authenticate, requireRole(ADMIN, SALES), validate(createBannerSchema), h(c.create));
bannerRouter.put('/:id', authenticate, requireRole(ADMIN, SALES), validate(idParam, 'params'), validate(updateBannerSchema), h(c.update));
bannerRouter.delete('/:id', authenticate, requireRole(ADMIN), validate(idParam, 'params'), h(c.remove));

export default bannerRouter;
