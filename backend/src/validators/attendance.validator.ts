import { z } from 'zod';

export const checkInSchema = z.object({
  shiftId: z.coerce.number().int().positive().optional(),
  note: z.string().trim().max(255).optional(),
});

export const checkOutSchema = z.object({
  note: z.string().trim().max(255).optional(),
});

export const attendanceMonthQuery = z.object({
  month: z.coerce.number().int().min(1).max(12).default(() => new Date().getMonth() + 1),
  year: z.coerce.number().int().min(2020).max(2100).default(() => new Date().getFullYear()),
  employeeId: z.coerce.number().int().positive().optional(),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const adjustAttendanceSchema = z.object({
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
  actualHours: z.coerce.number().min(0).max(24).optional(),
  workUnits: z.coerce.number().min(0).max(2).optional(),
  status: z.enum(['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'LEAVE_PAID', 'LEAVE_UNPAID']).optional(),
  note: z.string().trim().max(255).optional(),
});

export const registerShiftsSchema = z.object({
  entries: z
    .array(
      z.object({
        workDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'workDate phải là YYYY-MM-DD'),
        shiftId: z.coerce.number().int().positive('shiftId không hợp lệ'),
      }),
    )
    .min(1, 'Vui lòng chọn ít nhất 1 ca làm việc'),
  fromDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const scheduleQuery = z.object({
  from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  employeeId: z.coerce.number().int().positive().optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type AttendanceMonthQuery = z.infer<typeof attendanceMonthQuery>;
export type AdjustAttendanceInput = z.infer<typeof adjustAttendanceSchema>;
export type RegisterShiftsInput = z.infer<typeof registerShiftsSchema>;
export type ScheduleQuery = z.infer<typeof scheduleQuery>;
