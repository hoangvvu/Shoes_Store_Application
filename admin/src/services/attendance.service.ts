import { api } from './api';
import type {
  Attendance,
  AttendanceAdminSummaryResponse,
  AttendanceTodayStatus,
  Shift,
  ShiftOccupancy,
  ShiftRegistrationEntry,
  ShiftSchedule,
} from '../types/attendance';

export const attendanceService = {
  async getShifts(): Promise<Shift[]> {
    const res = await api.get<{ success: boolean; data: Shift[] }>('/attendance/shifts');
    return res.data.data;
  },

  async getTodayStatus(): Promise<AttendanceTodayStatus> {
    const res = await api.get<{ success: boolean; data: AttendanceTodayStatus }>('/attendance/status');
    return res.data.data;
  },

  async checkIn(payload?: { shiftId?: number; note?: string }): Promise<Attendance> {
    const res = await api.post<{ success: boolean; data: Attendance }>('/attendance/check-in', payload || {});
    return res.data.data;
  },

  async checkOut(payload?: { note?: string }): Promise<Attendance> {
    const res = await api.post<{ success: boolean; data: Attendance }>('/attendance/check-out', payload || {});
    return res.data.data;
  },

  async getMyHistory(month?: number, year?: number): Promise<Attendance[]> {
    const res = await api.get<{ success: boolean; data: Attendance[] }>('/attendance/my-history', {
      params: { month, year },
    });
    return res.data.data;
  },

  async getAdminSummary(params: { month: number; year: number; employeeId?: number; date?: string }): Promise<AttendanceAdminSummaryResponse> {
    const res = await api.get<{ success: boolean; data: AttendanceAdminSummaryResponse }>('/attendance/summary', { params });
    return res.data.data;
  },

  async adjust(
    attendanceId: number,
    payload: {
      checkIn?: string;
      checkOut?: string;
      actualHours?: number;
      workUnits?: number;
      status?: string;
      note?: string;
    },
  ): Promise<void> {
    await api.put(`/attendance/${attendanceId}/adjust`, payload);
  },

  async getMySchedules(from?: string, to?: string): Promise<ShiftSchedule[]> {
    const res = await api.get<{ success: boolean; data: ShiftSchedule[] }>('/attendance/schedules/my', {
      params: { from, to },
    });
    return res.data.data;
  },

  async getOccupancy(from?: string, to?: string): Promise<ShiftOccupancy[]> {
    const res = await api.get<{ success: boolean; data: ShiftOccupancy[] }>('/attendance/schedules/occupancy', {
      params: { from, to },
    });
    return res.data.data;
  },

  async registerShifts(payload: { entries: ShiftRegistrationEntry[]; fromDate?: string; toDate?: string } | ShiftRegistrationEntry[]): Promise<{ success: boolean; count: number }> {
    const body = Array.isArray(payload) ? { entries: payload } : payload;
    const res = await api.post<{ success: boolean; message: string; data: { success: boolean; count: number } }>(
      '/attendance/schedules/register',
      body,
    );
    return res.data.data;
  },

  async listAllSchedules(params?: { from?: string; to?: string; employeeId?: number }): Promise<ShiftSchedule[]> {
    const res = await api.get<{ success: boolean; data: ShiftSchedule[] }>('/attendance/schedules', {
      params,
    });
    return res.data.data;
  },
};

