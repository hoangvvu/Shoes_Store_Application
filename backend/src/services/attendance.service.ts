import { AppError } from '../errors/AppError';
import { attendanceRepository } from '../repositories/attendance.repository';
import { employeeRepository } from '../repositories/employee.repository';
import type { AuthUser } from '../types/express';
import type {
  AdjustAttendanceInput,
  AttendanceMonthQuery,
  CheckInInput,
  CheckOutInput,
  RegisterShiftsInput,
  ScheduleQuery,
} from '../validators/attendance.validator';

const VN_TIMEZONE_OFFSET = 7 * 60; // phút

function getVnNow(): { now: Date; dateStr: string; timeStr: string } {
  const utc = new Date();
  const vnTime = new Date(utc.getTime() + (VN_TIMEZONE_OFFSET + utc.getTimezoneOffset()) * 60000);
  const yyyy = vnTime.getFullYear();
  const mm = String(vnTime.getMonth() + 1).padStart(2, '0');
  const dd = String(vnTime.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const hh = String(vnTime.getHours()).padStart(2, '0');
  const min = String(vnTime.getMinutes()).padStart(2, '0');
  const ss = String(vnTime.getSeconds()).padStart(2, '0');
  const timeStr = `${hh}:${min}:${ss}`;
  return { now: utc, dateStr, timeStr };
}

function getWeekRange(date: Date, offsetWeeks = 0): { from: string; to: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diffToMonday + offsetWeeks * 7);

  const fromY = d.getFullYear();
  const fromM = String(d.getMonth() + 1).padStart(2, '0');
  const fromD = String(d.getDate()).padStart(2, '0');
  const fromStr = `${fromY}-${fromM}-${fromD}`;

  const endD = new Date(d);
  endD.setDate(d.getDate() + 6);
  const toY = endD.getFullYear();
  const toM = String(endD.getMonth() + 1).padStart(2, '0');
  const toD = String(endD.getDate()).padStart(2, '0');
  const toStr = `${toY}-${toM}-${toD}`;

  return { from: fromStr, to: toStr };
}

export const attendanceService = {
  async listShifts() {
    return attendanceRepository.listShifts();
  },

  async getTodayStatus(user: AuthUser) {
    if (!user.employeeId) throw AppError.forbidden('Chỉ nhân viên mới có dữ liệu chấm công');
    const { dateStr, timeStr } = getVnNow();
    const att = await attendanceRepository.getTodayAttendance(user.employeeId, dateStr);
    const shifts = await attendanceRepository.listShifts();

    // Lấy thông tin nhân viên để xác định loại hình làm việc
    const emp = await employeeRepository.findById(user.employeeId);
    const employmentType = emp?.employmentType ?? 'FULL_TIME';

    let assignedShift = null;
    let hasTodaySchedule = true;

    if (employmentType === 'PART_TIME') {
      // Nhân viên Part-time: Bắt buộc phải có ca đăng ký trong ngày hôm nay
      const todaySchedule = await attendanceRepository.findScheduleForToday(user.employeeId, dateStr);
      if (todaySchedule) {
        assignedShift = shifts.find((s) => s.shiftId === todaySchedule.shiftId) ?? null;
        hasTodaySchedule = true;
      } else {
        assignedShift = null;
        hasTodaySchedule = false;
      }
    } else {
      // Nhân viên Full-time: Tự động phân bổ ca theo giờ vào
      const [currentHour] = timeStr.split(':').map(Number);
      const assignedShiftCode = currentHour < 12 ? 'CA_SANG' : 'CA_TOI';
      assignedShift = shifts.find((s) => s.shiftCode === assignedShiftCode) ?? shifts[0] ?? null;
      hasTodaySchedule = true;
    }

    // Kiểm tra xem nhân viên đã đăng ký lịch tuần tới chưa
    const thisWeekRange = getWeekRange(new Date(dateStr), 0);
    const nextWeekRange = getWeekRange(new Date(dateStr), 1);
    const nextWeekCount = await attendanceRepository.countFutureRegistrations(
      user.employeeId,
      nextWeekRange.from,
      nextWeekRange.to,
    );
    const hasRegisteredNextWeek = nextWeekCount > 0;

    return {
      today: dateStr,
      employeeName: emp?.fullName ?? '',
      employmentType,
      assignedShift,
      hasTodaySchedule,
      attendance: att,
      isCheckedIn: Boolean(att?.checkIn),
      isCheckedOut: Boolean(att?.checkOut),
      thisWeekRange,
      nextWeekRange,
      hasRegisteredNextWeek,
      nextWeekShiftCount: nextWeekCount,
    };
  },

  async checkIn(user: AuthUser, input: CheckInInput) {
    if (!user.employeeId) throw AppError.forbidden('Chỉ nhân viên mới có thể chấm công');
    const { now, dateStr, timeStr } = getVnNow();

    const existing = await attendanceRepository.getTodayAttendance(user.employeeId, dateStr);
    if (existing?.checkIn) {
      throw AppError.badRequest('Bạn đã check-in ca hôm nay rồi');
    }

    const emp = await employeeRepository.findById(user.employeeId);
    const employmentType = emp?.employmentType ?? 'FULL_TIME';
    const shifts = await attendanceRepository.listShifts();

    let shift = null;
    let shiftId: number | null = null;

    if (employmentType === 'PART_TIME') {
      // Bắt buộc phải có lịch ca hôm nay đối với Part-time
      const todaySchedule = await attendanceRepository.findScheduleForToday(user.employeeId, dateStr);
      if (!todaySchedule) {
        throw AppError.badRequest(
          'Hôm nay bạn không có lịch ca làm việc được đăng ký/phân bổ trong hệ thống. Vui lòng đăng ký lịch làm việc trước hoặc liên hệ Quản lý để được xếp ca.',
        );
      }
      shift = shifts.find((s) => s.shiftId === todaySchedule.shiftId) ?? null;
      shiftId = todaySchedule.shiftId;
    } else {
      // Full-time tự động phân ca
      const [currentHour] = timeStr.split(':').map(Number);
      const assignedShiftCode = currentHour < 12 ? 'CA_SANG' : 'CA_TOI';
      shift = shifts.find((s) => s.shiftCode === assignedShiftCode) ?? shifts[0];
      shiftId = shift ? shift.shiftId : null;
    }

    let lateMinutes = 0;
    let status: 'PRESENT' | 'LATE' = 'PRESENT';

    if (shift) {
      const [sH, sM] = shift.startTime.split(':').map(Number);
      const [cH, cM] = timeStr.split(':').map(Number);
      const shiftStartMins = sH * 60 + sM;
      const checkInMins = cH * 60 + cM;

      if (checkInMins > shiftStartMins + 10) {
        lateMinutes = checkInMins - shiftStartMins;
        status = 'LATE';
      }
    }

    await attendanceRepository.checkIn({
      employeeId: user.employeeId,
      shiftId,
      workDate: dateStr,
      checkInTime: now,
      lateMinutes,
      status,
      note: input.note,
    });

    return attendanceRepository.getTodayAttendance(user.employeeId, dateStr);
  },

  async checkOut(user: AuthUser, input: CheckOutInput) {
    if (!user.employeeId) throw AppError.forbidden('Chỉ nhân viên mới có thể chấm công');
    const { now, dateStr, timeStr } = getVnNow();

    const existing = await attendanceRepository.getTodayAttendance(user.employeeId, dateStr);
    if (!existing || !existing.checkIn) {
      throw AppError.badRequest('Bạn chưa check-in hôm nay');
    }
    if (existing.checkOut) {
      throw AppError.badRequest('Bạn đã check-out hôm nay rồi');
    }

    const checkInTime = new Date(existing.checkIn);
    const diffMs = now.getTime() - checkInTime.getTime();
    let hours = Math.max(0, diffMs / (1000 * 60 * 60));

    let earlyLeaveMinutes = 0;
    let workUnits = 0;

    if (existing.shiftId) {
      const shift = await attendanceRepository.findShiftById(existing.shiftId);
      if (shift) {
        if (shift.breakMinutes && hours > 4) {
          hours = Math.max(0, hours - shift.breakMinutes / 60);
        }
        const [eH, eM] = shift.endTime.split(':').map(Number);
        const [cH, cM] = timeStr.split(':').map(Number);
        const shiftEndMins = eH * 60 + eM;
        const checkOutMins = cH * 60 + cM;
        if (checkOutMins < shiftEndMins - 10) {
          earlyLeaveMinutes = shiftEndMins - checkOutMins;
        }
      }
    }

    const actualHours = Math.round(hours * 100) / 100;
    if (actualHours >= 7.0) {
      workUnits = 1.0;
    } else if (actualHours >= 3.5) {
      workUnits = 0.5;
    } else {
      workUnits = Math.round((actualHours / 8.0) * 100) / 100;
    }

    await attendanceRepository.checkOut(existing.attendanceId, {
      checkOutTime: now,
      actualHours,
      workUnits,
      earlyLeaveMinutes,
    });

    return attendanceRepository.getTodayAttendance(user.employeeId, dateStr);
  },

  async getMyHistory(user: AuthUser, month?: number, year?: number) {
    if (!user.employeeId) throw AppError.forbidden('Chỉ nhân viên mới có lịch sử chấm công');
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();
    return attendanceRepository.listMyAttendances(user.employeeId, m, y);
  },

  async getAdminSummary(q: AttendanceMonthQuery) {
    const summary = await attendanceRepository.getSummaryByMonth(q.month, q.year);
    const details = await attendanceRepository.listAllAttendances(q);
    return {
      month: q.month,
      year: q.year,
      summary,
      details,
    };
  },

  async adjust(admin: AuthUser, attendanceId: number, input: AdjustAttendanceInput) {
    await attendanceRepository.adjustAttendance(attendanceId, {
      checkIn: input.checkIn ? new Date(input.checkIn) : undefined,
      checkOut: input.checkOut ? new Date(input.checkOut) : undefined,
      actualHours: input.actualHours,
      workUnits: input.workUnits,
      status: input.status,
      note: input.note,
      verifiedBy: admin.employeeId ?? 1,
    });
    return { success: true };
  },

  async getMySchedules(user: AuthUser, from?: string, to?: string) {
    if (!user.employeeId) throw AppError.forbidden('Chỉ nhân viên mới có lịch làm việc');
    const { dateStr } = getVnNow();
    const defaultRange = getWeekRange(new Date(dateStr), 0);
    const fromDate = from || defaultRange.from;
    const toDate = to || getWeekRange(new Date(dateStr), 1).to;
    return attendanceRepository.listSchedules({
      from: fromDate,
      to: toDate,
      employeeId: user.employeeId,
    });
  },

  async getOccupancy(user: AuthUser, from?: string, to?: string) {
    if (!user.employeeId) throw AppError.forbidden('Chỉ nhân viên mới có quyền xem thông tin ca');
    const { dateStr } = getVnNow();
    const defaultRange = getWeekRange(new Date(dateStr), 0);
    const fromDate = from || defaultRange.from;
    const toDate = to || getWeekRange(new Date(dateStr), 1).to;
    return attendanceRepository.getShiftOccupancy(fromDate, toDate, user.employeeId);
  },

  async registerMyShifts(user: AuthUser, input: RegisterShiftsInput) {
    if (!user.employeeId) throw AppError.forbidden('Chỉ nhân viên mới có thể đăng ký ca làm việc');
    const dates = input.entries.map((e) => e.workDate).sort();
    const minDate = input.fromDate || dates[0];
    const maxDate = input.toDate || dates[dates.length - 1];
    await attendanceRepository.registerShifts(user.employeeId, minDate, maxDate, input.entries);
    return { success: true, count: input.entries.length };
  },

  async listAllSchedules(q: ScheduleQuery) {
    const { dateStr } = getVnNow();
    const defaultRange = getWeekRange(new Date(dateStr), 0);
    const fromDate = q.from || defaultRange.from;
    const toDate = q.to || getWeekRange(new Date(dateStr), 1).to;
    return attendanceRepository.listSchedules({
      from: fromDate,
      to: toDate,
      employeeId: q.employeeId,
    });
  },
};
