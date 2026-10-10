import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { customerController as c } from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { createCustomerSchema, customerListQuery, updateCustomerSchema } from '../validators/customer.validator';
import { idParam } from '../validators/common';

const { ADMIN, SALES, CUSTOMER } = ROLES;
const r = Router();
r.use(authenticate);
r.get('/', requireRole(ADMIN, SALES), validate(customerListQuery, 'query'), h(c.list));
r.post('/', requireRole(ADMIN, SALES), validate(createCustomerSchema), h(c.create));
r.get('/:id', requireRole(ADMIN, SALES), validate(idParam, 'params'), h(c.get));
// Khách được gọi nhưng service chỉ cho sửa chính hồ sơ của mình
r.put('/:id', requireRole(ADMIN, SALES, CUSTOMER), validate(idParam, 'params'), validate(updateCustomerSchema), h(c.update));
r.delete('/:id', requireRole(ADMIN), validate(idParam, 'params'), h(c.remove));
export default r;
