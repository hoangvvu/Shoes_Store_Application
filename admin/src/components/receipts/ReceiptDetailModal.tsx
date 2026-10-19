import { receiptService } from '../../services/inventory.service';
import type { ReceiptLine } from '../../types/inventory';
import { formatDateTime, formatNumber, formatVnd } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { Modal } from '../common/Modal';
import { LoadState } from '../common/Widgets';

interface Props {
  receiptId: number;
  onClose: () => void;
}

/** M5 #4 – Xem chi tiết và in phiếu nhập kho. */
export function ReceiptDetailModal({ receiptId, onClose }: Props) {
  const { data: receipt, loading, error } = useAsync(() => receiptService.get(receiptId), [receiptId]);

  const printReceipt = () => {
    window.print();
  };

  return (
    <Modal title={`Chi tiết phiếu nhập #${receiptId}`} onClose={onClose} wide>
      <LoadState loading={loading} error={error} />

      {receipt && (
        <div>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#64748b' }}>Nhà cung cấp:</p>
              <h4 style={{ margin: 0, fontSize: 16 }}>{receipt.supplierName}</h4>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                {receipt.supplierPhone && <span>SĐT: {receipt.supplierPhone} · </span>}
                {receipt.supplierEmail && <span>Email: {receipt.supplierEmail}</span>}
              </div>
            </div>

            <div>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#64748b' }}>Thông tin phiếu:</p>
              <div style={{ fontSize: 13, color: '#1e293b' }}>
                <div>Ngày nhập: <strong>{formatDateTime(receipt.receiptDate)}</strong></div>
                <div>Người lập phiếu: <strong>{receipt.employeeName}</strong></div>
              </div>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sản phẩm / Biến thể</th>
                  <th>Mã SKU</th>
                  <th>Kích cỡ / Màu</th>
                  <th className="num">Số lượng</th>
                  <th className="num">Đơn giá nhập</th>
                  <th className="num">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {receipt.lines?.map((line: ReceiptLine) => (
                  <tr key={line.variantId}>
                    <td><strong>{line.productName}</strong></td>
                    <td><code>{line.sku}</code></td>
                    <td>{line.sizeLabel} · {line.colorName}</td>
                    <td className="num">{formatNumber(line.quantity)} {line.unit}</td>
                    <td className="num">{formatVnd(line.importPrice)}</td>
                    <td className="num font-bold">{formatVnd(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="totals-box">
            <dt>Tổng số lượng mặt hàng:</dt>
            <dd>{formatNumber(receipt.totalQuantity || receipt.lines?.reduce((a, b) => a + b.quantity, 0) || 0)}</dd>
            <dt className="grand">Tổng tiền phiếu nhập:</dt>
            <dd className="grand" style={{ color: '#059669' }}>{formatVnd(receipt.totalAmount)}</dd>
          </div>

          <div className="form__actions" style={{ marginTop: 20 }}>
            <button type="button" className="btn btn--ghost" onClick={printReceipt}>🖨️ In phiếu nhập</button>
            <button type="button" className="btn btn--primary" onClick={onClose}>Đóng</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
