import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { payrollService } from '../../services/payroll.service';
import type { Payroll } from '../../types/payroll';
import { getErrorMessage } from '../../utils/error';
import { formatVnd } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';

export default function AdminPayrollsPage() {
  const { data: payrolls, loading, error, reload } = useAsync(() => payrollService.list(), []);
  const [generateModal, setGenerateModal] = useState(false);
  const now = new Date();
  const [genMonth, setGenMonth] = useState(now.getMonth() + 1);
  const [genYear, setGenYear] = useState(now.getFullYear());
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setGenError('');
    try {
      await payrollService.generate(genMonth, genYear);
      setGenerateModal(false);
      await reload();
    } catch (err) {
      setGenError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  const getStatusBadge = (status: Payroll['status']) => {
    switch (status) {
      case 'DRAFT':
        return <span className="badge badge--orange">Bản nháp</span>;
      case 'APPROVED':
        return <span className="badge badge--info">Đã phê duyệt</span>;
      case 'PAID':
        return <span className="badge badge--ok">Đã thanh toán</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <>
      <PageHeader
        title="Quản lý Bảng lương"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/admin/attendance" className="btn btn--ghost">Xem bảng chấm công</Link>
            <button className="btn btn--primary" onClick={() => setGenerateModal(true)}>
              + Tính bảng lương mới
            </button>
          </div>
        }
      />

      {error && <p className="form-error">{error}</p>}

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Kỳ lương</th>
                <th>Số nhân sự</th>
                <th className="num">Thực chi đợt cuối</th>
                <th className="num">Đã tạm ứng</th>
                <th className="num">Tổng quỹ lương</th>
                <th>Trạng thái</th>
                <th>Người tạo</th>
                <th>Người duyệt</th>
                <th>Ngày thanh toán</th>
                <th className="actions-col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="muted center">Đang tải danh sách kỳ lương…</td></tr>}
              {!loading && payrolls?.length === 0 && (
                <tr><td colSpan={10} className="muted center">Chưa có bảng lương nào được tạo. Bấm "+ Tính bảng lương mới" để bắt đầu.</td></tr>
              )}
              {!loading &&
                payrolls?.map((p) => (
                  <tr key={p.payrollId}>
                    <td>
                      <Link to={`/admin/payrolls/${p.payrollId}`} className="link" style={{ fontWeight: 600 }}>
                        Tháng {p.periodMonth} / {p.periodYear}
                      </Link>
                    </td>
                    <td>{p.itemCount} nhân viên</td>
                    <td className="num">
                      <strong style={{ color: 'var(--accent-role, #2b8a3e)' }}>{formatVnd(p.totalAmount)}</strong>
                    </td>
                    <td className="num">
                      {p.totalAdvance && p.totalAdvance > 0 ? (
                        <span style={{ color: '#ea580c', fontWeight: 600 }}>{formatVnd(p.totalAdvance)}</span>
                      ) : (
                        <span className="muted">0 đ</span>
                      )}
                    </td>
                    <td className="num">
                      <strong style={{ color: '#1e293b' }}>{formatVnd(p.totalAmount + (p.totalAdvance ?? 0))}</strong>
                    </td>
                    <td>{getStatusBadge(p.status)}</td>
                    <td>{p.createdByName ?? '—'}</td>
                    <td>{p.approvedByName ?? <span className="muted">Chưa duyệt</span>}</td>
                    <td>{p.paidAt ? new Date(p.paidAt).toLocaleDateString('vi-VN') : <span className="muted">Chưa chi trả</span>}</td>
                    <td className="actions">
                      <Link to={`/admin/payrolls/${p.payrollId}`} className="btn btn--ghost">Xem chi tiết</Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {generateModal && (
        <Modal title="Tính toán Bảng lương mới" onClose={() => setGenerateModal(false)}>
          <form onSubmit={handleGenerate} className="form">
            <p className="muted small" style={{ marginBottom: 16 }}>
              Hệ thống sẽ tự động tổng hợp dữ liệu chấm công thực tế, tính lương theo ca/giờ, lấy doanh số bán hàng của nhân viên Sales và thưởng hiệu suất kho để tính lương hoàn chỉnh.
            </p>
            <div className="form-grid">
              <label className="field">
                <span>Chọn tháng</span>
                <select className="select" value={genMonth} onChange={(e) => setGenMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Chọn năm</span>
                <select className="select" value={genYear} onChange={(e) => setGenYear(Number(e.target.value))}>
                  {[2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </label>
            </div>
            {genError && <p className="form-error">{genError}</p>}
            <div className="form__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setGenerateModal(false)}>Hủy</button>
              <button type="submit" className="btn btn--primary" disabled={generating}>
                {generating ? 'Đang tổng hợp & tính toán…' : 'Bắt đầu tính lương'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
