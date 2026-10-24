import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { catalogController as c } from '../controllers/catalog.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import {
  createBrandSchema,
  createCategorySchema,
  createColorSchema,
  createSizeSchema,
  updateBrandSchema,
  updateCategorySchema,
  updateColorSchema,
  updateSizeSchema,
} from '../validators/product.validator';

const { ADMIN } = ROLES;

// Categories Router
export const categoriesRouter = Router();
categoriesRouter.get('/', h(c.listCategories));
categoriesRouter.post('/', authenticate, requireRole(ADMIN), validate(createCategorySchema), h(c.createCategory));
categoriesRouter.put('/:id', authenticate, requireRole(ADMIN), validate(idParam, 'params'), validate(updateCategorySchema), h(c.updateCategory));
categoriesRouter.delete('/:id', authenticate, requireRole(ADMIN), validate(idParam, 'params'), h(c.removeCategory));

// Brands Router
export const brandsRouter = Router();
brandsRouter.get('/', h(c.listBrands));
brandsRouter.post('/', authenticate, requireRole(ADMIN), validate(createBrandSchema), h(c.createBrand));
brandsRouter.put('/:id', authenticate, requireRole(ADMIN), validate(idParam, 'params'), validate(updateBrandSchema), h(c.updateBrand));
brandsRouter.delete('/:id', authenticate, requireRole(ADMIN), validate(idParam, 'params'), h(c.removeBrand));

// Sizes Router
export const sizesRouter = Router();
sizesRouter.get('/', h(c.listSizes));
sizesRouter.post('/', authenticate, requireRole(ADMIN), validate(createSizeSchema), h(c.createSize));
sizesRouter.put('/:id', authenticate, requireRole(ADMIN), validate(idParam, 'params'), validate(updateSizeSchema), h(c.updateSize));
sizesRouter.delete('/:id', authenticate, requireRole(ADMIN), validate(idParam, 'params'), h(c.removeSize));

// Colors Router
export const colorsRouter = Router();
colorsRouter.get('/', h(c.listColors));
colorsRouter.post('/', authenticate, requireRole(ADMIN), validate(createColorSchema), h(c.createColor));
colorsRouter.put('/:id', authenticate, requireRole(ADMIN), validate(idParam, 'params'), validate(updateColorSchema), h(c.updateColor));
colorsRouter.delete('/:id', authenticate, requireRole(ADMIN), validate(idParam, 'params'), h(c.removeColor));
