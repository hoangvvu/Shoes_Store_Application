import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { reportController as c } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import {
  dateRangeQuery,
  revenueQuery,
  stockReportQuery,
  topCustomersQuery,
  topProductsQuery,
} from '../validators/report.validator';

const { ADMIN, SALES, WAREHOUSE } = ROLES;
const r = Router();
r.use(authenticate);

r.get('/revenue', requireRole(ADMIN), validate(revenueQuery, 'query'), h(c.revenue));
r.get('/top-products', requireRole(ADMIN, SALES), validate(topProductsQuery, 'query'), h(c.topProducts));
r.get('/orders', requireRole(ADMIN, SALES), validate(dateRangeQuery, 'query'), h(c.orders));
r.get('/stock', requireRole(ADMIN, WAREHOUSE), validate(stockReportQuery, 'query'), h(c.stock));
r.get('/inventory-movement', requireRole(ADMIN, WAREHOUSE), validate(dateRangeQuery, 'query'), h(c.inventoryMovement));
r.get('/top-customers', requireRole(ADMIN), validate(topCustomersQuery, 'query'), h(c.topCustomers));
r.get('/employees', requireRole(ADMIN), validate(dateRangeQuery, 'query'), h(c.employees));
r.get('/returns', requireRole(ADMIN), validate(dateRangeQuery, 'query'), h(c.returns));
r.get('/:key', requireRole(ADMIN, SALES, WAREHOUSE), h(c.exportByKey));

export default r;
