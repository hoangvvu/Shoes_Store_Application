import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { inventoryController as c } from '../controllers/inventory.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import {
  adjustStockSchema,
  ledgerQuery,
  lowStockQuery,
  stockListQuery,
} from '../validators/inventory.validator';

const { ADMIN, WAREHOUSE, SALES } = ROLES;
const r = Router();
r.use(authenticate);

r.get('/', requireRole(ADMIN, WAREHOUSE, SALES), validate(stockListQuery, 'query'), h(c.list));
r.get('/low-stock', requireRole(ADMIN, WAREHOUSE), validate(lowStockQuery, 'query'), h(c.lowStock));
r.get('/:id/ledger', requireRole(ADMIN, WAREHOUSE), validate(idParam, 'params'), validate(ledgerQuery, 'query'), h(c.ledger));
r.post('/adjust', requireRole(ADMIN, WAREHOUSE), validate(adjustStockSchema), h(c.adjust));

export default r;
