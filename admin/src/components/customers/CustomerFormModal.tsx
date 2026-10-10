import { type FormEvent, useState } from 'react';
import { customerService } from '../../services/customer.service';
import type { CustomerListItem } from '../../types/customer';
import { getErrorMessage } from '../../utils/error';
import { Modal } from '../common/Modal';

interface Props {
  /** Không truyền = thêm khách tại quầy; có truyền = sửa. */
  customer?: Pick<CustomerListItem, 'customerId' | 'fullName' | 'phone'>;
  onClose: () => void;
  onSaved: () => void;
}

export function CustomerFormModal({ customer, onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState(customer?.fullName ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (fullName.trim().length < 2) return setError('Họ tên tối thiểu 2 ký tự');
    if (!/^(0|\+84)\d{9}$/.test(phone.trim())) return setError('Số điện thoại không hợp lệ');
    setSaving(true);
    try {
      const values = { fullName: fullName.trim(), phone: phone.trim() };
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
          <span>Họ và tên</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>Số điện thoại</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </label>
        {!customer && <p className="muted">Khách mua trực tiếp không cần tài khoản đăng nhập.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}
