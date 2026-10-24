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
        <div className="receipt-print-container">
          {receipt.isDeleted && (
            <div
              style={{
                padding: '10px 16px',
                marginBottom: 16,
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 6,
                color: '#b91c1c',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>⚠️</span>
              <span>PHIẾU NHẬP NÀY ĐÃ BỊ HỦY — Tồn kho tương ứng đã được ghi bút toán hoàn tác (IMPORT_REVERSAL).</span>
            </div>
          )}

          <div className="print-only-header" style={{ display: 'none', marginBottom: 20, textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>CỬA HÀNG GIÀY DÉP SHOE STORE</h2>
            <p style={{ margin: '4px 0', fontSize: 13, color: '#64748b' }}>Hệ thống Quản lý Bán hàng & Tồn kho</p>
            <h3 style={{ margin: '12px 0 4px', fontSize: 18, textTransform: 'uppercase' }}>
              PHIẾU NHẬP KHO #{receipt.receiptId}
            </h3>
            {receipt.isDeleted && <p style={{ color: 'red', fontWeight: 'bold' }}>[ĐÃ HỦY]</p>}
          </div>

          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#64748b' }}>Nhà cung cấp:</p>
              <h4 style={{ margin: 0, fontSize: 16 }}>{receipt.supplierName}</h4>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                {receipt.supplierPhone && <span>SĐT: {receipt.supplierPhone} · </span>}
                {receipt.supplierEmail && <span>Email: {receipt.supplierEmail} · </span>}
                {receipt.supplierAddress && <div>Địa chỉ: {receipt.supplierAddress}</div>}
              </div>
            </div>

            <div>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#64748b' }}>Thông tin phiếu:</p>
              <div style={{ fontSize: 13, color: '#1e293b' }}>
                <div>Ngày lập: <strong>{formatDateTime(receipt.receiptDate)}</strong></div>
                <div>Người lập phiếu: <strong>{receipt.employeeName}</strong></div>
                <div style={{ marginTop: 4 }}>
                  Trạng thái:{' '}
                  {receipt.isDeleted ? (
                    <span className="badge badge--danger">Đã hủy (Hoàn tác)</span>
                  ) : (
                    <span className="badge badge--ok">Hoàn thành</span>
                  )}
                </div>
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
            <dt>Số mặt hàng:</dt>
            <dd>{receipt.lines?.length || 0} dòng</dd>
            <dt>Tổng số lượng nhập:</dt>
            <dd>{formatNumber(receipt.totalQuantity || receipt.lines?.reduce((a, b) => a + b.quantity, 0) || 0)} đôi</dd>
            <dt className="grand">Tổng tiền phiếu nhập:</dt>
            <dd
              className="grand"
              style={{ color: receipt.isDeleted ? '#64748b' : '#059669', textDecoration: receipt.isDeleted ? 'line-through' : 'none' }}
            >
              {formatVnd(receipt.totalAmount)}
            </dd>
          </div>

          <div className="print-signatures" style={{ display: 'none', marginTop: 40, justifyContent: 'space-between', textAlign: 'center' }}>
            <div style={{ width: '30%' }}>
              <strong>Người giao hàng</strong>
              <div style={{ height: 60 }} />
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>(Ký, ghi rõ họ tên)</p>
            </div>
            <div style={{ width: '30%' }}>
              <strong>Thủ kho nhận</strong>
              <div style={{ height: 60 }} />
              <p style={{ margin: 0, fontSize: 13 }}>{receipt.employeeName}</p>
            </div>
            <div style={{ width: '30%' }}>
              <strong>Kế toán / Quản lý</strong>
              <div style={{ height: 60 }} />
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>(Ký, đóng dấu)</p>
            </div>
          </div>

          <div className="form__actions no-print" style={{ marginTop: 20 }}>
            <button type="button" className="btn btn--ghost" onClick={printReceipt}>🖨️ In phiếu nhập</button>
            <button type="button" className="btn btn--primary" onClick={onClose}>Đóng</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
