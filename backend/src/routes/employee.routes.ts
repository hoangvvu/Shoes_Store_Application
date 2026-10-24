import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { employeeController as c } from '../controllers/employee.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import {
  createEmployeeSchema,
  employeeListQuery,
  employeePerformanceQuery,
  updateEmployeeSchema,
} from '../validators/employee.validator';

const r = Router();
r.use(authenticate, requireRole(ROLES.ADMIN));

r.get('/', validate(employeeListQuery, 'query'), h(c.list));
r.get('/:id', validate(idParam, 'params'), h(c.get));
r.post('/', validate(createEmployeeSchema), h(c.create));
r.put('/:id', validate(idParam, 'params'), validate(updateEmployeeSchema), h(c.update));
r.delete('/:id', validate(idParam, 'params'), h(c.remove));
r.get('/:id/performance', validate(idParam, 'params'), validate(employeePerformanceQuery, 'query'), h(c.performance));

export default r;
