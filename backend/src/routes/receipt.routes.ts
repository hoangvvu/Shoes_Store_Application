import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { receiptController as c } from '../controllers/receipt.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireActiveShift } from '../middleware/shiftGuard.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import {
  createReceiptSchema,
  deleteReceiptSchema,
  receiptListQuery,
} from '../validators/inventory.validator';

const { ADMIN, WAREHOUSE } = ROLES;
const r = Router();
r.use(authenticate);

r.get('/', requireRole(ADMIN, WAREHOUSE), validate(receiptListQuery, 'query'), h(c.list));
r.get('/:id', requireRole(ADMIN, WAREHOUSE), validate(idParam, 'params'), h(c.get));
r.post('/', requireRole(ADMIN, WAREHOUSE), requireActiveShift, validate(createReceiptSchema), h(c.create));
r.delete('/:id', requireRole(ADMIN), validate(idParam, 'params'), validate(deleteReceiptSchema), h(c.remove));

export default r;
