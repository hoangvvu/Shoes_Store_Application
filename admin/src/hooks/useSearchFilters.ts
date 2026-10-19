import { useEffect, useState } from 'react';

/**
 * Quy tắc tìm kiếm chung cho mọi trang quản lý:
 * - `draft`   : tiêu chí đang chọn/gõ trên giao diện (chưa có hiệu lực).
 * - `applied` : tiêu chí đã bấm "Tìm kiếm" (hoặc Enter) – chỉ khi đó mới tải lại kết quả.
 * - Riêng khi TẤT CẢ tiêu chí quay về mặc định (Tất cả / Mới nhất / ô tìm kiếm trống),
 *   kết quả tự trở về danh sách đầy đủ mà không cần bấm nút.
 * `empty` phải là hằng số ở cấp module (tham chiếu ổn định).
 */
export function useSearchFilters<T extends object>(empty: T) {
  const [draft, setDraft] = useState<T>(empty);
  const [applied, setApplied] = useState<T>(empty);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const isDefault = (f: T) => JSON.stringify(f) === JSON.stringify(empty);
    if (isDefault(draft) && !isDefault(applied)) {
      setApplied(empty);
      setPage(1);
    }
  }, [draft, applied, empty]);

  const set =
    <K extends keyof T>(key: K) =>
    (e: { target: { value: string } }) =>
      setDraft((d) => ({ ...d, [key]: e.target.value as T[K] }));

  /** Gọi khi bấm nút "Tìm kiếm" (đã kiểm tra hợp lệ nếu cần). */
  const apply = () => {
    setApplied(draft);
    setPage(1);
  };

  const pending = JSON.stringify(draft) !== JSON.stringify(applied); // đã đổi tiêu chí nhưng chưa bấm Tìm kiếm

  return { draft, applied, page, setPage, set, apply, pending };
}
