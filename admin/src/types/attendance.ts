export type AttendanceStatus = 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'LEAVE_PAID' | 'LEAVE_UNPAID';

export interface Shift {
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  standardHours: number;
  targetRole: string | null;
  isActive: boolean;
}

export interface Attendance {
  attendanceId: number;
  employeeId: number;
  employeeName?: string;
  role?: string;
  shiftId: number | null;
  shiftName?: string;
  workDate: string;
  checkIn: string | null;
  checkOut: string | null;
  actualHours: number;
  workUnits: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  status: AttendanceStatus;
  note: string | null;
  verifiedBy: number | null;
  createdAt: string;
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

export interface AttendanceTodayStatus {
  today: string;
  employeeName?: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME';
  assignedShift?: Shift | null;
  hasTodaySchedule?: boolean;
  attendance: Attendance | null;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  thisWeekRange?: { from: string; to: string };
  nextWeekRange?: { from: string; to: string };
  hasRegisteredNextWeek?: boolean;
  nextWeekShiftCount?: number;
}

export interface ShiftSchedule {
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
  createdAt: string;
}

export interface ShiftRegistrationEntry {
  workDate: string;
  shiftId: number;
}

export interface ShiftOccupancy {
  workDate: string;
  shiftId: number;
  registeredCount: number;
  isFull: boolean;
  myRegistered: boolean;
}

export interface AttendanceAdminSummaryResponse {
  month: number;
  year: number;
  summary: EmployeeAttendanceSummary[];
  details: Attendance[];
}
