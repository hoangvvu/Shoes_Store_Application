import { type FormEvent, useState } from 'react';
import { getErrorMessage } from '../../utils/error';
import { Modal } from '../common/Modal';

interface Props {
  title: string;
  label: string;
  submitText: string;
  /** true: bắt buộc nhập (ví dụ lý do hủy đơn). */
  required?: boolean;
  danger?: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}

export function OrderActionModal({ title, label, submitText, required, danger, onClose, onSubmit }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (required && !text.trim()) return setError('Vui lòng nhập nội dung bắt buộc');
    setSaving(true);
    setError('');
    try {
      await onSubmit(text.trim());
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate>
        <label className="field">
          <span>{label}{required ? ' *' : ''}</span>
          <textarea className="textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} autoFocus maxLength={500} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Đóng</button>
          <button type="submit" className={`btn ${danger ? 'btn--danger-solid' : 'btn--primary'}`} disabled={saving}>{saving ? 'Đang xử lý…' : submitText}</button>
        </div>
      </form>
    </Modal>
  );
}
