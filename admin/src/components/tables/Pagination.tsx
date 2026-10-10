interface Props {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onChange }: Props) {
  return (
    <div className="pagination">
      <span className="muted">Tổng {total} bản ghi</span>
      <div className="pagination__btns">
        <button className="btn btn--ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹ Trước</button>
        <span>Trang {page} / {totalPages}</span>
        <button className="btn btn--ghost" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Sau ›</button>
      </div>
    </div>
  );
}
