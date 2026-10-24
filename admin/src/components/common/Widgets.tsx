import type { ReactNode } from 'react';
import { API_URL } from '../../config/env';
import { type IconName, NavIcon } from './NavIcon';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: IconName;
  hint?: ReactNode;
  tone?: 'blue' | 'green' | 'orange' | 'red' | 'violet';
}

/** Thẻ số liệu trên dashboard. */
export function StatCard({ label, value, icon, hint, tone = 'blue' }: StatCardProps) {
  return (
    <div className={`stat stat--${tone}`}>
      <div className="stat__icon"><NavIcon name={icon} size={22} /></div>
      <div className="stat__body">
        <span className="stat__label">{label}</span>
        <strong className="stat__value">{value}</strong>
        {hint && <span className="stat__hint">{hint}</span>}
      </div>
    </div>
  );
}

interface Tab<K extends string> {
  key: K;
  label: string;
}

/** Thanh tab ngang đơn giản. */
export function Tabs<K extends string>({ tabs, value, onChange }: { tabs: Tab<K>[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} className={`tabs__btn ${value === t.key ? 'active' : ''}`} onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Biểu đồ cột thuần CSS (không cần thư viện). */
export function BarChart({ data, format }: { data: { label: string; value: number }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p className="muted center">Chưa có dữ liệu trong kỳ</p>;
  return (
    <div className="bars" role="img" aria-label="Biểu đồ cột">
      {data.map((d) => (
        <div key={d.label} className="bars__col" title={`${d.label}: ${format(d.value)}`}>
          <span className="bars__val">{format(d.value)}</span>
          <div className="bars__bar" style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }} />
          <span className="bars__label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Thanh ngang tỉ lệ dùng cho bảng xếp hạng. */
export function Meter({ value, max }: { value: number; max: number }) {
  return (
    <div className="meter"><div className="meter__fill" style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} /></div>
  );
}

/** Ô màu + tên màu. */
export function ColorDot({ hex, name }: { hex: string | null; name?: string }) {
  return (
    <span className="color-dot">
      <span className="color-dot__swatch" style={{ background: hex ?? '#e3e8f2' }} />
      {name}
    </span>
  );
}

/** Ảnh thu nhỏ sản phẩm, có ảnh dự phòng khi URL lỗi/trống. */
export function Thumb({ src, alt }: { src: string | null; alt: string }) {
  const backendBase = API_URL.replace(/\/api\/v1\/?$/, '');
  const resolvedSrc = src?.startsWith('/') ? `${backendBase}${src}` : src;
  return resolvedSrc ? (
    <img className="thumb" src={resolvedSrc} alt={alt} loading="lazy" onError={(e) => ((e.currentTarget.style.visibility = 'hidden'))} />
  ) : (
    <span className="thumb thumb--empty" aria-hidden><NavIcon name="box" size={18} /></span>
  );
}

/** Chọn khoảng ngày [from, to]. */
export function DateRangeFilter({ value, onChange }: { value: { from: string; to: string }; onChange: (v: { from: string; to: string }) => void }) {
  return (
    <span className="date-filter">
      Từ <input type="date" value={value.from} max={value.to} onChange={(e) => onChange({ ...value, from: e.target.value })} />
      đến <input type="date" value={value.to} min={value.from} onChange={(e) => onChange({ ...value, to: e.target.value })} />
    </span>
  );
}

/** Trạng thái rỗng / lỗi / đang tải cho một vùng dữ liệu. */
export function LoadState({ loading, error, empty, emptyText = 'Không có dữ liệu' }: { loading: boolean; error: string; empty?: boolean; emptyText?: string }) {
  if (loading) return <p className="muted center pad">Đang tải…</p>;
  if (error) return <p className="form-error pad">{error}</p>;
  if (empty) return <p className="muted center pad">{emptyText}</p>;
  return null;
}
