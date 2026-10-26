import { query, sql, type Executor } from '../config/database';
import { AppError } from '../errors/AppError';
import type { AttendanceRow, AttendanceStatus, EmployeeAttendanceSummary, ShiftRow } from '../types/attendance.types';

export const attendanceRepository = {
  async listShifts(exec?: Executor): Promise<ShiftRow[]> {
    const r = await query<ShiftRow>(
      `SELECT shift_id AS shiftId, shift_code AS shiftCode, shift_name AS shiftName,
              CONVERT(VARCHAR(8), start_time, 108) AS startTime,
              CONVERT(VARCHAR(8), end_time, 108) AS endTime,
              break_minutes AS breakMinutes, standard_hours AS standardHours,
              target_role AS targetRole, is_active AS isActive
       FROM shifts WHERE is_active = 1
       ORDER BY start_time ASC`,
      {},
      exec,
    );
    return r.recordset;
  },

  async findShiftById(shiftId: number, exec?: Executor): Promise<ShiftRow | null> {
    const r = await query<ShiftRow>(
      `SELECT shift_id AS shiftId, shift_code AS shiftCode, shift_name AS shiftName,
              CONVERT(VARCHAR(8), start_time, 108) AS startTime,
              CONVERT(VARCHAR(8), end_time, 108) AS endTime,
              break_minutes AS breakMinutes, standard_hours AS standardHours,
              target_role AS targetRole, is_active AS isActive
       FROM shifts WHERE shift_id = @id`,
      { id: [sql.Int, shiftId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async getTodayAttendance(employeeId: number, dateStr: string, exec?: Executor): Promise<AttendanceRow | null> {
    const r = await query<AttendanceRow>(
      `SELECT a.attendance_id AS attendanceId, a.employee_id AS employeeId, a.shift_id AS shiftId,
              CONVERT(VARCHAR(10), a.work_date, 120) AS workDate,
              a.check_in AS checkIn, a.check_out AS checkOut,
              a.actual_hours AS actualHours, a.work_units AS workUnits,
              a.late_minutes AS lateMinutes, a.early_leave_minutes AS earlyLeaveMinutes,
              a.status, a.note, a.verified_by AS verifiedBy, a.created_at AS createdAt,
              s.shift_name AS shiftName
       FROM attendances a
       LEFT JOIN shifts s ON s.shift_id = a.shift_id
       WHERE a.employee_id = @empId AND a.work_date = @date`,
      {
        empId: [sql.Int, employeeId],
        date: [sql.Date, new Date(dateStr)],
      },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async checkIn(
    d: {
      employeeId: number;
      shiftId: number | null;
      workDate: string;
      checkInTime: Date;
      lateMinutes: number;
      status: AttendanceStatus;
      note?: string | null;
    },
    exec?: Executor,
  ): Promise<number> {
    const r = await query<{ id: number }>(
      `INSERT INTO attendances (employee_id, shift_id, work_date, check_in, late_minutes, status, note)
       VALUES (@empId, @shiftId, @date, @checkIn, @late, @status, @note);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      {
        empId: [sql.Int, d.employeeId],
        shiftId: [sql.Int, d.shiftId ?? null],
        date: [sql.Date, new Date(d.workDate)],
        checkIn: [sql.DateTime2, d.checkInTime],
        late: [sql.Int, d.lateMinutes],
        status: [sql.VarChar(20), d.status],
        note: [sql.NVarChar(255), d.note ?? null],
      },
      exec,
    );
    return r.recordset[0].id;
  },

  async checkOut(
    attendanceId: number,
    d: {
      checkOutTime: Date;
      actualHours: number;
      workUnits: number;
      earlyLeaveMinutes: number;
      status?: AttendanceStatus;
    },
    exec?: Executor,
  ): Promise<void> {
    await query(
      `UPDATE attendances SET
         check_out = @checkOut,
         actual_hours = @actualHours,
         work_units = @workUnits,
         early_leave_minutes = @earlyLeave,
         status = COALESCE(@status, status)
       WHERE attendance_id = @id`,
      {
        id: [sql.Int, attendanceId],
        checkOut: [sql.DateTime2, d.checkOutTime],
        actualHours: [sql.Decimal(5, 2), d.actualHours],
        workUnits: [sql.Decimal(3, 2), d.workUnits],
        earlyLeave: [sql.Int, d.earlyLeaveMinutes],
        status: [sql.VarChar(20), d.status ?? null],
      },
      exec,
    );
  },

  async listMyAttendances(
    employeeId: number,
    month: number,
    year: number,
    exec?: Executor,
  ): Promise<AttendanceRow[]> {
    const r = await query<AttendanceRow>(
      `SELECT a.attendance_id AS attendanceId, a.employee_id AS employeeId, a.shift_id AS shiftId,
              CONVERT(VARCHAR(10), a.work_date, 120) AS workDate,
              a.check_in AS checkIn, a.check_out AS checkOut,
              a.actual_hours AS actualHours, a.work_units AS workUnits,
              a.late_minutes AS lateMinutes, a.early_leave_minutes AS earlyLeaveMinutes,
              a.status, a.note, a.created_at AS createdAt,
              s.shift_name AS shiftName
       FROM attendances a
       LEFT JOIN shifts s ON s.shift_id = a.shift_id
       WHERE a.employee_id = @empId
         AND MONTH(a.work_date) = @month AND YEAR(a.work_date) = @year
       ORDER BY a.work_date DESC`,
      {
        empId: [sql.Int, employeeId],
        month: [sql.Int, month],
        year: [sql.Int, year],
      },
      exec,
    );
    return r.recordset;
  },

  async listAllAttendances(
    p: { month: number; year: number; employeeId?: number; date?: string },
    exec?: Executor,
  ): Promise<AttendanceRow[]> {
    const r = await query<AttendanceRow>(
      `SELECT a.attendance_id AS attendanceId, a.employee_id AS employeeId, a.shift_id AS shiftId,
              CONVERT(VARCHAR(10), a.work_date, 120) AS workDate,
              a.check_in AS checkIn, a.check_out AS checkOut,
              a.actual_hours AS actualHours, a.work_units AS workUnits,
              a.late_minutes AS lateMinutes, a.early_leave_minutes AS earlyLeaveMinutes,
              a.status, a.note, a.verified_by AS verifiedBy, a.created_at AS createdAt,
              LTRIM(RTRIM(CONCAT(e.last_name, N' ', e.first_name))) AS employeeName,
              r.role_name AS role,
              s.shift_name AS shiftName
       FROM attendances a
       JOIN employees e ON e.employee_id = a.employee_id
       LEFT JOIN users u ON u.employee_id = e.employee_id AND u.is_deleted = 0
       LEFT JOIN roles r ON r.role_id = u.role_id
       LEFT JOIN shifts s ON s.shift_id = a.shift_id
       WHERE MONTH(a.work_date) = @month AND YEAR(a.work_date) = @year
         AND (@empId IS NULL OR a.employee_id = @empId)
         AND (@date IS NULL OR a.work_date = @date)
       ORDER BY a.work_date DESC, a.check_in DESC`,
      {
        month: [sql.Int, p.month],
        year: [sql.Int, p.year],
        empId: [sql.Int, p.employeeId ?? null],
        date: [sql.Date, p.date ? new Date(p.date) : null],
      },
      exec,
    );
    return r.recordset;
  },

  async getSummaryByMonth(
    month: number,
    year: number,
    exec?: Executor,
  ): Promise<EmployeeAttendanceSummary[]> {
    const r = await query<EmployeeAttendanceSummary>(
      `SELECT e.employee_id AS employeeId,
              LTRIM(RTRIM(CONCAT(e.last_name, N' ', e.first_name))) AS fullName,
              r.role_name AS role,
              e.employment_type AS employmentType,
              ISNULL(SUM(a.work_units), 0) AS totalDays,
              ISNULL(SUM(a.actual_hours), 0) AS totalHours,
              ISNULL(SUM(CASE WHEN a.status = 'LATE' OR a.late_minutes > 0 THEN 1 ELSE 0 END), 0) AS lateCount,
              ISNULL(SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END), 0) AS absentCount
       FROM employees e
       LEFT JOIN users u ON u.employee_id = e.employee_id AND u.is_deleted = 0
       LEFT JOIN roles r ON r.role_id = u.role_id
       LEFT JOIN attendances a ON a.employee_id = e.employee_id 
            AND MONTH(a.work_date) = @month AND YEAR(a.work_date) = @year
       WHERE e.is_deleted = 0
       GROUP BY e.employee_id, e.last_name, e.first_name, r.role_name, e.employment_type
       ORDER BY e.employee_id ASC`,
      {
        month: [sql.Int, month],
        year: [sql.Int, year],
      },
      exec,
    );
    return r.recordset.map((row) => ({
      ...row,
      totalDays: Number(row.totalDays),
      totalHours: Number(row.totalHours),
      lateCount: Number(row.lateCount),
      absentCount: Number(row.absentCount),
    }));
  },

  async adjustAttendance(
    attendanceId: number,
    d: {
      checkIn?: Date | null;
      checkOut?: Date | null;
      actualHours?: number;
      workUnits?: number;
      status?: AttendanceStatus;
      note?: string | null;
      verifiedBy: number;
    },
    exec?: Executor,
  ): Promise<void> {
    await query(
      `UPDATE attendances SET
         check_in = COALESCE(@checkIn, check_in),
         check_out = COALESCE(@checkOut, check_out),
         actual_hours = COALESCE(@actualHours, actual_hours),
         work_units = COALESCE(@workUnits, work_units),
         status = COALESCE(@status, status),
         note = COALESCE(@note, note),
         verified_by = @verifiedBy
       WHERE attendance_id = @id`,
      {
        id: [sql.Int, attendanceId],
        checkIn: [sql.DateTime2, d.checkIn ?? null],
        checkOut: [sql.DateTime2, d.checkOut ?? null],
        actualHours: [sql.Decimal(5, 2), d.actualHours ?? null],
        workUnits: [sql.Decimal(3, 2), d.workUnits ?? null],
        status: [sql.VarChar(20), d.status ?? null],
        note: [sql.NVarChar(255), d.note ?? null],
        verifiedBy: [sql.Int, d.verifiedBy],
      },
      exec,
    );
  },

  /** Tìm ca làm việc của ngày hôm nay đã được duyệt/đăng ký cho nhân viên */
  async findScheduleForToday(employeeId: number, dateStr: string, exec?: Executor): Promise<import('../types/attendance.types').ShiftScheduleRow | null> {
    const r = await query<import('../types/attendance.types').ShiftScheduleRow>(
      `SELECT ss.schedule_id AS scheduleId, ss.employee_id AS employeeId, ss.shift_id AS shiftId,
              CONVERT(VARCHAR(10), ss.work_date, 120) AS workDate,
              ss.status, ss.notes, ss.approved_by AS approvedBy, ss.created_at AS createdAt,
              s.shift_code AS shiftCode, s.shift_name AS shiftName,
              CONVERT(VARCHAR(8), s.start_time, 108) AS startTime,
              CONVERT(VARCHAR(8), s.end_time, 108) AS endTime,
              s.standard_hours AS standardHours
       FROM shift_schedules ss
       JOIN shifts s ON s.shift_id = ss.shift_id
       WHERE ss.employee_id = @empId AND ss.work_date = @date AND ss.status IN ('APPROVED', 'REGISTERED')`,
      {
        empId: [sql.Int, employeeId],
        date: [sql.Date, new Date(dateStr)],
      },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  /** Lấy danh sách lịch ca làm việc trong khoảng ngày */
  async listSchedules(p: { from: string; to: string; employeeId?: number }, exec?: Executor): Promise<import('../types/attendance.types').ShiftScheduleRow[]> {
    const r = await query<import('../types/attendance.types').ShiftScheduleRow>(
      `SELECT ss.schedule_id AS scheduleId, ss.employee_id AS employeeId, ss.shift_id AS shiftId,
              CONVERT(VARCHAR(10), ss.work_date, 120) AS workDate,
              ss.status, ss.notes, ss.approved_by AS approvedBy, ss.created_at AS createdAt,
              LTRIM(RTRIM(CONCAT(e.last_name, N' ', e.first_name))) AS employeeName,
              s.shift_code AS shiftCode, s.shift_name AS shiftName,
              CONVERT(VARCHAR(8), s.start_time, 108) AS startTime,
              CONVERT(VARCHAR(8), s.end_time, 108) AS endTime,
              s.standard_hours AS standardHours
       FROM shift_schedules ss
       JOIN employees e ON e.employee_id = ss.employee_id
       JOIN shifts s ON s.shift_id = ss.shift_id
       WHERE ss.work_date >= @from AND ss.work_date <= @to
         AND (@empId IS NULL OR ss.employee_id = @empId)
       ORDER BY ss.work_date ASC, s.start_time ASC`,
      {
        from: [sql.Date, new Date(p.from)],
        to: [sql.Date, new Date(p.to)],
        empId: [sql.Int, p.employeeId ?? null],
      },
      exec,
    );
    return r.recordset;
  },

  /** Lấy tình trạng số lượng người đăng ký theo từng ca trong khoảng ngày */
  async getShiftOccupancy(
    fromDate: string,
    toDate: string,
    employeeId?: number,
    exec?: Executor,
  ): Promise<{ workDate: string; shiftId: number; registeredCount: number; isFull: boolean; myRegistered: boolean }[]> {
    const r = await query<{
      work_date: Date;
      shift_id: number;
      registered_count: number;
      my_count: number;
    }>(
      `SELECT 
         ss.work_date, 
         ss.shift_id, 
         COUNT(*) AS registered_count,
         SUM(CASE WHEN ss.employee_id = @empId THEN 1 ELSE 0 END) AS my_count
       FROM shift_schedules ss
       WHERE ss.work_date >= @from AND ss.work_date <= @to
         AND ss.status IN ('APPROVED', 'REGISTERED')
       GROUP BY ss.work_date, ss.shift_id`,
      {
        from: [sql.Date, new Date(fromDate)],
        to: [sql.Date, new Date(toDate)],
        empId: [sql.Int, employeeId ?? 0],
      },
      exec,
    );

    return r.recordset.map((row) => {
      const regCount = row.registered_count;
      const isMine = (row.my_count ?? 0) > 0;
      return {
        workDate: row.work_date.toISOString().slice(0, 10),
        shiftId: row.shift_id,
        registeredCount: regCount,
        isFull: regCount >= 2,
        myRegistered: isMine,
      };
    });
  },

  /** Đăng ký / Cập nhật lịch làm việc nhiều ngày cho nhân viên part-time (tối đa 2 người/ca) */
  async registerShifts(
    employeeId: number,
    fromDate: string,
    toDate: string,
    entries: { workDate: string; shiftId: number }[],
    exec?: Executor,
  ): Promise<void> {
    // 1. Kiểm tra giới hạn tối đa 2 nhân viên part-time trên mỗi ca
    for (const item of entries) {
      const checkR = await query<{ cnt: number; shift_name: string }>(
        `SELECT COUNT(s.schedule_id) AS cnt, MAX(sh.shift_name) AS shift_name
         FROM shifts sh
         LEFT JOIN shift_schedules s 
           ON s.shift_id = sh.shift_id 
          AND s.work_date = @date 
          AND s.employee_id != @empId 
          AND s.status IN ('APPROVED', 'REGISTERED')
         WHERE sh.shift_id = @shiftId
         GROUP BY sh.shift_id`,
        {
          shiftId: [sql.Int, item.shiftId],
          date: [sql.Date, new Date(item.workDate)],
          empId: [sql.Int, employeeId],
        },
        exec,
      );
      const cnt = checkR.recordset[0]?.cnt ?? 0;
      const shiftName = checkR.recordset[0]?.shift_name ?? `Ca ID ${item.shiftId}`;
      if (cnt >= 2) {
        throw AppError.badRequest(
          `Ca làm việc "${shiftName}" ngày ${item.workDate} đã đủ 2 nhân viên đăng ký. Vui lòng chọn ca khác.`,
        );
      }
    }

    // 2. Xóa các ca đăng ký cũ trong khoảng ngày được chọn (chỉ xóa những ngày chưa diễn ra)
    await query(
      `DELETE FROM shift_schedules
       WHERE employee_id = @empId
         AND work_date >= @from AND work_date <= @to
         AND work_date >= CONVERT(DATE, SYSUTCDATETIME())`,
      {
        empId: [sql.Int, employeeId],
        from: [sql.Date, new Date(fromDate)],
        to: [sql.Date, new Date(toDate)],
      },
      exec,
    );

    // 3. Chèn danh sách ca mới
    for (const item of entries) {
      await query(
        `IF NOT EXISTS (
           SELECT 1 FROM shift_schedules 
           WHERE employee_id = @empId AND shift_id = @shiftId AND work_date = @date
         )
         BEGIN
           INSERT INTO shift_schedules (employee_id, shift_id, work_date, status)
           VALUES (@empId, @shiftId, @date, 'APPROVED');
         END`,
        {
          empId: [sql.Int, employeeId],
          shiftId: [sql.Int, item.shiftId],
          date: [sql.Date, new Date(item.workDate)],
        },
        exec,
      );
    }
  },

  /** Đếm số ca đã đăng ký trong tuần tới */
  async countFutureRegistrations(employeeId: number, fromDateStr: string, toDateStr: string, exec?: Executor): Promise<number> {
    const r = await query<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt
       FROM shift_schedules
       WHERE employee_id = @empId
         AND work_date >= @from AND work_date <= @to
         AND status IN ('APPROVED', 'REGISTERED')`,
      {
        empId: [sql.Int, employeeId],
        from: [sql.Date, new Date(fromDateStr)],
        to: [sql.Date, new Date(toDateStr)],
      },
      exec,
    );
    return r.recordset[0]?.cnt ?? 0;
  },
};
