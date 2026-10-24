import { type ReactNode, useRef, useState } from 'react';
import { posService } from '../../services/pos.service';
import { useAuthStore } from '../../store/useAuthStore';
import type { PaymentMethodOption, PosOrderPayload, PosOrderResult, PosPreview } from '../../types/order';
import { getErrorMessage } from '../../utils/error';
import { formatVnd } from '../../utils/format';
import { PAYMENT_METHOD_HINT, cashSuggestions, newIdempotencyKey, parseMoney } from '../../utils/pos';
import { Modal } from '../common/Modal';
import { AmountSummary } from './AmountSummary';

interface Props {
  preview: PosPreview;
  methods: PaymentMethodOption[];
  customerId?: number;
  customerName: string;
  voucherCode?: string;
  gross: number;
  productDiscount: number;
  invoiceNote?: ReactNode;
  onClose: () => void;
  /** Bán thành công: giỏ được xóa ngay ở màn POS, không thể gửi lần 2. */
  onSuccess: (result: PosOrderResult) => void;
  /** Lỗi do dữ liệu đã đổi (hết hàng, voucher…): màn POS tải lại tồn kho và tính lại giá. */
  onStale: () => void;
}

/** Thanh toán tại quầy: chọn phương thức, tiền mặt tính tiền thừa, chuyển khoản/QR/MoMo nhập mã giao dịch (không bắt buộc). */
export function PosCheckoutModal({ preview, methods, customerId, customerName, voucherCode, gross, productDiscount, invoiceNote, onClose, onSuccess, onStale }: Props) {
  const payable = preview.amountPayable;
  const cashier = useAuthStore((st) => st.user?.fullName) ?? '—';
  const [methodCode, setMethodCode] = useState(methods.find((m) => m.methodCode === 'CASH')?.methodCode ?? methods[0]?.methodCode ?? 'CASH');
  const [received, setReceived] = useState(String(payable));
  const [txn, setTxn] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Một khóa cho cả lần thanh toán này: bấm nhiều lần / gửi lại do mạng chập chờn chỉ tạo đúng 1 hóa đơn
  const idemKey = useRef(newIdempotencyKey());
  const inFlight = useRef(false);

  const isCash = methodCode === 'CASH';
  const receivedNum = parseMoney(received);
  const change = receivedNum - payable;
  const cashShort = isCash && payable > 0 && receivedNum < payable;

  async function confirm() {
    if (inFlight.current || submitting) return; // chặn bấm đúp tức thời (trước khi state kịp cập nhật)
    if (cashShort) return setError('Tiền khách đưa chưa đủ');
    inFlight.current = true;
    setSubmitting(true);
    setError('');
    const payload: PosOrderPayload = {
      items: preview.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      customerId,
      methodCode,
      voucherCode,
      note: note.trim() || undefined,
      amountReceived: isCash && payable > 0 ? receivedNum : undefined,
      transactionCode: !isCash && txn.trim() ? txn.trim() : undefined,
    };
    try {
      onSuccess(await posService.createOrder(payload, idemKey.current));
    } catch (err) {
      setError(getErrorMessage(err));
      onStale();
      idemKey.current = newIdempotencyKey(); // lỗi đã được máy chủ trả về rõ ràng → lần thử sau là một yêu cầu mới
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Thanh toán tại quầy" onClose={submitting ? () => undefined : onClose} wide>
      <div className="pos-pay">
        {/* ===== Cột trái: phương thức thanh toán / mã giao dịch / ghi chú / thu ngân ===== */}
        <div className="form pos-pay__left">
        <div className="field">
          <span>Phương thức thanh toán</span>
          <div className="pos-methods">
            {methods.map((m) => (
              <label key={m.methodCode} className={`pos-method${methodCode === m.methodCode ? ' pos-method--on' : ''}`}>
                <input type="radio" name="method" checked={methodCode === m.methodCode} onChange={() => setMethodCode(m.methodCode)} disabled={submitting} />
                {m.methodName}
              </label>
            ))}
          </div>
          <span className="muted" style={{ fontWeight: 400 }}>{PAYMENT_METHOD_HINT[methodCode] ?? ''}</span>
        </div>

        {isCash && payable > 0 && (
          <div className="field">
            <label htmlFor="pos-received">Tiền khách đưa</label>
            <input id="pos-received" inputMode="numeric" value={received ? new Intl.NumberFormat('vi-VN').format(receivedNum) : ''} onChange={(e) => setReceived(e.target.value)} disabled={submitting} />
            <div className="pos-cash">
              {cashSuggestions(payable).map((v) => (
                <button key={v} type="button" className="btn btn--ghost" onClick={() => setReceived(String(v))} disabled={submitting}>
                  {v === payable ? 'Đủ tiền' : formatVnd(v)}
                </button>
              ))}
            </div>
            <p className={cashShort ? 'form-error' : 'pos-change'}>
              {cashShort ? `Còn thiếu ${formatVnd(-change)}` : `Tiền thừa trả khách: ${formatVnd(Math.max(0, change))}`}
            </p>
          </div>
        )}

        {!isCash && payable > 0 && (
          <div className="field">
            <label htmlFor="pos-txn">Mã giao dịch (không bắt buộc)</label>
            <input id="pos-txn" value={txn} maxLength={100} onChange={(e) => setTxn(e.target.value)} placeholder="Mã giao dịch ngân hàng / ví" disabled={submitting} />
          </div>
        )}

        <div className="field">
          <span>Thu ngân tạo đơn</span>
          <strong>{cashier}</strong>
        </div>

        <div className="field">
          <label htmlFor="pos-note">Ghi chú hóa đơn (không bắt buộc)</label>
          <input id="pos-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} disabled={submitting} />
        </div>

        </div>

        {/* ===== Cột phải: tóm tắt chi phí ===== */}
        <div className="pos-pay__right">
          <p className="muted" style={{ margin: '0 0 8px' }}>Khách hàng: <strong style={{ color: '#1d2433' }}>{customerName}</strong></p>
          <AmountSummary
            gross={gross}
            productDiscount={productDiscount}
            invoiceDiscount={preview.discountAmount}
            invoiceDiscountNote={invoiceNote}
            payable={payable}
            payableLabel="Khách phải trả"
          />
        </div>
      </div>
      <div className="form pos-pay__foot">
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>Quay lại giỏ hàng</button>
          <button type="button" className="btn btn--primary" onClick={confirm} disabled={submitting || cashShort}>
            {submitting ? 'Đang xử lý…' : `Xác nhận thanh toán ${formatVnd(payable)}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
