import type { ReactNode } from 'react';

/** Lưới thông tin tự chia cột theo bề rộng thẻ (nhãn trên, giá trị dưới) để không còn khoảng trắng bên phải. */
export function InfoGrid({ children }: { children: ReactNode }) {
  return <dl className="kv kv--flow">{children}</dl>;
}

/** Một ô thông tin; `wide` cho giá trị dài (địa chỉ, ghi chú, khuyến mãi) chiếm trọn một hàng. */
export function InfoItem({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`kv__item${wide ? ' kv__item--wide' : ''}`}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
