import { Router } from 'express';
import { EMPLOYEE_ROLES, ROLES } from '../constants/auth.constant';
import { attendanceController as c } from '../controllers/attendance.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import {
  adjustAttendanceSchema,
  attendanceMonthQuery,
  checkInSchema,
  checkOutSchema,
  registerShiftsSchema,
  scheduleQuery,
} from '../validators/attendance.validator';

const r = Router();
r.use(authenticate, requireRole(...EMPLOYEE_ROLES));

// Thao tác chấm công cho nhân viên
r.get('/shifts', h(c.shifts));
r.get('/status', h(c.status));
r.post('/check-in', validate(checkInSchema), h(c.checkIn));
r.post('/check-out', validate(checkOutSchema), h(c.checkOut));
r.get('/my-history', h(c.myHistory));

// Lịch làm việc & Đăng ký ca
r.get('/schedules/my', h(c.mySchedules));
r.get('/schedules/occupancy', h(c.occupancy));
r.post('/schedules/register', validate(registerShiftsSchema), h(c.registerShifts));
r.get('/schedules', requireRole(ROLES.ADMIN), validate(scheduleQuery, 'query'), h(c.listSchedules));

// Dành cho Quản trị viên (ADMIN)
r.get('/summary', requireRole(ROLES.ADMIN), validate(attendanceMonthQuery, 'query'), h(c.adminSummary));
r.put('/:id/adjust', requireRole(ROLES.ADMIN), validate(idParam, 'params'), validate(adjustAttendanceSchema), h(c.adjust));

export default r;
