import { type FormEvent, useEffect, useState } from 'react';
import { ROLE_LABEL } from '../../config/roles';
import { profileService } from '../../services/profile.service';
import { useAuthStore } from '../../store/useAuthStore';
import type { EmployeeRole } from '../../types/auth';
import type { EmployeeMe } from '../../types/profile';
import { getErrorMessage } from '../../utils/error';
import { GENDER_OPTIONS, genderText, validateEmail, type Gender } from '../../utils/person';
import { fullNameOf } from '../../utils/name';
import { formatYmdVn, latestBirthDate, validateBirthDate, validatePhone } from '../../utils/validators';
import { NavIcon } from '../common/NavIcon';

/** Tab "Thông tin tài khoản": xem dạng danh sách, bấm "Chỉnh sửa" để sửa tại chỗ. */
export function ProfileInfoCard({ role }: { role: EmployeeRole }) {
  const setFullName = useAuthStore((s) => s.setFullName);
  const [me, setMe] = useState<EmployeeMe | null>(null);
  const [editing, setEditing] = useState(false);
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState<'' | Gender>('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  function fill(m: EmployeeMe) {
    setMe(m);
    setLastName(m.profile.lastName);
    setFirstName(m.profile.firstName);
    setPhone(m.profile.phone ?? '');
    setDob(m.profile.dateOfBirth ? m.profile.dateOfBirth.slice(0, 10) : ''); // input[type=date] cần YYYY-MM-DD
    setAddress(m.profile.address ?? '');
    setGender(m.profile.gender ?? '');
    setEmail(m.profile.email ?? '');
  }

  useEffect(() => {
    profileService.getMe().then(fill).catch((e) => setError(getErrorMessage(e)));
  }, []);

  function startEdit() {
    setError('');
    setSuccess('');
    setEditing(true);
  }

  function cancelEdit() {
    if (me) fill(me);
    setError('');
    setEditing(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!lastName.trim()) return setError('Vui lòng nhập họ');
    if (lastName.trim().length > 50) return setError('Họ tối đa 50 ký tự');
    if (!firstName.trim()) return setError('Vui lòng nhập tên');
    if (firstName.trim().length > 50) return setError('Tên tối đa 50 ký tự');
    if (phone.trim()) {
      const msg = validatePhone(phone);
      if (msg) return setError(msg);
    }
    if (dob) {
      const msg = validateBirthDate(dob);
      if (msg) return setError(msg);
    }
    if (address.trim().length > 255) return setError('Địa chỉ tối đa 255 ký tự');
    const emailMsg = validateEmail(email);
    if (emailMsg) return setError(emailMsg);

    setSaving(true);
    try {
      // Chỉ gửi trường có giá trị (backend chưa hỗ trợ xóa trắng một trường)
      const updated = await profileService.updateMe({
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        ...(phone.trim() && { phone: phone.trim() }),
        ...(dob && { dateOfBirth: dob }),
        ...(address.trim() && { address: address.trim() }),
        // Giới tính và email không bắt buộc: để trống = xóa (null)
        gender: (gender || null) as Gender | null,
        email: email.trim() || null,
      });
      fill(updated);
      setFullName(fullNameOf(updated.profile.lastName, updated.profile.firstName)); // lời chào ở header cập nhật ngay
      setEditing(false);
      setSuccess('Đã lưu thông tin cá nhân');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const head = (
    <header className="profile__head">
      <div>
        <h3>Thông tin tài khoản</h3>
        <p className="muted">Thông tin cá nhân của bạn trong hệ thống.</p>
      </div>
      {me && !editing && (
        <button className="btn btn--outline" onClick={startEdit}>
          <NavIcon name="edit" size={16} />
          Chỉnh sửa
        </button>
      )}
    </header>
  );

  if (!me) return <>{head}{error ? <p className="form-error">{error}</p> : <p className="muted">Đang tải…</p>}</>;

  const row = (label: string, view: string, input?: React.ReactNode) => (
    <div className="info-row">
      <dt>{label}</dt>
      <dd>{editing && input ? input : view || '—'}</dd>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate>
      {head}
      {success && <p className="form-success">{success}</p>}
      <dl className="info-grid">
        {row('Họ và tên đệm', me.profile.lastName, <input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={50} autoFocus />)}
        {row('Tên', me.profile.firstName, <input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={50} />)}
        {row('Ngày sinh', formatYmdVn(me.profile.dateOfBirth), <input type="date" value={dob} max={latestBirthDate()} min="1900-01-01" onChange={(e) => setDob(e.target.value)} />)}
        {row('Giới tính', genderText(me.profile.gender), (
          <select value={gender} onChange={(e) => setGender(e.target.value as '' | Gender)}>
            {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        {row('Số điện thoại', me.profile.phone ?? '', <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={11} placeholder="0901234567" />)}
        {row('Email', me.profile.email ?? '', <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={100} placeholder="ten@congty.vn" />)}
        {row('Địa chỉ', me.profile.address ?? '', <input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={255} />)}
        {row('Ngày vào làm', formatYmdVn(me.profile.hireDate))}
        {row('Tên đăng nhập', me.username)}
        {row('Vai trò', ROLE_LABEL[role])}
      </dl>
      {editing && (
        <>
          <p className="muted">Số điện thoại gồm 10–11 chữ số, bắt đầu bằng số 0 · Ngày sinh phải đủ 18 tuổi trở lên.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form__actions">
            <button type="button" className="btn btn--ghost" onClick={cancelEdit}>Hủy</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
          </div>
        </>
      )}
    </form>
  );
}
