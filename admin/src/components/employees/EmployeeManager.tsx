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
import { ResetPasswordModal } from './ResetPasswordModal';
import { RoleBadge } from './RoleBadge';

const SIZE = 10;

interface EmployeeFilters {
  q: string;
  role: EmployeeRole | '';
  employmentType: string;
}
const EMPTY_FILTERS: EmployeeFilters = { q: '', role: '', employmentType: '' };

/** M3 #1 – Danh sách và tìm nhân viên (chỉ ADMIN). */
export function EmployeeManager({ basePath }: { basePath: string }) {
  const { draft, applied, page, setPage, set, apply } = useSearchFilters<EmployeeFilters>(EMPTY_FILTERS);
  const [modal, setModal] = useState<{ employee?: EmployeeDetail } | null>(null);
  const [resetTarget, setResetTarget] = useState<{
    employeeId: number;
    fullName: string;
    username?: string | null;
    userId?: number | null;
  } | null>(null);

  const { data, loading, error, reload } = useAsync(
    () => employeeService.list({
      q: applied.q.trim() || undefined,
      role: applied.role || undefined,
      employmentType: applied.employmentType || undefined,
      page,
      size: SIZE,
    }),
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
        title="Tài khoản nhân viên"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/admin/attendance" className="btn btn--ghost">Chấm công</Link>
            <Link to="/admin/payrolls" className="btn btn--ghost">Bảng lương</Link>
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
          <select
            className="select"
            value={draft.employmentType}
            onChange={set('employmentType')}
            aria-label="Lọc hình thức"
          >
            <option value="">Tất cả hình thức</option>
            <option value="FULL_TIME">Full-time</option>
            <option value="PART_TIME">Part-time</option>
          </select>
        </SearchBar>

        {error && <p className="form-error">{error}</p>}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Hình thức</th>
                <th>Vai trò</th>
                <th>Tài khoản</th>
                <th className="num">Định mức lương</th>
                <th className="num">Hoa hồng</th>
                <th>Trạng thái</th>
                <th className="actions-col" />
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="muted center">Đang tải…</td></tr>}
              {!loading && data?.items.length === 0 && <tr><td colSpan={8} className="muted center">Không có nhân viên nào</td></tr>}
              {!loading &&
                data?.items.map((e) => (
                  <tr key={e.employeeId}>
                    <td>
                      <div>
                        <Link to={`${basePath}/${e.employeeId}`} className="link" style={{ fontWeight: 600 }}>{e.fullName}</Link>
                        <div className="muted small">{e.phone ?? 'Chưa có SĐT'}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${e.employmentType === 'PART_TIME' ? 'badge--info' : 'badge--ok'}`}>
                        {e.employmentType === 'PART_TIME' ? 'Part-time' : 'Full-time'}
                      </span>
                    </td>
                    <td>{e.role ? <RoleBadge role={e.role} /> : '—'}</td>
                    <td>{e.username ?? <span className="muted">Chưa có</span>}</td>
                    <td className="num">
                      {e.employmentType === 'PART_TIME' ? (
                        <span><strong>{formatVnd(e.hourlyRate)}</strong><small className="muted">/giờ</small></span>
                      ) : (
                        <div>
                          <strong>{formatVnd(e.baseSalary)}</strong>
                          {e.allowance > 0 && <div className="muted small">+{formatVnd(e.allowance)} PC</div>}
                        </div>
                      )}
                    </td>
                    <td className="num">{Number((e.commissionRate * 100).toFixed(1))}%</td>
                    <td>
                      <span className={`badge ${e.isLocked ? 'badge--danger' : 'badge--ok'}`}>{e.isLocked ? 'Đã khóa' : 'Hoạt động'}</span>
                    </td>
                    <td className="actions">
                      <div className="actions-group">
                        <Link to={`${basePath}/${e.employeeId}`} className="btn btn--ghost">Chi tiết</Link>
                        <button className="btn btn--ghost" onClick={() => openEdit(e.employeeId)}>Sửa</button>
                        {e.userId && (
                          <>
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={() =>
                                setResetTarget({
                                  employeeId: e.employeeId,
                                  fullName: e.fullName,
                                  username: e.username,
                                  userId: e.userId,
                                })
                              }
                            >
                              Cấp lại MK
                            </button>
                            <button className="btn btn--ghost" onClick={() => toggleLock(e.userId!, e.isLocked)}>
                              {e.isLocked ? 'Mở khóa' : 'Khóa'}
                            </button>
                          </>
                        )}
                        <button className="btn btn--danger" onClick={() => remove(e.employeeId, e.fullName)}>Xóa</button>
                      </div>
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

      {resetTarget && (
        <ResetPasswordModal
          employee={resetTarget}
          onClose={() => setResetTarget(null)}
          onSuccess={() => void reload()}
        />
      )}
    </>
  );
}
