import { type FormEvent, useState } from 'react';
import { EMPLOYEE_ROLES, ROLE_LABEL } from '../../config/roles';
import { employeeService } from '../../services/employee.service';
import type { EmployeeRole } from '../../types/auth';
import type { EmployeeDetail, EmploymentType } from '../../types/employee';
import { getErrorMessage } from '../../utils/error';
import { latestBirthDate, validateBirthDate, validatePassword, validatePhone } from '../../utils/validators';
import { Modal } from '../common/Modal';

interface Props {
  /** Không truyền = thêm mới (kèm tài khoản); có truyền = sửa hồ sơ và lương. */
  employee?: EmployeeDetail;
  onClose: () => void;
  onSaved: () => void;
}

/** M3 #3, #4, #7 – Thêm/sửa nhân viên (hỗ trợ Full-time/Part-time, lương giờ, hoa hồng doanh số, phụ cấp). */
export function EmployeeFormModal({ employee, onClose, onSaved }: Props) {
  const isEdit = !!employee;
  const [f, setF] = useState({
    fullName: employee?.fullName ?? '',
    phone: employee?.phone ?? '',
    dateOfBirth: employee?.dateOfBirth?.slice(0, 10) ?? '',
    address: employee?.address ?? '',
    employmentType: (employee?.employmentType ?? 'FULL_TIME') as EmploymentType,
    baseSalary: String(employee?.baseSalary ?? 5000000),
    hourlyRate: String(employee?.hourlyRate ?? 25000),
    commissionRate: String((employee?.commissionRate ?? 0.01) * 100),
    allowance: String(employee?.allowance ?? 0),
    username: '',
    password: '',
    role: 'SALES' as EmployeeRole,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  function validate(): string {
    if (f.fullName.trim().length < 2) return 'Họ tên tối thiểu 2 ký tự';
    if (f.phone.trim()) {
      const m = validatePhone(f.phone);
      if (m) return m;
    }
    if (f.dateOfBirth) {
      const m = validateBirthDate(f.dateOfBirth);
      if (m) return m;
    }
    if (f.employmentType === 'FULL_TIME') {
      const salary = Number(f.baseSalary);
      if (!Number.isFinite(salary) || salary < 0) return 'Lương cơ bản không được âm';
    } else {
      const rate = Number(f.hourlyRate);
      if (!Number.isFinite(rate) || rate < 0) return 'Mức lương theo giờ không được âm';
    }
    const comm = Number(f.commissionRate);
    if (!Number.isFinite(comm) || comm < 0 || comm > 100) return 'Hoa hồng phải từ 0% đến 100%';

    if (!isEdit) {
      if (!/^[A-Za-z0-9_.]{4,50}$/.test(f.username.trim())) return 'Tên đăng nhập 4–50 ký tự, chỉ gồm chữ, số, dấu _ hoặc .';
      const m = validatePassword(f.password);
      if (m) return m.replace('Mật khẩu mới', 'Mật khẩu');
    }
    return '';
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const msg = validate();
    if (msg) return setError(msg);
    setError('');
    setSaving(true);
    const common = {
      fullName: f.fullName.trim(),
      phone: f.phone.trim() || undefined,
      dateOfBirth: f.dateOfBirth || undefined,
      address: f.address.trim() || undefined,
      employmentType: f.employmentType,
      baseSalary: f.employmentType === 'FULL_TIME' ? Number(f.baseSalary) : 0,
      hourlyRate: f.employmentType === 'PART_TIME' ? Number(f.hourlyRate) : 0,
      commissionRate: Number(f.commissionRate) / 100,
      allowance: Number(f.allowance),
    };
    try {
      if (isEdit) await employeeService.update(employee.employeeId, common);
      else await employeeService.create({ ...common, username: f.username.trim(), password: f.password, role: f.role });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên'} onClose={onClose} wide>
      <form onSubmit={submit} className="form" noValidate>
        <div className="form-grid">
          <label className="field">
            <span>Họ và tên *</span>
            <input value={f.fullName} onChange={set('fullName')} autoFocus />
          </label>
          <label className="field">
            <span>Số điện thoại</span>
            <input value={f.phone} onChange={set('phone')} inputMode="tel" placeholder="0xxxxxxxxx" />
          </label>
          <label className="field">
            <span>Ngày sinh</span>
            <input type="date" value={f.dateOfBirth} max={latestBirthDate()} onChange={set('dateOfBirth')} />
          </label>

          <label className="field">
            <span>Hình thức làm việc *</span>
            <select className="select" value={f.employmentType} onChange={set('employmentType')}>
              <option value="FULL_TIME">Full-time (Toàn thời gian)</option>
              <option value="PART_TIME">Part-time (Bán thời gian)</option>
            </select>
          </label>

          {f.employmentType === 'FULL_TIME' ? (
            <>
              <label className="field">
                <span>Lương cơ bản tháng (VND)</span>
                <input type="number" min={0} step={100000} value={f.baseSalary} onChange={set('baseSalary')} />
              </label>
              <label className="field">
                <span>Phụ cấp tháng (VND)</span>
                <input type="number" min={0} step={50000} value={f.allowance} onChange={set('allowance')} placeholder="Ăn trưa, xăng xe..." />
              </label>
            </>
          ) : (
            <label className="field">
              <span>Lương theo giờ (VND / giờ)</span>
              <input type="number" min={0} step={1000} value={f.hourlyRate} onChange={set('hourlyRate')} placeholder="VD: 25000" />
            </label>
          )}

          <label className="field">
            <span>Tỷ lệ hoa hồng doanh số (%)</span>
            <input type="number" min={0} max={100} step={0.1} value={f.commissionRate} onChange={set('commissionRate')} placeholder="VD: 1.0 = 1%" />
          </label>

          <label className="field span-2">
            <span>Địa chỉ</span>
            <input value={f.address} onChange={set('address')} maxLength={255} />
          </label>
        </div>

        {!isEdit && (
          <fieldset className="fieldset">
            <legend>Tài khoản đăng nhập</legend>
            <div className="form-grid">
              <label className="field">
                <span>Tên đăng nhập *</span>
                <input value={f.username} onChange={set('username')} autoComplete="off" />
              </label>
              <label className="field">
                <span>Mật khẩu *</span>
                <input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" />
              </label>
              <label className="field span-2">
                <span>Vai trò *</span>
                <select className="select" value={f.role} onChange={set('role')}>
                  {EMPLOYEE_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="muted small">Hồ sơ và tài khoản được tạo cùng lúc trong 1 giao dịch. Mật khẩu ≥ 8 ký tự, có chữ hoa, chữ thường và số.</p>
          </fieldset>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}
