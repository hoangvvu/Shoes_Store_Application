export type AttendanceStatus = 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'LEAVE_PAID' | 'LEAVE_UNPAID';

export interface ShiftRow {
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  startTime: string; // '08:00:00'
  endTime: string;   // '16:30:00'
  breakMinutes: number;
  standardHours: number;
  targetRole: string | null;
  isActive: boolean;
}

export interface AttendanceRow {
  attendanceId: number;
  employeeId: number;
  shiftId: number | null;
  workDate: string; // YYYY-MM-DD
  checkIn: Date | null;
  checkOut: Date | null;
  actualHours: number;
  workUnits: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  status: AttendanceStatus;
  note: string | null;
  verifiedBy: number | null;
  createdAt: Date;
  // Joins
  employeeName?: string;
  shiftName?: string;
  role?: string;
}

export interface EmployeeAttendanceSummary {
  employeeId: number;
  fullName: string;
  role: string | null;
  employmentType: 'FULL_TIME' | 'PART_TIME';
  totalDays: number;
  totalHours: number;
  lateCount: number;
  absentCount: number;
}

export interface ShiftScheduleRow {
  scheduleId: number;
  employeeId: number;
  employeeName?: string;
  shiftId: number;
  shiftCode?: string;
  shiftName?: string;
  startTime?: string;
  endTime?: string;
  standardHours?: number;
  workDate: string; // YYYY-MM-DD
  status: 'REGISTERED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  notes: string | null;
  approvedBy: number | null;
  createdAt: Date;
}
