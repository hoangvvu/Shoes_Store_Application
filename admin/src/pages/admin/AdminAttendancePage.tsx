import { useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { attendanceService } from '../../services/attendance.service';
import type { Attendance } from '../../types/attendance';
import { getErrorMessage } from '../../utils/error';
import { useAsync } from '../../utils/useAsync';

export default function AdminAttendancePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [tab, setTab] = useState<'summary' | 'details'>('summary');
  const [editModal, setEditModal] = useState<Attendance | null>(null);
  const [adjustForm, setAdjustForm] = useState({ actualHours: '', workUnits: '', status: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const { data, loading, error, reload } = useAsync(
    () => attendanceService.getAdminSummary({ month, year }),
    [month, year],
  );

  function openEdit(att: Attendance) {
    setEditModal(att);
    setAdjustForm({
      actualHours: String(att.actualHours),
      workUnits: String(att.workUnits),
      status: att.status,
      note: att.note ?? '',
    });
    setActionError('');
  }

  async function handleSaveAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!editModal) return;
    setSubmitting(true);
    setActionError('');
    try {
      await attendanceService.adjust(editModal.attendanceId, {
        actualHours: Number(adjustForm.actualHours),
        workUnits: Number(adjustForm.workUnits),
        status: adjustForm.status,
        note: adjustForm.note.trim() || undefined,
      });
      setEditModal(null);
      await reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <PageHeader
        title="Quản lý Chấm công & Ca làm việc"
        actions={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select className="select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
            <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>Năm {y}</option>
              ))}
            </select>
            <button className="btn btn--ghost" onClick={() => reload()}>Làm mới</button>
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button
          className={`btn ${tab === 'summary' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setTab('summary')}
        >
          Tổng hợp tháng {month}/{year}
        </button>
        <button
          className={`btn ${tab === 'details' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setTab('details')}
        >
          Danh sách chi tiết lượt chấm công
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {tab === 'summary' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Vai trò</th>
                  <th>Hình thức</th>
                  <th className="num">Tổng ngày công (FT)</th>
                  <th className="num">Tổng giờ làm (PT)</th>
                  <th className="num">Số lần trễ</th>
                  <th className="num">Số lần vắng</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="muted center">Đang tải bảng công…</td></tr>}
                {!loading && data?.summary.length === 0 && (
                  <tr><td colSpan={7} className="muted center">Chưa có dữ liệu chấm công trong tháng {month}/{year}</td></tr>
                )}
                {!loading &&
                  data?.summary.map((row) => (
                    <tr key={row.employeeId}>
                      <td><strong>{row.fullName}</strong></td>
                      <td>{row.role ?? '—'}</td>
                      <td>
                        <span className={`badge ${row.employmentType === 'PART_TIME' ? 'badge--info' : 'badge--ok'}`}>
                          {row.employmentType === 'PART_TIME' ? 'Part-time' : 'Full-time'}
                        </span>
                      </td>
                      <td className="num">
                        <strong style={{ color: 'var(--accent-role, #2b8a3e)' }}>{row.totalDays}</strong> công
                      </td>
                      <td className="num">
                        <strong>{row.totalHours}</strong> giờ
                      </td>
                      <td className="num">
                        {row.lateCount > 0 ? (
                          <span className="badge badge--danger">{row.lateCount} lần</span>
                        ) : (
                          <span className="muted">0</span>
                        )}
                      </td>
                      <td className="num">{row.absentCount > 0 ? <span className="badge badge--danger">{row.absentCount}</span> : '0'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'details' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Nhân viên</th>
                  <th>Ca làm việc</th>
                  <th>Giờ vào</th>
                  <th>Giờ ra</th>
                  <th className="num">Giờ làm</th>
                  <th className="num">Công</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                  <th className="actions-col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={10} className="muted center">Đang tải chi tiết…</td></tr>}
                {!loading && data?.details.length === 0 && (
                  <tr><td colSpan={10} className="muted center">Không có lượt chấm công nào trong tháng {month}/{year}</td></tr>
                )}
                {!loading &&
                  data?.details.map((att) => (
                    <tr key={att.attendanceId}>
                      <td>{att.workDate}</td>
                      <td>
                        <strong>{att.employeeName}</strong>
                        <div className="muted small">{att.role}</div>
                      </td>
                      <td>{att.shiftName ?? 'Ca tự do'}</td>
                      <td>{formatTime(att.checkIn)}</td>
                      <td>{formatTime(att.checkOut)}</td>
                      <td className="num"><strong>{att.actualHours}</strong>h</td>
                      <td className="num">{att.workUnits}</td>
                      <td>
                        <span className={`badge ${att.status === 'LATE' ? 'badge--orange' : att.status === 'PRESENT' ? 'badge--ok' : 'badge--danger'}`}>
                          {att.status === 'LATE' ? `Trễ (${att.lateMinutes}p)` : att.status === 'PRESENT' ? 'Đúng giờ' : att.status}
                        </span>
                      </td>
                      <td>{att.note ?? '—'}</td>
                      <td className="actions">
                        <button className="btn btn--ghost" onClick={() => openEdit(att)}>Điều chỉnh</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editModal && (
        <Modal title={`Điều chỉnh công: ${editModal.employeeName} (${editModal.workDate})`} onClose={() => setEditModal(null)}>
          <form onSubmit={handleSaveAdjust} className="form">
            <div className="form-grid">
              <label className="field">
                <span>Số giờ làm việc thực tế</span>
                <input
                  type="number"
                  step={0.1}
                  value={adjustForm.actualHours}
                  onChange={(e) => setAdjustForm((s) => ({ ...s, actualHours: e.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>Số ngày công quy đổi</span>
                <input
                  type="number"
                  step={0.1}
                  value={adjustForm.workUnits}
                  onChange={(e) => setAdjustForm((s) => ({ ...s, workUnits: e.target.value }))}
                  required
                />
              </label>
              <label className="field span-2">
                <span>Trạng thái</span>
                <select
                  className="select"
                  value={adjustForm.status}
                  onChange={(e) => setAdjustForm((s) => ({ ...s, status: e.target.value }))}
                >
                  <option value="PRESENT">PRESENT (Đi làm đủ)</option>
                  <option value="LATE">LATE (Đi trễ)</option>
                  <option value="HALF_DAY">HALF_DAY (Nửa ca)</option>
                  <option value="ABSENT">ABSENT (Vắng)</option>
                  <option value="LEAVE_PAID">LEAVE_PAID (Nghỉ phép có lương)</option>
                  <option value="LEAVE_UNPAID">LEAVE_UNPAID (Nghỉ không lương)</option>
                </select>
              </label>
              <label className="field span-2">
                <span>Ghi chú lý do điều chỉnh</span>
                <input
                  value={adjustForm.note}
                  onChange={(e) => setAdjustForm((s) => ({ ...s, note: e.target.value }))}
                  placeholder="VD: Quên bấm check-out, đã xác nhận với quản lý"
                />
              </label>
            </div>
            {actionError && <p className="form-error">{actionError}</p>}
            <div className="form__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setEditModal(null)}>Hủy</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Đang lưu…' : 'Lưu điều chỉnh'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
