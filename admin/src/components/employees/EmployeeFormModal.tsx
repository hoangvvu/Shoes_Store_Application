import { type FormEvent, useState } from 'react';
import { EMPLOYEE_ROLES, ROLE_LABEL } from '../../config/roles';
import { employeeService } from '../../services/employee.service';
import type { EmployeeRole } from '../../types/auth';
import type { EmployeeDetail } from '../../types/employee';
import { getErrorMessage } from '../../utils/error';
import { latestBirthDate, validateBirthDate, validatePassword, validatePhone } from '../../utils/validators';
import { Modal } from '../common/Modal';

interface Props {
  /** Không truyền = thêm mới (kèm tài khoản); có truyền = sửa hồ sơ và lương. */
  employee?: EmployeeDetail;
  onClose: () => void;
  onSaved: () => void;
}

/** M3 #3, #4, #7 – Thêm/sửa nhân viên. Kiểm tra SĐT (10–11 số, bắt đầu 0) và tuổi ≥ 18 ở client; backend kiểm tra lại. */
export function EmployeeFormModal({ employee, onClose, onSaved }: Props) {
  const isEdit = !!employee;
  const [f, setF] = useState({
    fullName: employee?.fullName ?? '',
    phone: employee?.phone ?? '',
    dateOfBirth: employee?.dateOfBirth?.slice(0, 10) ?? '',
    address: employee?.address ?? '',
    baseSalary: String(employee?.baseSalary ?? 0),
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
    const salary = Number(f.baseSalary);
    if (!Number.isFinite(salary) || salary < 0) return 'Lương cơ bản không được âm';
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
      baseSalary: Number(f.baseSalary),
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
            <span>Lương cơ bản (VND)</span>
            <input type="number" min={0} step={100000} value={f.baseSalary} onChange={set('baseSalary')} />
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
