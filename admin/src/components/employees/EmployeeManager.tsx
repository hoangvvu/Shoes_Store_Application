import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EMPLOYEE_ROLES, ROLE_LABEL } from '../../config/roles';
import { employeeService } from '../../services/employee.service';
import type { EmployeeRole } from '../../types/auth';
import type { EmployeeDetail } from '../../types/employee';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { getErrorMessage } from '../../utils/error';
import { formatVnd } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { PageHeader } from '../common/PageHeader';
import { SearchBar } from '../common/SearchBar';
import { Pagination } from '../tables/Pagination';
import { EmployeeFormModal } from './EmployeeFormModal';
import { RoleBadge } from './RoleBadge';

const SIZE = 10;

interface EmployeeFilters {
  q: string;
  role: EmployeeRole | '';
}
const EMPTY_FILTERS: EmployeeFilters = { q: '', role: '' };

/** M3 #1 – Danh sách và tìm nhân viên (chỉ ADMIN). */
export function EmployeeManager({ basePath }: { basePath: string }) {
  const { draft, applied, page, setPage, set, apply } = useSearchFilters<EmployeeFilters>(EMPTY_FILTERS);
  const [modal, setModal] = useState<{ employee?: EmployeeDetail } | null>(null);

  const { data, loading, error, reload } = useAsync(
    () => employeeService.list({ q: applied.q.trim() || undefined, role: applied.role || undefined, page, size: SIZE }),
    [applied, page],
  );

  async function remove(id: number, name: string) {
    if (!window.confirm(`Xóa mềm nhân viên "${name}"? Tài khoản đăng nhập cũng bị xóa mềm; lịch sử đơn, phiếu nhập vẫn được giữ.`)) return;
    try {
      await employeeService.remove(id);
      await reload();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  async function toggleLock(userId: number, locked: boolean) {
    try {
      await employeeService.setLocked(userId, !locked);
      await reload();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  async function openEdit(id: number) {
    try {
      setModal({ employee: await employeeService.get(id) });
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Nhân viên & tài khoản"
        subtitle="Hồ sơ, lương cơ bản, vai trò, hiệu suất và trạng thái tài khoản nhân viên"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/admin/reports" className="btn btn--ghost">📈 Báo cáo doanh số</Link>
            <button className="btn btn--primary" onClick={() => setModal({})}>+ Thêm nhân viên</button>
          </div>
        }
      />

      <div className="card">
        <SearchBar onSearch={apply}>
          <input
            className="search"
            placeholder="Tìm theo tên hoặc số điện thoại…"
            value={draft.q}
            onChange={set('q')}
          />
          <select
            className="select"
            value={draft.role}
            onChange={set('role')}
            aria-label="Lọc vai trò"
          >
            <option value="">Tất cả vai trò</option>
            {EMPLOYEE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </SearchBar>

        {error && <p className="form-error">{error}</p>}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Số điện thoại</th>
                <th>Tài khoản</th>
                <th>Vai trò</th>
                <th className="num">Lương cơ bản</th>
                <th>Trạng thái</th>
                <th className="actions-col" />
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="muted center">Đang tải…</td></tr>}
              {!loading && data?.items.length === 0 && <tr><td colSpan={7} className="muted center">Không có nhân viên nào</td></tr>}
              {!loading &&
                data?.items.map((e) => (
                  <tr key={e.employeeId}>
                    <td><Link to={`${basePath}/${e.employeeId}`} className="link">{e.fullName}</Link></td>
                    <td>{e.phone ?? '—'}</td>
                    <td>{e.username ?? <span className="muted">Chưa có</span>}</td>
                    <td>{e.role ? <RoleBadge role={e.role} /> : '—'}</td>
                    <td className="num">{formatVnd(e.baseSalary)}</td>
                    <td>
                      <span className={`badge ${e.isLocked ? 'badge--danger' : 'badge--ok'}`}>{e.isLocked ? 'Đã khóa' : 'Hoạt động'}</span>
                    </td>
                    <td className="actions">
                      <Link to={`${basePath}/${e.employeeId}`} className="btn btn--ghost">Chi tiết</Link>
                      <button className="btn btn--ghost" onClick={() => openEdit(e.employeeId)}>Sửa</button>
                      {e.userId && (
                        <button className="btn btn--ghost" onClick={() => toggleLock(e.userId!, e.isLocked)}>{e.isLocked ? 'Mở khóa' : 'Khóa'}</button>
                      )}
                      <button className="btn btn--danger" onClick={() => remove(e.employeeId, e.fullName)}>Xóa</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />}
      </div>

      {modal && (
        <EmployeeFormModal
          employee={modal.employee}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            void reload();
          }}
        />
      )}
    </>
  );
}
