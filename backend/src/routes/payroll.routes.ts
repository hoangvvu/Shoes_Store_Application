import { Router } from 'express';
import { EMPLOYEE_ROLES, ROLES } from '../constants/auth.constant';
import { payrollController as c } from '../controllers/payroll.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import {
  generatePayrollSchema,
  payrollQuerySchema,
  updatePayrollItemSchema,
} from '../validators/payroll.validator';

const r = Router();
r.use(authenticate, requireRole(...EMPLOYEE_ROLES));

// Nhân viên xem phiếu lương của chính mình
r.get('/my-payslip', validate(payrollQuerySchema, 'query'), h(c.myPayslip));

// Các API quản lý dành riêng cho ADMIN
r.get('/', requireRole(ROLES.ADMIN), h(c.list));
r.post('/generate', requireRole(ROLES.ADMIN), validate(generatePayrollSchema), h(c.generate));
r.get('/:id', requireRole(ROLES.ADMIN), validate(idParam, 'params'), h(c.getDetail));
r.put('/:id/items/:itemId', requireRole(ROLES.ADMIN), validate(updatePayrollItemSchema), h(c.updateItem));
r.post('/:id/approve', requireRole(ROLES.ADMIN), validate(idParam, 'params'), h(c.approve));
r.post('/:id/pay', requireRole(ROLES.ADMIN), validate(idParam, 'params'), h(c.markPaid));

export default r;
