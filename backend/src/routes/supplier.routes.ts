import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { supplierController as c } from '../controllers/supplier.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import {
  createSupplierSchema,
  supplierListQuery,
  updateSupplierSchema,
} from '../validators/inventory.validator';

const { ADMIN, WAREHOUSE, SALES } = ROLES;
const r = Router();
r.use(authenticate);

r.get('/', requireRole(ADMIN, WAREHOUSE, SALES), validate(supplierListQuery, 'query'), h(c.list));
r.get('/:id', requireRole(ADMIN, WAREHOUSE, SALES), validate(idParam, 'params'), h(c.get));
r.post('/', requireRole(ADMIN, WAREHOUSE), validate(createSupplierSchema), h(c.create));
r.put('/:id', requireRole(ADMIN, WAREHOUSE), validate(idParam, 'params'), validate(updateSupplierSchema), h(c.update));
r.delete('/:id', requireRole(ADMIN, WAREHOUSE), validate(idParam, 'params'), h(c.remove));

export default r;
