import { type FormEvent, useState } from 'react';
import { profileService } from '../../services/profile.service';
import { getErrorMessage } from '../../utils/error';
import { PASSWORD_RULES, validatePassword } from '../../utils/validators';

/** Tab "Đổi mật khẩu". */
export function ChangePasswordCard() {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!oldPw) return setError('Vui lòng nhập mật khẩu hiện tại');
    const msg = validatePassword(newPw);
    if (msg) return setError(msg);
    if (newPw === oldPw) return setError('Mật khẩu mới phải khác mật khẩu hiện tại');
    if (newPw !== confirmPw) return setError('Mật khẩu nhập lại không khớp');

    setSaving(true);
    try {
      await profileService.changePassword(oldPw, newPw);
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
      setSuccess('Đổi mật khẩu thành công');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="profile__head">
        <div>
          <h3>Đổi mật khẩu</h3>
          <p className="muted">Nên dùng mật khẩu mạnh và không dùng lại mật khẩu ở nơi khác.</p>
        </div>
      </header>
      <form className="form profile__form" onSubmit={submit} noValidate autoComplete="off">
        <label className="field"><span>Mật khẩu hiện tại</span><input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} autoComplete="current-password" /></label>
        <label className="field"><span>Mật khẩu mới</span><input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" maxLength={72} /></label>
        <ul className="rules">
          {PASSWORD_RULES.map((r) => (
            <li key={r.key} className={newPw && r.test(newPw) ? 'ok' : ''}>{r.text}</li>
          ))}
        </ul>
        <label className="field"><span>Nhập lại mật khẩu mới</span><input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" maxLength={72} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {success && <p className="form-success">{success}</p>}
        <div className="form__actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Đổi mật khẩu'}</button>
        </div>
      </form>
    </>
  );
}
