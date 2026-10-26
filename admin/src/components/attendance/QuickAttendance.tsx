import { useState } from 'react';
import { attendanceService } from '../../services/attendance.service';
import { getErrorMessage } from '../../utils/error';
import { useAsync } from '../../utils/useAsync';
import { PartTimeScheduleModal } from './PartTimeScheduleModal';

interface Props {
  onStatusChange?: () => void;
}

export function QuickAttendance({ onStatusChange }: Props) {
  const { data: status, loading, reload } = useAsync(() => attendanceService.getTodayStatus(), []);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  async function handleCheckIn() {
    setSubmitting(true);
    setError('');
    try {
      await attendanceService.checkIn({
        note: note.trim() || undefined,
      });
      setNote('');
      await reload();
      onStatusChange?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut() {
    if (!window.confirm('Bạn có chắc chắn muốn kết thúc ca làm việc hôm nay (Check-out)?')) return;
    setSubmitting(true);
    setError('');
    try {
      await attendanceService.checkOut({ note: note.trim() || undefined });
      setNote('');
      await reload();
      onStatusChange?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !status) {
    return <div className="card muted small">Đang kiểm tra ca chấm công…</div>;
  }

  const { isCheckedIn, isCheckedOut, attendance, assignedShift, employmentType, today, hasTodaySchedule } = status;
  const isPartTime = employmentType === 'PART_TIME';
  const noTodayShift = isPartTime && !hasTodaySchedule && !isCheckedIn;

  const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--accent-role, #2b8a3e)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <strong style={{ fontSize: '1.05rem' }}>Chấm công hôm nay ({today})</strong>
              {isCheckedOut ? (
                <span className="badge badge--ok">Đã hoàn thành ca</span>
              ) : isCheckedIn ? (
                <span className="badge badge--info">Đang trong ca làm việc</span>
              ) : noTodayShift ? (
                <span className="badge badge--orange">Hôm nay không có ca</span>
              ) : (
                <span className="badge badge--orange">Chưa vào ca</span>
              )}
              <span className={`badge ${isPartTime ? 'badge--info' : 'badge--ok'}`}>
                {isPartTime ? 'Part-time' : 'Full-time'}
              </span>
            </div>
            <p className="muted small" style={{ margin: '6px 0 0 0' }}>
              {isCheckedOut
                ? `Vào lúc: ${formatTime(attendance?.checkIn)} — Ra lúc: ${formatTime(attendance?.checkOut)} | Tổng giờ: ${attendance?.actualHours}h (${attendance?.workUnits} công)`
                : isCheckedIn
                ? `Đã vào ca lúc: ${formatTime(attendance?.checkIn)} ${attendance?.lateMinutes ? `(Trễ ${attendance.lateMinutes} phút)` : '(Đúng giờ)'} — Ca: ${attendance?.shiftName ?? assignedShift?.shiftName ?? 'Mặc định'}`
                : noTodayShift
                ? 'Bạn chưa đăng ký ca làm việc cho hôm nay. Vui lòng bấm Đăng ký ca làm để chọn ca cho các ngày tiếp theo.'
                : `Ca làm việc phân bổ: ${assignedShift?.shiftName ?? 'Ca chuẩn'} (${assignedShift?.startTime.slice(0, 5)} - ${assignedShift?.endTime.slice(0, 5)})`}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isPartTime && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setShowScheduleModal(true)}
              >
                Đăng ký ca làm
              </button>
            )}

            {!isCheckedIn && !noTodayShift && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleCheckIn}
                disabled={submitting}
              >
                {submitting ? 'Đang gửi…' : 'Vào ca (Check-in)'}
              </button>
            )}

            {noTodayShift && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setShowScheduleModal(true)}
              >
                Chọn ca làm việc
              </button>
            )}

            {isCheckedIn && !isCheckedOut && (
              <button
                type="button"
                className="btn btn--danger"
                onClick={handleCheckOut}
                disabled={submitting}
              >
                {submitting ? 'Đang gửi…' : 'Kết thúc ca (Check-out)'}
              </button>
            )}

            {isCheckedOut && (
              <button type="button" className="btn btn--ghost" onClick={() => reload()}>
                Làm mới
              </button>
            )}
          </div>
        </div>
        {error && <p className="form-error" style={{ marginTop: 10 }}>{error}</p>}
      </div>

      {showScheduleModal && (
        <PartTimeScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onSaved={() => reload()}
        />
      )}
    </>
  );
}
