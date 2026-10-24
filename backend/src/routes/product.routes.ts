import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { productController as c } from '../controllers/product.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import {
  bulkVariantsSchema,
  createProductSchema,
  patchProductActiveSchema,
  productListQuery,
  updateProductSchema,
  updateVariantSchema,
} from '../validators/product.validator';

const { ADMIN, SALES, WAREHOUSE } = ROLES;
const STAFF_ROLES = [ADMIN, SALES, WAREHOUSE] as const;

export const productRouter = Router();

productRouter.get('/', optionalAuth, validate(productListQuery, 'query'), h(c.list));
productRouter.get('/:id', optionalAuth, validate(idParam, 'params'), h(c.get));
productRouter.post('/', authenticate, requireRole(...STAFF_ROLES), validate(createProductSchema), h(c.create));
productRouter.put('/:id', authenticate, requireRole(...STAFF_ROLES), validate(idParam, 'params'), validate(updateProductSchema), h(c.update));
productRouter.patch('/:id/active', authenticate, requireRole(...STAFF_ROLES), validate(idParam, 'params'), validate(patchProductActiveSchema), h(c.setActive));
productRouter.delete('/:id', authenticate, requireRole(ADMIN), validate(idParam, 'params'), h(c.remove));
productRouter.post('/:id/variants/bulk', authenticate, requireRole(...STAFF_ROLES), validate(idParam, 'params'), validate(bulkVariantsSchema), h(c.bulkVariants));

export const variantRouter = Router();

variantRouter.put('/:id', authenticate, requireRole(...STAFF_ROLES), validate(idParam, 'params'), validate(updateVariantSchema), h(c.updateVariant));
variantRouter.delete('/:id', authenticate, requireRole(...STAFF_ROLES), validate(idParam, 'params'), h(c.removeVariant));
