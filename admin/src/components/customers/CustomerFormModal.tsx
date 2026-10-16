import { type FormEvent, useState } from 'react';
import { customerService } from '../../services/customer.service';
import type { CustomerListItem } from '../../types/customer';
import { getErrorMessage } from '../../utils/error';
import { GENDER_OPTIONS, todayYmd, validateCustomerBirthDate, validateEmail, type Gender } from '../../utils/person';
import { Modal } from '../common/Modal';

interface Props {
  /** Không truyền = thêm khách tại quầy; có truyền = sửa. */
  customer?: Pick<CustomerListItem, 'customerId' | 'fullName' | 'phone' | 'gender' | 'dateOfBirth' | 'email'>;
  onClose: () => void;
  onSaved: () => void;
}

export function CustomerFormModal({ customer, onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState(customer?.fullName ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [gender, setGender] = useState<'' | Gender>(customer?.gender ?? '');
  const [dob, setDob] = useState(customer?.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (fullName.trim().length < 2) return setError('Họ tên tối thiểu 2 ký tự');
    if (!/^(0|\+84)\d{9}$/.test(phone.trim())) return setError('Số điện thoại không hợp lệ');
    const msg = validateCustomerBirthDate(dob) || validateEmail(email);
    if (msg) return setError(msg);

    setSaving(true);
    try {
      // Thông tin cá nhân không bắt buộc: để trống = xóa giá trị (null) khi sửa, bỏ qua khi thêm mới
      const values = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        gender: (gender || null) as Gender | null,
        dateOfBirth: dob || null,
        email: email.trim() || null,
      };
      if (customer) await customerService.update(customer.customerId, values);
      else await customerService.create(values);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={customer ? 'Sửa thông tin khách hàng' : 'Thêm khách tại quầy'} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <label className="field">
          <span>Họ và tên *</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>Số điện thoại *</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </label>
        <div className="form__row">
          <label className="field">
            <span>Giới tính</span>
            <select className="select" value={gender} onChange={(e) => setGender(e.target.value as '' | Gender)}>
              {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Ngày sinh</span>
            <input type="date" value={dob} max={todayYmd()} min="1900-01-01" onChange={(e) => setDob(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@example.com" maxLength={100} />
        </label>
        <p className="muted">Giới tính, ngày sinh và email không bắt buộc; có thể để trống.{!customer && ' Khách mua trực tiếp không cần tài khoản đăng nhập.'}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}
