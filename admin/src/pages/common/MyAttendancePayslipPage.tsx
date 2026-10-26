import { useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { QuickAttendance } from '../../components/attendance/QuickAttendance';
import { PartTimeScheduleModal } from '../../components/attendance/PartTimeScheduleModal';
import { attendanceService } from '../../services/attendance.service';
import { payrollService } from '../../services/payroll.service';
import { formatVnd } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';

export default function MyAttendancePayslipPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [tab, setTab] = useState<'attendance' | 'payslip'>('attendance');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Lịch sử chấm công
  const { data: attendances, loading: attLoading, reload: reloadAtt } = useAsync(
    () => attendanceService.getMyHistory(month, year),
    [month, year],
  );

  // Phiếu lương cá nhân
  const { data: payslip, loading: payLoading } = useAsync(
    async () => {
      try {
        return await payrollService.getMyPayslip(month, year);
      } catch {
        return null;
      }
    },
    [month, year],
  );

  const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <PageHeader
        title="Chấm công & Thu nhập của tôi"
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
            <button className="btn btn--ghost" onClick={() => reloadAtt()}>Làm mới</button>
            <button className="btn btn--primary" onClick={() => setShowScheduleModal(true)}>Đăng ký ca làm</button>
          </div>
        }
      />

      {/* Widget Check-in/Check-out nhanh */}
      <QuickAttendance />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button
          className={`btn ${tab === 'attendance' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setTab('attendance')}
        >
          Lịch sử chấm công tháng {month}/{year}
        </button>
        <button
          className={`btn ${tab === 'payslip' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setTab('payslip')}
        >
          Phiếu lương tháng {month}/{year}
        </button>
      </div>

      {tab === 'attendance' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Ca làm việc</th>
                  <th>Giờ vào</th>
                  <th>Giờ ra</th>
                  <th className="num">Giờ thực tế</th>
                  <th className="num">Ngày công</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {attLoading && <tr><td colSpan={8} className="muted center">Đang tải lịch sử…</td></tr>}
                {!attLoading && attendances?.length === 0 && (
                  <tr><td colSpan={8} className="muted center">Chưa có lượt chấm công nào trong tháng {month}/{year}</td></tr>
                )}
                {!attLoading &&
                  attendances?.map((att) => (
                    <tr key={att.attendanceId}>
                      <td><strong>{att.workDate}</strong></td>
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
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'payslip' && (
        <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
          {payLoading && <p className="muted center">Đang tải phiếu lương…</p>}
          {!payLoading && !payslip && (
            <div className="muted center" style={{ padding: '30px 0' }}>
              <p>Chưa có phiếu lương được phê duyệt cho tháng {month}/{year}.</p>
              <p className="small">Quản trị viên thường chốt và phê duyệt bảng lương vào đầu tháng sau.</p>
            </div>
          )}
          {!payLoading && payslip && (
            <div>
              <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
                <h3 style={{ margin: 0 }}>PHIẾU LƯƠNG NHÂN VIÊN</h3>
                <p className="muted small">Kỳ lương: Tháng {month}/{year} | Cửa hàng giày ShoeStore</p>
                <div style={{ marginTop: 8 }}>
                  <span className={`badge ${payslip.employmentType === 'PART_TIME' ? 'badge--info' : 'badge--ok'}`}>
                    {payslip.employmentType === 'PART_TIME' ? 'Nhân viên Part-time' : 'Nhân viên Full-time'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div><strong>Họ và tên:</strong> {payslip.employeeName}</div>
                <div><strong>Vai trò:</strong> {payslip.role}</div>
                <div>
                  <strong>{payslip.employmentType === 'PART_TIME' ? 'Tổng giờ làm:' : 'Công thực tế:'}</strong>{' '}
                  {payslip.employmentType === 'PART_TIME' ? `${payslip.actualWorkHours} giờ` : `${payslip.actualWorkDays} / 26 ngày`}
                </div>
                <div>
                  <strong>{payslip.employmentType === 'PART_TIME' ? 'Lương theo giờ:' : 'Lương cơ bản tháng:'}</strong>{' '}
                  {formatVnd(payslip.baseSalaryOrRate)}
                </div>
              </div>

              <table className="table" style={{ marginBottom: 20 }}>
                <tbody>
                  <tr>
                    <td>Lương theo công / giờ</td>
                    <td className="num" style={{ fontWeight: 600 }}>{formatVnd(payslip.basePay)}</td>
                  </tr>
                  {payslip.salesRevenue > 0 && (
                    <>
                      <tr>
                        <td>Doanh số cá nhân đạt được</td>
                        <td className="num">{formatVnd(payslip.salesRevenue)}</td>
                      </tr>
                      <tr>
                        <td>Hoa hồng doanh số ({Number((payslip.commissionRate * 100).toFixed(1))}%)</td>
                        <td className="num" style={{ color: 'var(--accent-role, #2b8a3e)', fontWeight: 600 }}>
                          +{formatVnd(payslip.commissionAmount)}
                        </td>
                      </tr>
                    </>
                  )}
                  {payslip.kpiBonus > 0 && (
                    <tr>
                      <td>Thưởng hiệu suất kho / KPI</td>
                      <td className="num" style={{ color: 'var(--accent-role, #2b8a3e)', fontWeight: 600 }}>
                        +{formatVnd(payslip.kpiBonus)}
                      </td>
                    </tr>
                  )}
                  {payslip.allowanceAmount > 0 && (
                    <tr>
                      <td>Phụ cấp tháng (ăn trưa, đi lại)</td>
                      <td className="num" style={{ color: 'var(--accent-role, #2b8a3e)' }}>
                        +{formatVnd(payslip.allowanceAmount)}
                      </td>
                    </tr>
                  )}
                  {payslip.bonusAmount > 0 && (
                    <tr>
                      <td>Thưởng chuyên cần / Thưởng nóng</td>
                      <td className="num" style={{ color: 'var(--accent-role, #2b8a3e)' }}>
                        +{formatVnd(payslip.bonusAmount)}
                      </td>
                    </tr>
                  )}
                  {payslip.penaltyAmount > 0 && (
                    <tr>
                      <td>Khoản phạt (đi trễ, vi phạm quy định)</td>
                      <td className="num" style={{ color: 'var(--danger, #e03131)' }}>
                        -{formatVnd(payslip.penaltyAmount)}
                      </td>
                    </tr>
                  )}
                  {payslip.advanceAmount > 0 && (
                    <tr>
                      <td>Đã tạm ứng giữa kỳ</td>
                      <td className="num" style={{ color: 'var(--danger, #e03131)' }}>
                        -{formatVnd(payslip.advanceAmount)}
                      </td>
                    </tr>
                  )}
                  <tr style={{ background: 'var(--bg-subtle, #f8f9fa)', borderTop: '2px solid var(--border)' }}>
                    <td><strong style={{ fontSize: '1.1rem' }}>LƯƠNG THỰC LĨNH</strong></td>
                    <td className="num">
                      <strong style={{ fontSize: '1.2rem', color: 'var(--accent-role, #2b8a3e)' }}>
                        {formatVnd(payslip.netPay)}
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </table>

              {payslip.note && (
                <p className="muted small" style={{ fontStyle: 'italic' }}>
                  * Ghi chú: {payslip.note}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {showScheduleModal && (
        <PartTimeScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onSaved={() => reloadAtt()}
        />
      )}
    </>
  );
}
