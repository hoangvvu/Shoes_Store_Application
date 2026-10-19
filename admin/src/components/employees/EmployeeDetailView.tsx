import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { employeeService } from '../../services/employee.service';
import { formatDateTime, formatNumber, formatVnd, lastDays } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { formatYmdVn } from '../../utils/validators';
import { DateRangeFilter, LoadState, StatCard } from '../common/Widgets';
import { EmployeeFormModal } from './EmployeeFormModal';
import { RoleBadge } from './RoleBadge';

interface Props {
  basePath: string;
}

/** M3 #2, #6 – Chi tiết nhân viên và thống kê hiệu suất / doanh số. */
export function EmployeeDetailView({ basePath }: Props) {
  const { id } = useParams<{ id: string }>();
  const employeeId = Number(id);
  const [range, setRange] = useState(lastDays(30));
  const [editing, setEditing] = useState(false);

  const { data: employee, loading: empLoading, error: empError, reload: reloadEmp } = useAsync(
    () => employeeService.get(employeeId),
    [employeeId],
  );

  const { data: perf, loading: perfLoading, error: perfError, reload: reloadPerf } = useAsync(
    () => employeeService.performance(employeeId, range),
    [employeeId, range],
  );

  if (empLoading) return <LoadState loading={true} error="" />;
  if (empError || !employee) return <LoadState loading={false} error={empError || 'Không tìm thấy nhân viên'} />;

  return (
    <>
      <div className="page-header">
        <div>
          <Link to={basePath} className="link small">‹ Danh sách nhân viên</Link>
          <h1 style={{ marginTop: 4 }}>{employee.fullName}</h1>
          <p className="muted">Mã nhân viên: #{employee.employeeId}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={() => setEditing(true)}>Sửa thông tin</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Thông tin cá nhân & công việc</h3>
          <dl className="kv">
            <dt>Họ và tên</dt>
            <dd><strong>{employee.fullName}</strong></dd>
            <dt>Số điện thoại</dt>
            <dd>{employee.phone || '—'}</dd>
            <dt>Ngày sinh</dt>
            <dd>{formatYmdVn(employee.dateOfBirth)}</dd>
            <dt>Địa chỉ</dt>
            <dd>{employee.address || '—'}</dd>
            <dt>Lương cơ bản</dt>
            <dd><strong style={{ color: '#059669' }}>{formatVnd(employee.baseSalary)}</strong></dd>
          </dl>
        </div>

        <div className="card">
          <h3>Tài khoản hệ thống</h3>
          <dl className="kv">
            <dt>Tên đăng nhập</dt>
            <dd>{employee.username ? <code>{employee.username}</code> : <span className="muted">Chưa liên kết</span>}</dd>
            <dt>Vai trò</dt>
            <dd>{employee.role ? <RoleBadge role={employee.role} /> : '—'}</dd>
            <dt>Trạng thái</dt>
            <dd>
              <span className={`badge ${employee.isLocked ? 'badge--danger' : 'badge--ok'}`}>
                {employee.isLocked ? 'Tài khoản bị khóa' : 'Đang hoạt động'}
              </span>
            </dd>
            <dt>Ngày tạo</dt>
            <dd>{employee.createdAt ? formatDateTime(employee.createdAt) : '—'}</dd>
          </dl>
        </div>
      </div>

      <div className="card">
        <div className="page-header" style={{ marginBottom: 16 }}>
          <div>
            <h3>Hiệu suất & Doanh số</h3>
            <p className="muted">Thống kê số lượng đơn hàng và doanh thu do nhân viên này lập</p>
          </div>
          <DateRangeFilter value={range} onChange={setRange} />
        </div>

        {perfLoading && <LoadState loading={true} error="" />}
        {perfError && <p className="form-error">{perfError}</p>}

        {perf && (
          <div className="stats-grid">
            <StatCard
              label="Tổng số đơn lập"
              value={formatNumber(perf.totalOrders)}
              icon="cart"
              hint="Đơn hàng được gán cho nhân viên"
              tone="blue"
            />
            <StatCard
              label="Đơn đã giao thành công"
              value={formatNumber(perf.deliveredOrders)}
              icon="trend"
              hint="Đơn hàng chuyển DELIVERED"
              tone="green"
            />
            <StatCard
              label="Doanh thu thực tế"
              value={formatVnd(perf.revenue)}
              icon="wallet"
              hint="Tổng tiền thu từ đơn đã giao"
              tone="violet"
            />
          </div>
        )}
      </div>

      {editing && (
        <EmployeeFormModal
          employee={employee}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            void reloadEmp();
            void reloadPerf();
          }}
        />
      )}
    </>
  );
}
