import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { attendanceRepository } from '../repositories/attendance.repository';
import { employeeRepository } from '../repositories/employee.repository';

function getTodayVnDate(): string {
  const utc = new Date();
  const vn = new Date(utc.getTime() + 7 * 60 * 60 * 1000);
  const yyyy = vn.getFullYear();
  const mm = String(vn.getMonth() + 1).padStart(2, '0');
  const dd = String(vn.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Hướng 2: Chặn thao tác nghiệp vụ vận hành nếu nhân viên Part-time hôm nay không có ca làm việc.
 */
export async function requireActiveShift(req: Request, _res: Response, next: NextFunction) {
  const user = req.user;
  if (!user || !user.employeeId) return next();
  if (user.role === 'ADMIN') return next();

  const emp = await employeeRepository.findById(user.employeeId);
  if (!emp || emp.employmentType !== 'PART_TIME') {
    return next(); // Full-time không bị giới hạn
  }

  const dateStr = getTodayVnDate();
  const schedule = await attendanceRepository.findScheduleForToday(user.employeeId, dateStr);
  if (!schedule) {
    throw AppError.forbidden(
      'Hôm nay bạn không có ca làm việc đã đăng ký. Quyền thực hiện nghiệp vụ bị khóa.',
      'NO_ACTIVE_SHIFT',
    );
  }

  next();
}
