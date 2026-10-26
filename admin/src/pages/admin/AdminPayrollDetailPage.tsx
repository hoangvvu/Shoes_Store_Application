import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { payrollService } from '../../services/payroll.service';
import type { PayrollItem } from '../../types/payroll';
import { getErrorMessage } from '../../utils/error';
import { formatVnd } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';

export default function AdminPayrollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const payrollId = Number(id);

  const { data, loading, error, reload } = useAsync(() => payrollService.getDetail(payrollId), [payrollId]);

  const [editItem, setEditItem] = useState<PayrollItem | null>(null);
  const [form, setForm] = useState({
    bonusAmount: '',
    penaltyAmount: '',
    advanceAmount: '',
    kpiBonus: '',
    allowanceAmount: '',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const summary = useMemo(() => {
    const list = data?.items ?? [];
    return list.reduce(
      (acc, it) => {
        acc.basePay += it.basePay;
        acc.salesRevenue += it.salesRevenue;
        acc.commissionAmount += it.commissionAmount;
        acc.kpiBonus += it.kpiBonus;
        acc.allowanceAmount += it.allowanceAmount;
        acc.bonusAmount += it.bonusAmount;
        acc.penaltyAmount += it.penaltyAmount;
        acc.advanceAmount += it.advanceAmount;
        acc.netPay += it.netPay;
        return acc;
      },
      {
        basePay: 0,
        salesRevenue: 0,
        commissionAmount: 0,
        kpiBonus: 0,
        allowanceAmount: 0,
        bonusAmount: 0,
        penaltyAmount: 0,
        advanceAmount: 0,
        netPay: 0,
      },
    );
  }, [data?.items]);

  const totalGrossIncome =
    summary.basePay +
    summary.commissionAmount +
    summary.kpiBonus +
    summary.allowanceAmount +
    summary.bonusAmount;

  function openEdit(item: PayrollItem) {
    setEditItem(item);
    setForm({
      bonusAmount: String(item.bonusAmount),
      penaltyAmount: String(item.penaltyAmount),
      advanceAmount: String(item.advanceAmount),
      kpiBonus: String(item.kpiBonus),
      allowanceAmount: String(item.allowanceAmount),
      note: item.note ?? '',
    });
    setActionError('');
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    setSubmitting(true);
    setActionError('');
    try {
      await payrollService.updateItem(payrollId, editItem.itemId, {
        bonusAmount: Number(form.bonusAmount),
        penaltyAmount: Number(form.penaltyAmount),
        advanceAmount: Number(form.advanceAmount),
        kpiBonus: Number(form.kpiBonus),
        allowanceAmount: Number(form.allowanceAmount),
        note: form.note.trim() || undefined,
      });
      setEditItem(null);
      await reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!window.confirm('Phê duyệt bảng lương này? Sau khi duyệt, nhân viên có thể xem phiếu lương cá nhân.')) return;
    try {
      await payrollService.approve(payrollId);
      await reload();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  async function handleMarkPaid() {
    if (!window.confirm('Xác nhận đã thanh toán lương cho toàn bộ nhân sự trong kỳ này?')) return;
    try {
      await payrollService.markPaid(payrollId);
      await reload();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  if (loading) return <div className="card muted center">Đang tải chi tiết bảng lương…</div>;
  if (error || !data) return <div className="card form-error">{error || 'Không tìm thấy kỳ lương'}</div>;

  const { payroll, items } = data;

  return (
    <>
      <PageHeader
        title={`Bảng lương Tháng ${payroll.periodMonth} / ${payroll.periodYear}`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/admin/payrolls" className="btn btn--ghost">Danh sách kỳ lương</Link>
            {payroll.status === 'DRAFT' && (
              <button className="btn btn--primary" onClick={handleApprove}>
                Phê duyệt bảng lương
              </button>
            )}
            {payroll.status === 'APPROVED' && (
              <button className="btn btn--primary" onClick={handleMarkPaid}>
                Đánh dấu đã chi trả
              </button>
            )}
          </div>
        }
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <div><strong>Trạng thái:</strong> <span className={`badge ${payroll.status === 'PAID' ? 'badge--ok' : payroll.status === 'APPROVED' ? 'badge--info' : 'badge--warning'}`}>{payroll.status === 'PAID' ? 'Đã chi trả' : payroll.status === 'APPROVED' ? 'Đã phê duyệt' : 'Bản nháp (DRAFT)'}</span></div>
          <div><strong>Số lượng:</strong> {items.length} nhân sự</div>
          <div><strong>Người tạo:</strong> {payroll.createdByName}</div>
          {payroll.approvedByName && <div><strong>Người duyệt:</strong> {payroll.approvedByName} ({new Date(payroll.approvedAt!).toLocaleDateString('vi-VN')})</div>}
          {payroll.paidAt && <div><strong>Đã thanh toán ngày:</strong> {new Date(payroll.paidAt).toLocaleDateString('vi-VN')}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, paddingTop: 14, borderTop: '1px solid var(--border, #e5e7eb)' }}>
          <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <span className="muted small">1. Tổng thu nhập (Gross)</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
              {formatVnd(totalGrossIncome)}
            </div>
            <span className="muted small">Lương công + Hoa hồng + Thưởng + Phụ cấp</span>
          </div>

          <div style={{ padding: '12px 14px', background: summary.advanceAmount > 0 ? '#fff7ed' : '#f8fafc', borderRadius: 8, border: summary.advanceAmount > 0 ? '1px solid #fdba74' : '1px solid #e2e8f0' }}>
            <span className="muted small" style={{ color: summary.advanceAmount > 0 ? '#c2410c' : undefined, fontWeight: summary.advanceAmount > 0 ? 600 : undefined }}>
              2. Đã tạm ứng giữa kỳ (Đã chi)
            </span>
            <div style={{ fontSize: 18, fontWeight: 700, color: summary.advanceAmount > 0 ? '#ea580c' : '#64748b', marginTop: 4 }}>
              {summary.advanceAmount > 0 ? `-${formatVnd(summary.advanceAmount)}` : '0 đ'}
            </div>
            <span className="muted small">Đã khấu trừ vào lương thực lĩnh</span>
          </div>

          <div style={{ padding: '12px 14px', background: summary.penaltyAmount > 0 ? '#fef2f2' : '#f8fafc', borderRadius: 8, border: summary.penaltyAmount > 0 ? '1px solid #fca5a5' : '1px solid #e2e8f0' }}>
            <span className="muted small" style={{ color: summary.penaltyAmount > 0 ? '#dc2626' : undefined, fontWeight: summary.penaltyAmount > 0 ? 600 : undefined }}>
              3. Tiền phạt vi phạm / đi trễ
            </span>
            <div style={{ fontSize: 18, fontWeight: 700, color: summary.penaltyAmount > 0 ? '#dc2626' : '#64748b', marginTop: 4 }}>
              {summary.penaltyAmount > 0 ? `-${formatVnd(summary.penaltyAmount)}` : '0 đ'}
            </div>
            <span className="muted small">Khấu trừ lỗi vi phạm, đi muộn</span>
          </div>

          <div style={{ padding: '12px 14px', background: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0' }}>
            <span className="muted small" style={{ color: '#047857', fontWeight: 600 }}>
              4. Tổng chi trả đợt này (Net Pay)
            </span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#059669', marginTop: 4 }}>
              {formatVnd(payroll.totalAmount)}
            </div>
            <span className="muted small">Lương thực lĩnh còn lại cần chuyển khoản</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Hình thức</th>
                <th>Công / Giờ</th>
                <th className="num">Định mức</th>
                <th className="num">Lương công/giờ</th>
                <th className="num">Doanh số</th>
                <th className="num">Hoa hồng</th>
                <th className="num">Thưởng KPI</th>
                <th className="num">Phụ cấp</th>
                <th className="num">Phạt</th>
                <th className="num">Tạm ứng</th>
                <th className="num">Thực lĩnh</th>
                <th>Ghi chú</th>
                {payroll.status === 'DRAFT' && <th className="actions-col">Sửa</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.itemId}>
                  <td>
                    <div>
                      <strong>{it.employeeName}</strong>
                      <div className="muted small">{it.role}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${it.employmentType === 'PART_TIME' ? 'badge--info' : 'badge--ok'}`}>
                      {it.employmentType === 'PART_TIME' ? 'Part-time' : 'Full-time'}
                    </span>
                  </td>
                  <td>
                    {it.employmentType === 'PART_TIME' ? (
                      <span><strong>{it.actualWorkHours}</strong> giờ</span>
                    ) : (
                      <span><strong>{it.actualWorkDays}</strong> / 26 công</span>
                    )}
                  </td>
                  <td className="num">
                    {it.employmentType === 'PART_TIME' ? (
                      <span>{formatVnd(it.baseSalaryOrRate)}/h</span>
                    ) : (
                      formatVnd(it.baseSalaryOrRate)
                    )}
                  </td>
                  <td className="num">{formatVnd(it.basePay)}</td>
                  <td className="num">{it.salesRevenue > 0 ? formatVnd(it.salesRevenue) : '—'}</td>
                  <td className="num">
                    {it.commissionAmount > 0 ? (
                      <span style={{ color: 'var(--accent-role, #2b8a3e)' }}>+{formatVnd(it.commissionAmount)}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="num">
                    {it.kpiBonus > 0 ? (
                      <span style={{ color: 'var(--accent-role, #2b8a3e)' }}>+{formatVnd(it.kpiBonus)}</span>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="num">{it.allowanceAmount > 0 ? `+${formatVnd(it.allowanceAmount)}` : '0'}</td>
                  <td className="num">{it.penaltyAmount > 0 ? <span style={{ color: 'var(--danger, #e03131)' }}>-{formatVnd(it.penaltyAmount)}</span> : '0'}</td>
                  <td className="num">{it.advanceAmount > 0 ? <span style={{ color: 'var(--danger, #e03131)' }}>-{formatVnd(it.advanceAmount)}</span> : '0'}</td>
                  <td className="num">
                    <strong style={{ color: 'var(--accent-role, #2b8a3e)' }}>{formatVnd(it.netPay)}</strong>
                  </td>
                  <td><small className="muted">{it.note ?? '—'}</small></td>
                  {payroll.status === 'DRAFT' && (
                    <td className="actions">
                      <button className="btn btn--ghost" onClick={() => openEdit(it)}>Điều chỉnh</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #cbd5e1' }}>
                <td colSpan={4}>TỔNG CỘNG ({items.length} nhân viên)</td>
                <td className="num">{formatVnd(summary.basePay)}</td>
                <td className="num">{summary.salesRevenue > 0 ? formatVnd(summary.salesRevenue) : '—'}</td>
                <td className="num" style={{ color: 'var(--accent-role, #2b8a3e)' }}>
                  {summary.commissionAmount > 0 ? `+${formatVnd(summary.commissionAmount)}` : '0'}
                </td>
                <td className="num" style={{ color: 'var(--accent-role, #2b8a3e)' }}>
                  {summary.kpiBonus > 0 ? `+${formatVnd(summary.kpiBonus)}` : '0'}
                </td>
                <td className="num">{summary.allowanceAmount > 0 ? `+${formatVnd(summary.allowanceAmount)}` : '0'}</td>
                <td className="num" style={{ color: summary.penaltyAmount > 0 ? 'var(--danger, #e03131)' : undefined }}>
                  {summary.penaltyAmount > 0 ? `-${formatVnd(summary.penaltyAmount)}` : '0'}
                </td>
                <td className="num" style={{ color: summary.advanceAmount > 0 ? '#ea580c' : undefined }}>
                  {summary.advanceAmount > 0 ? `-${formatVnd(summary.advanceAmount)}` : '0'}
                </td>
                <td className="num" style={{ color: 'var(--accent-role, #2b8a3e)', fontSize: '1.05rem' }}>
                  {formatVnd(payroll.totalAmount)}
                </td>
                <td colSpan={payroll.status === 'DRAFT' ? 2 : 1}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {editItem && (
        <Modal title={`Điều chỉnh lương: ${editItem.employeeName}`} onClose={() => setEditItem(null)}>
          <form onSubmit={handleSaveItem} className="form">
            <div className="form-grid">
              <label className="field">
                <span>Thưởng nóng / Chuyên cần (VND)</span>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  value={form.bonusAmount}
                  onChange={(e) => setForm((s) => ({ ...s, bonusAmount: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Thưởng KPI / Hiệu suất kho (VND)</span>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  value={form.kpiBonus}
                  onChange={(e) => setForm((s) => ({ ...s, kpiBonus: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Khoản phạt vi phạm / đi trễ (VND)</span>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  value={form.penaltyAmount}
                  onChange={(e) => setForm((s) => ({ ...s, penaltyAmount: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Tạm ứng lương giữa kỳ (VND)</span>
                <input
                  type="number"
                  min={0}
                  step={100000}
                  value={form.advanceAmount}
                  onChange={(e) => setForm((s) => ({ ...s, advanceAmount: e.target.value }))}
                />
              </label>
              <label className="field span-2">
                <span>Ghi chú</span>
                <input
                  value={form.note}
                  onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
                  placeholder="Lý do điều chỉnh..."
                />
              </label>
            </div>
            {actionError && <p className="form-error">{actionError}</p>}
            <div className="form__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setEditItem(null)}>Hủy</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
