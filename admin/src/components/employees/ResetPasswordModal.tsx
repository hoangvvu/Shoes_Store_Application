import { useState, type FormEvent } from 'react';
import { employeeService } from '../../services/employee.service';
import { getErrorMessage } from '../../utils/error';
import { validatePassword } from '../../utils/validators';
import { Modal } from '../common/Modal';

interface Props {
  employee: {
    employeeId: number;
    fullName: string;
    username?: string | null;
    userId?: number | null;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export function ResetPasswordModal({ employee, onClose, onSuccess }: Props) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [successNewPass, setSuccessNewPass] = useState('');

  function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const nums = '23456789';
    const r1 = chars[Math.floor(Math.random() * chars.length)];
    const r2 = lower[Math.floor(Math.random() * lower.length)];
    const r3 = lower[Math.floor(Math.random() * lower.length)];
    const r4 = nums[Math.floor(Math.random() * nums.length)];
    const r5 = nums[Math.floor(Math.random() * nums.length)];
    const randPass = `Shoe${r1}${r2}${r3}@${r4}${r5}`;
    setPassword(randPass);
    setError('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!employee.userId) {
      setError('Nhân viên này chưa có tài khoản người dùng liên kết.');
      return;
    }

    const validationMsg = validatePassword(password);
    if (validationMsg) {
      setError(validationMsg);
      return;
    }

    setSaving(true);
    setError('');

    try {
      await employeeService.resetPassword(employee.userId, password);
      setSuccessNewPass(password);
      onSuccess?.();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  function handleCopy() {
    if (successNewPass) {
      navigator.clipboard.writeText(successNewPass);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Modal title="Cấp lại mật khẩu nhân viên" onClose={onClose}>
      {successNewPass ? (
        <div style={{ padding: '8px 0' }}>
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 8,
              padding: 16,
              marginBottom: 20,
              textAlign: 'center',
            }}
          >
            <strong style={{ color: '#065f46', fontSize: '1.05rem', display: 'block', marginBottom: 6 }}>
              Đã cấp lại mật khẩu thành công!
            </strong>
            <p className="small" style={{ color: '#047857', margin: '0 0 14px 0' }}>
              Tài khoản đã được đặt lại mật khẩu và tự động mở khóa nếu trước đó bị khóa do nhập sai nhiều lần.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: '#fff',
                border: '1px dashed #059669',
                borderRadius: 6,
                padding: '10px 16px',
                margin: '0 auto',
                maxWidth: 320,
              }}
            >
              <code style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f766e', letterSpacing: 1 }}>
                {successNewPass}
              </code>
              <button
                type="button"
                className="btn btn--ghost"
                style={{ fontSize: '0.85rem', padding: '4px 10px' }}
                onClick={handleCopy}
              >
                {copied ? 'Đã chép' : 'Sao chép'}
              </button>
            </div>
          </div>

          <p className="muted small" style={{ textAlign: 'center', marginBottom: 20 }}>
            Vui lòng gửi thông tin mật khẩu mới này cho nhân viên để họ đăng nhập vào hệ thống.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button type="button" className="btn btn--primary" style={{ minWidth: 120 }} onClick={onClose}>
              Hoàn tất
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="form" noValidate>
          <div
            style={{
              background: 'var(--bg-subtle, #f8f9fa)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 14,
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.92rem' }}>
              <div>
                <span className="muted small" style={{ display: 'block' }}>Nhân viên</span>
                <strong>{employee.fullName}</strong>
              </div>
              <div>
                <span className="muted small" style={{ display: 'block' }}>Tên đăng nhập</span>
                <code>{employee.username || 'Chưa liên kết'}</code>
              </div>
            </div>
          </div>

          <div className="field" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span>Mật khẩu mới *</span>
              <button
                type="button"
                className="link small"
                onClick={generateRandomPassword}
              >
                Tạo mật khẩu ngẫu nhiên
              </button>
            </div>
            <input
              type="text"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Nhập mật khẩu mới hoặc bấm Tạo ngẫu nhiên…"
              autoFocus
            />
            <span className="field-hint">
              Quy tắc: Tối thiểu 8 ký tự gồm ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số.
            </span>
          </div>

          {error && <p className="form-error" style={{ marginBottom: 16 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              style={{ minWidth: 160 }}
              disabled={saving || !password.trim()}
            >
              {saving ? 'Đang cập nhật…' : 'Xác nhận cấp lại'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
