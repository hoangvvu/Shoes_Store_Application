import { useEffect, useMemo, useState } from 'react';
import { attendanceService } from '../../services/attendance.service';
import type { Shift, ShiftOccupancy, ShiftRegistrationEntry } from '../../types/attendance';
import { getErrorMessage } from '../../utils/error';
import { ymd } from '../../utils/format';
import { Modal } from '../common/Modal';

interface Props {
  onClose: () => void;
  onSaved?: () => void;
  initialWeekOffset?: 0 | 1;
}

interface DayCol {
  dateStr: string;
  label: string;
  shortDate: string;
  isPast: boolean;
  isToday: boolean;
}

function computeWeekDays(weekOffset: number): DayCol[] {
  const now = new Date();
  const day = now.getDay();
  // Monday as first day: diff = (0 => -6, 1 => 0, 2 => -1, ...)
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday + weekOffset * 7);

  const todayStr = ymd(now);
  const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  const res: DayCol[] = [];

  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dateStr = ymd(cur);
    res.push({
      dateStr,
      label: dayLabels[i],
      shortDate: `${cur.getDate()}/${cur.getMonth() + 1}`,
      isPast: dateStr < todayStr,
      isToday: dateStr === todayStr,
    });
  }
  return res;
}

export function PartTimeScheduleModal({ onClose, onSaved, initialWeekOffset = 1 }: Props) {
  const [weekOffset, setWeekOffset] = useState<0 | 1>(initialWeekOffset);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [occupancies, setOccupancies] = useState<ShiftOccupancy[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const days = useMemo(() => computeWeekDays(weekOffset), [weekOffset]);
  const fromDate = days[0].dateStr;
  const toDate = days[6].dateStr;

  // Lọc chỉ các ca Part-time (Sáng, Chiều, Tối)
  const partTimeShifts = useMemo(() => {
    return shifts
      .filter((s) => s.targetRole === 'PART_TIME' || s.shiftCode.startsWith('CA_PT'))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [shifts]);

  // Map occupancy theo key "workDate_shiftId"
  const occupancyMap = useMemo(() => {
    const map = new Map<string, ShiftOccupancy>();
    for (const item of occupancies) {
      map.set(`${item.workDate}_${item.shiftId}`, item);
    }
    return map;
  }, [occupancies]);

  // Load shifts, existing schedules, and occupancy
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    Promise.all([
      attendanceService.getShifts(),
      attendanceService.getMySchedules(fromDate, toDate),
      attendanceService.getOccupancy(fromDate, toDate),
    ])
      .then(([shiftsData, schedulesData, occData]) => {
        if (!mounted) return;
        setShifts(shiftsData);
        setOccupancies(occData);

        const newSet = new Set<string>();
        for (const s of schedulesData) {
          if (s.status !== 'CANCELLED' && s.status !== 'REJECTED') {
            newSet.add(`${s.workDate}_${s.shiftId}`);
          }
        }
        setSelectedKeys(newSet);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [fromDate, toDate]);

  function toggleShift(dateStr: string, shiftId: number, isPast: boolean, isFullForMe: boolean) {
    if (isPast || isFullForMe) return; // Không cho phép chỉnh sửa ngày đã qua hoặc ca đã hết slot
    const key = `${dateStr}_${shiftId}`;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Thống kê số ca và giờ
  const stats = useMemo(() => {
    let count = 0;
    let totalHours = 0;

    for (const key of selectedKeys) {
      const [dStr, sIdStr] = key.split('_');
      // Chỉ tính các ngày trong tuần hiện đang hiển thị
      if (dStr >= fromDate && dStr <= toDate) {
        count++;
        const s = shifts.find((x) => x.shiftId === Number(sIdStr));
        totalHours += s?.standardHours ?? 4.5;
      }
    }

    return { count, totalHours };
  }, [selectedKeys, fromDate, toDate, shifts]);

  async function handleSave() {
    setError('');
    setSuccessMsg('');
    setSaving(true);

    const entries: ShiftRegistrationEntry[] = [];
    for (const key of selectedKeys) {
      const [workDate, sIdStr] = key.split('_');
      // Chỉ lấy các ca trong tuần này/tuần tới đang chọn
      if (workDate >= fromDate && workDate <= toDate) {
        entries.push({
          workDate,
          shiftId: Number(sIdStr),
        });
      }
    }

    try {
      await attendanceService.registerShifts({
        entries,
        fromDate,
        toDate,
      });
      setSuccessMsg('Đã cập nhật lịch đăng ký ca làm việc thành công!');
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 1200);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title="Đăng ký ca làm việc Part-time" onClose={onClose} wide>
      <div style={{ padding: '4px 0' }}>
        <p className="muted" style={{ margin: '0 0 16px 0', fontSize: '0.95rem' }}>
          Mỗi ca làm việc giới hạn tối đa <strong>2 nhân viên part-time</strong>. Khi ca đã đủ 2 người đăng ký, hệ thống sẽ ẩn ca đó để đảm bảo phân bổ nhân sự hợp lý.
        </p>

        {/* Chuyển tuần */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
          <button
            type="button"
            className={`btn ${weekOffset === 0 ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setWeekOffset(0)}
          >
            Tuần này
          </button>
          <button
            type="button"
            className={`btn ${weekOffset === 1 ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setWeekOffset(1)}
          >
            Tuần tới (Đăng ký mới)
          </button>
          <span className="muted small" style={{ marginLeft: 'auto' }}>
            Thời gian: <strong>{fromDate}</strong> đến <strong>{toDate}</strong>
          </span>
        </div>

        {error && <p className="form-error" style={{ marginBottom: 14 }}>{error}</p>}
        {successMsg && <p style={{ color: '#2b8a3e', fontWeight: 600, marginBottom: 14 }}>{successMsg}</p>}

        {loading ? (
          <div className="card muted" style={{ textAlign: 'center', padding: 30 }}>
            Đang tải dữ liệu ca làm việc…
          </div>
        ) : (
          <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <table className="table" style={{ margin: 0, textAlign: 'center' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle, #f8f9fa)' }}>
                  <th style={{ width: 170, textAlign: 'left' }}>Ca làm việc</th>
                  {days.map((d) => (
                    <th
                      key={d.dateStr}
                      style={{
                        minWidth: 108,
                        background: d.isToday ? 'rgba(59, 130, 246, 0.08)' : undefined,
                        borderBottom: d.isToday ? '2px solid #3b82f6' : undefined,
                      }}
                    >
                      <div><strong>{d.label}</strong></div>
                      <div className="muted small" style={{ fontSize: '0.8rem', marginTop: 2 }}>
                        {d.shortDate} {d.isToday && <span style={{ color: '#3b82f6', fontWeight: 700 }}>(Hôm nay)</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partTimeShifts.map((shift) => (
                  <tr key={shift.shiftId}>
                    <td style={{ textAlign: 'left' }}>
                      <strong style={{ display: 'block', fontSize: '0.95rem' }}>{shift.shiftName}</strong>
                      <span className="muted small">
                        {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)} ({shift.standardHours}h)
                      </span>
                    </td>
                    {days.map((d) => {
                      const key = `${d.dateStr}_${shift.shiftId}`;
                      const isSelected = selectedKeys.has(key);
                      const occ = occupancyMap.get(key);
                      const isRegisteredInDb = occ?.myRegistered ?? false;
                      const baseOtherCount = (occ?.registeredCount ?? 0) - (isRegisteredInDb ? 1 : 0);
                      const isFullForMe = baseOtherCount >= 2;

                      return (
                        <td
                          key={d.dateStr}
                          style={{
                            background: d.isToday ? 'rgba(59, 130, 246, 0.04)' : undefined,
                            verticalAlign: 'middle',
                            cursor: d.isPast || isFullForMe ? 'not-allowed' : 'pointer',
                            opacity: d.isPast ? 0.45 : 1,
                          }}
                          onClick={() => toggleShift(d.dateStr, shift.shiftId, d.isPast, isFullForMe)}
                        >
                          {d.isPast ? (
                            <span className="muted small">Đã qua</span>
                          ) : isFullForMe && !isSelected ? (
                            <div
                              style={{
                                padding: '6px 4px',
                                fontSize: '0.82rem',
                                color: '#b91c1c',
                                background: '#fee2e2',
                                borderRadius: 6,
                                fontWeight: 600,
                                border: '1px solid #fecaca',
                              }}
                            >
                              Hết chỗ (2/2)
                            </div>
                          ) : (
                            <div>
                              <button
                                type="button"
                                className={`btn ${isSelected ? 'btn--primary' : 'btn--ghost'}`}
                                style={{
                                  width: '100%',
                                  padding: '7px 4px',
                                  fontSize: '0.85rem',
                                  borderColor: isSelected ? undefined : 'var(--border)',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleShift(d.dateStr, shift.shiftId, d.isPast, isFullForMe);
                                }}
                              >
                                {isSelected ? 'Đã chọn' : 'Chọn ca'}
                              </button>
                              <div className="muted small" style={{ fontSize: '0.75rem', marginTop: 3 }}>
                                {isSelected
                                  ? `(Slot ${baseOtherCount + 1}/2)`
                                  : baseOtherCount === 1
                                  ? 'Còn 1 chỗ'
                                  : 'Còn 2 chỗ'}
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tóm tắt & Nút lưu */}
        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: 'var(--bg-subtle, #f8f9fa)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div>
                <span className="muted small" style={{ display: 'block' }}>Tổng số ca đăng ký</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--accent-role, #2b8a3e)' }}>
                  {stats.count} ca
                </strong>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
                <span className="muted small" style={{ display: 'block' }}>Tổng giờ làm dự kiến</span>
                <strong style={{ fontSize: '1.1rem' }}>
                  {stats.totalHours.toFixed(1)} giờ
                </strong>
              </div>
            </div>
            <p className="muted small" style={{ margin: '6px 0 0 0' }}>
              Quy tắc: Tối đa 2 nhân viên/ca. Đăng ký trước ít nhất 1 ngày để hệ thống cấp quyền Check-in khi vào ca.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onClose}
              disabled={saving}
            >
              Đóng
            </button>
            <button
              type="button"
              className="btn btn--primary"
              style={{ minWidth: 150 }}
              onClick={handleSave}
              disabled={saving || loading || Boolean(successMsg)}
            >
              {saving ? 'Đang lưu…' : 'Lưu đăng ký ca làm'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
