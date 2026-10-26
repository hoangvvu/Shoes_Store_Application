import { useEffect, useState } from 'react';
import { attendanceService } from '../../services/attendance.service';
import type { AttendanceTodayStatus } from '../../types/attendance';
import { getErrorMessage } from '../../utils/error';
import { Modal } from '../common/Modal';
import { PartTimeScheduleModal } from './PartTimeScheduleModal';

interface Props {
  onCheckInSuccess?: () => void;
}

export function CheckInModalOnLogin({ onCheckInSuccess }: Props) {
  const [status, setStatus] = useState<AttendanceTodayStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function loadStatus() {
    try {
      const data = await attendanceService.getTodayStatus();
      setStatus(data);
      // Nếu hôm nay chưa check-in thì tự động hiển thị modal điểm danh trước khi vào trang chủ
      if (!data.isCheckedIn) {
        setIsOpen(true);
      }
    } catch {
      /* bỏ qua lỗi nếu không phải employee */
    }
  }

  useEffect(() => {
    let mounted = true;
    attendanceService.getTodayStatus().then((data) => {
      if (!mounted) return;
      setStatus(data);
      if (!data.isCheckedIn) {
        setIsOpen(true);
      }
    }).catch(() => {
      /* bỏ qua lỗi nếu không phải employee */
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!isOpen || !status || status.isCheckedIn) {
    if (showScheduleModal) {
      return (
        <PartTimeScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onSaved={() => {
            setShowScheduleModal(false);
            loadStatus();
          }}
        />
      );
    }
    return null;
  }

  const { assignedShift, employmentType, today, employeeName, hasTodaySchedule, hasRegisteredNextWeek } = status;
  const isPartTime = employmentType === 'PART_TIME';
  const noTodayShift = isPartTime && !hasTodaySchedule;

  async function handleCheckIn() {
    setSubmitting(true);
    setError('');
    try {
      await attendanceService.checkIn();
      setSuccessMsg('Điểm danh vào ca thành công! Chúc bạn một ngày làm việc hiệu quả.');
      setTimeout(() => {
        setIsOpen(false);
        onCheckInSuccess?.();
      }, 1200);
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal
        title={noTodayShift ? 'Thông báo ca làm việc' : 'Điểm danh ca làm việc'}
        onClose={() => setIsOpen(false)}
      >
        <div style={{ textAlign: 'center', padding: '10px 0 20px 0' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem' }}>
            Xin chào, {employeeName || 'bạn'}!
          </h3>

          {noTodayShift ? (
            <div style={{ margin: '0 0 20px 0', textAlign: 'left' }}>
              <div
                style={{
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <strong style={{ color: '#c2410c', display: 'block', marginBottom: 6, fontSize: '1rem' }}>
                  Hôm nay bạn không có lịch ca làm việc đã đăng ký ({today})
                </strong>
                <p className="small" style={{ color: '#9a3412', margin: 0, lineHeight: 1.5 }}>
                  Theo quy định xoay ca, nhân viên Part-time bắt buộc phải đăng ký ca làm việc trước ít nhất 1 ngày.
                  Bạn chỉ có thể thực hiện Check-in chấm công vào những ngày đã đăng ký ca thành công.
                </p>
              </div>

              <div
                style={{
                  background: 'var(--bg-subtle, #f8f9fa)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 14,
                  fontSize: '0.9rem',
                }}
              >
                <strong>Hướng dẫn:</strong> Bấm vào nút bên dưới để chọn các ca làm việc mong muốn cho tuần này hoặc tuần tới.
              </div>
            </div>
          ) : (
            <>
              <p className="muted" style={{ margin: '0 0 16px 0' }}>
                Vui lòng thực hiện điểm danh chấm công trước khi bắt đầu công việc hôm nay ({today}).
              </p>

              {isPartTime && !hasRegisteredNextWeek && (
                <div
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 16,
                    textAlign: 'left',
                    fontSize: '0.88rem',
                    color: '#1e40af',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span>Bạn chưa đăng ký lịch làm việc cho tuần tới.</span>
                  <button
                    type="button"
                    className="link font-bold"
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={() => {
                      setIsOpen(false);
                      setShowScheduleModal(true);
                    }}
                  >
                    Đăng ký ca ngay
                  </button>
                </div>
              )}

              <div
                style={{
                  background: 'var(--bg-subtle, #f8f9fa)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 16,
                  textAlign: 'left',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <span className="muted small" style={{ display: 'block' }}>Hình thức làm việc</span>
                    <strong style={{ fontSize: '0.95rem' }}>
                      {isPartTime ? 'Part-time (Bán thời gian)' : 'Full-time (Toàn thời gian)'}
                    </strong>
                  </div>
                  <div>
                    <span className="muted small" style={{ display: 'block' }}>Ca làm việc phân bổ</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--accent-role, #2b8a3e)' }}>
                      {assignedShift?.shiftName ?? (isPartTime ? 'Theo lịch đăng ký' : 'Ca chuẩn')}
                    </strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span className="muted small" style={{ display: 'block' }}>Khung giờ làm việc</span>
                    <span>
                      {assignedShift
                        ? `${assignedShift.startTime.slice(0, 5)} đến ${assignedShift.endTime.slice(0, 5)} (Nghỉ giữa ca: ${assignedShift.breakMinutes} phút)`
                        : 'Theo ca phân bổ'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {error && <p className="form-error" style={{ marginBottom: 16 }}>{error}</p>}
          {successMsg && <p style={{ color: '#2b8a3e', fontWeight: 600, marginBottom: 16 }}>{successMsg}</p>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {noTodayShift ? (
              <button
                type="button"
                className="btn btn--primary"
                style={{ minWidth: 200, padding: '10px 20px', fontSize: '1rem' }}
                onClick={() => {
                  setIsOpen(false);
                  setShowScheduleModal(true);
                }}
              >
                Đăng ký ca làm việc
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary"
                style={{ minWidth: 160, padding: '10px 20px', fontSize: '1rem' }}
                onClick={handleCheckIn}
                disabled={submitting || Boolean(successMsg)}
              >
                {submitting ? 'Đang điểm danh…' : 'Vào ca (Check-in)'}
              </button>
            )}

            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setIsOpen(false)}
              disabled={submitting}
            >
              Vào trang chủ
            </button>
          </div>
        </div>
      </Modal>

      {showScheduleModal && (
        <PartTimeScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onSaved={() => {
            setShowScheduleModal(false);
            loadStatus();
          }}
        />
      )}
    </>
  );
}
