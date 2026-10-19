import type { KeyboardEvent, ReactNode } from 'react';

interface Props {
  onSearch: () => void;
  /** Dòng gợi ý dưới thanh tìm kiếm (ví dụ: đã đổi tiêu chí nhưng chưa bấm Tìm kiếm). */
  hint?: string;
  /** Ô nhập, dropdown, ô ngày… (hiển thị cùng một dòng, trước nút Tìm kiếm). */
  children: ReactNode;
}

/**
 * Thanh tìm kiếm dùng chung cho mọi trang quản lý: tất cả điều kiện + nút "Tìm kiếm" nằm trên MỘT dòng.
 * Các điều kiện chỉ là bản nháp cho tới khi bấm "Tìm kiếm" (hoặc nhấn Enter trong ô nhập).
 * Dòng gợi ý luôn chiếm chỗ cố định để giao diện không bị giật khi nó xuất hiện/biến mất.
 */
export function SearchBar({ onSearch, hint, children }: Props) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
      onSearch();
    }
  }

  return (
    <div className="search-bar-wrap">
      <div className="search-bar" role="search" onKeyDown={onKeyDown}>
        {children}
        <button type="button" className="btn btn--primary search-bar__btn" onClick={onSearch}>Tìm kiếm</button>
      </div>
      <p className="muted search-bar__hint" aria-live="polite">{hint ?? ''}</p>
    </div>
  );
}
