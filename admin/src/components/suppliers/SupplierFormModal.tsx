import { type FormEvent, useState } from 'react';
import { supplierService } from '../../services/inventory.service';
import type { Supplier } from '../../types/inventory';
import { getErrorMessage } from '../../utils/error';
import { validateEmail, validateSupplierPhone } from '../../utils/validators';
import { Modal } from '../common/Modal';

interface Props {
  supplier?: Supplier;
  onClose: () => void;
  onSaved: () => void;
}

/** M5 #1, #7 – Thêm/sửa nhà cung cấp. Kiểm tra email và số điện thoại theo M5 #7. */
export function SupplierFormModal({ supplier, onClose, onSaved }: Props) {
  const isEdit = !!supplier;
  const [f, setF] = useState({
    supplierName: supplier?.supplierName ?? '',
    phone: supplier?.phone ?? '',
    email: supplier?.email ?? '',
    address: supplier?.address ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  function validate(): string {
    if (!f.supplierName.trim()) return 'Vui lòng nhập tên nhà cung cấp';
    if (f.email.trim()) {
      const err = validateEmail(f.email);
      if (err) return err;
    }
    if (f.phone.trim()) {
      const err = validateSupplierPhone(f.phone);
      if (err) return err;
    }
    return '';
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const msg = validate();
    if (msg) return setError(msg);
    setError('');
    setSaving(true);
    const payload = {
      supplierName: f.supplierName.trim(),
      phone: f.phone.trim(),
      email: f.email.trim(),
      address: f.address.trim(),
    };
    try {
      if (isEdit) await supplierService.update(supplier.supplierId, payload);
      else await supplierService.create(payload);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Sửa thông tin nhà cung cấp' : 'Thêm nhà cung cấp mới'} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <label className="field">
          <span>Tên nhà cung cấp *</span>
          <input value={f.supplierName} onChange={set('supplierName')} autoFocus />
        </label>

        <label className="field">
          <span>Số điện thoại</span>
          <input value={f.phone} onChange={set('phone')} inputMode="tel" placeholder="10–11 chữ số" />
        </label>

        <label className="field">
          <span>Email đối tác</span>
          <input type="email" value={f.email} onChange={set('email')} placeholder="partner@brand.com" />
        </label>

        <label className="field">
          <span>Địa chỉ trụ sở / kho</span>
          <input value={f.address} onChange={set('address')} />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}
