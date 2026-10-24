import { useCallback, useEffect, useState } from 'react';
import { customerService } from '../../services/customer.service';
import type { CustomerListItem } from '../../types/customer';
import { EMPTY_FILTERS } from '../../utils/customerSearch';
import { getErrorMessage } from '../../utils/error';
import { formatVnd } from '../../utils/format';
import { CustomerFormModal } from '../customers/CustomerFormModal';
import { Modal } from '../common/Modal';

interface Props {
  onSelect: (c: CustomerListItem | null) => void;
  onClose: () => void;
}

/** Chọn khách hàng cho đơn POS (tìm theo tên/SĐT), thêm khách tại quầy, hoặc bán cho khách vãng lai. */
export function PosCustomerPicker({ onSelect, onClose }: Props) {
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState('');
  const [items, setItems] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await customerService.list({ ...EMPTY_FILTERS, q: applied.trim() }, 1, 8);
      setItems(res.items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Modal title="Chọn khách hàng" onClose={onClose} wide>
        <div className="pos-picker__bar">
          <input
            className="search"
            style={{ margin: 0 }}
            placeholder="Tên hoặc số điện thoại…"
            value={q}
            autoFocus
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setApplied(q)}
          />
          <button type="button" className="btn btn--primary" onClick={() => setApplied(q)}>Tìm kiếm</button>
          <button type="button" className="btn btn--ghost" onClick={() => setAdding(true)}>+ Khách mới</button>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="table-wrap pos-picker__list">
          <table className="table">
            <thead><tr><th>Khách hàng</th><th>SĐT</th><th className="num">Đã mua</th><th /></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="muted center">Đang tải…</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={4} className="muted center">Không tìm thấy khách hàng</td></tr>}
              {!loading && items.map((c) => (
                <tr key={c.customerId}>
                  <td>{c.fullName}</td>
                  <td>{c.phone ?? '—'}</td>
                  <td className="num">{formatVnd(c.totalPurchased)}</td>
                  <td className="actions"><button type="button" className="btn btn--primary" onClick={() => onSelect(c)}>Chọn</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={() => onSelect(null)}>Bán cho khách vãng lai</button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>Đóng</button>
        </div>
      </Modal>
      {adding && (
        <CustomerFormModal
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            setQ('');
            setApplied(''); // khách mới nhất nằm đầu danh sách
            void load();
          }}
        />
      )}
    </>
  );
}
