import { ORDER_STATUS_LABEL } from '../constants/order.constant';

interface PrintOrder {
  invoiceId: number;
  invoiceDate: Date | string;
  channel: string;
  orderStatus: keyof typeof ORDER_STATUS_LABEL;
  customerName: string | null;
  customerPhone: string | null;
  employeeName: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  shippingAddress: string | null;
  voucherCode: string | null;
  totalAmount: number;
  discountAmount: number;
  amountPayable: number;
  paidAmount: number;
  paymentStatus: string;
  note: string | null;
  items: { productName: string; sku: string; sizeLabel: string; colorName: string; quantity: number; salePrice: number; discountAmount: number; lineTotal: number }[];
}

const PAYMENT_LABEL: Record<string, string> = {
  UNPAID: 'Chưa thanh toán',
  PARTIALLY_PAID: 'Thanh toán một phần',
  PAID: 'Đã thanh toán',
  PARTIALLY_REFUNDED: 'Hoàn tiền một phần',
  REFUNDED: 'Đã hoàn tiền',
};

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const vnd = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
const dateTime = (d: Date | string) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(d)); // lưu UTC, in GMT+7

const CSS = `
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px;font-size:13px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:14px}
  .brand{font-size:26px;font-weight:800;letter-spacing:3px} h1{font-size:18px;margin:0;text-align:right}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-bottom:14px} .meta b{display:inline-block;min-width:110px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px} th,td{border:1px solid #999;padding:6px 8px;text-align:left}
  th{background:#eee} .r{text-align:right} .totals{margin-left:auto;width:320px} .totals td{border:0;padding:3px 0}
  .totals .grand td{font-size:16px;font-weight:700;border-top:2px solid #111;padding-top:6px}
  .sign{display:flex;justify-content:space-around;margin-top:40px;text-align:center} .muted{color:#555}
  @media print{body{margin:0} .noprint{display:none}}`;

/** HTML sẵn sàng in; trình duyệt dùng "In → Lưu dưới dạng PDF" (font tiếng Việt do trình duyệt lo). */
export function renderOrderHtml(o: PrintOrder, type: 'invoice' | 'delivery'): string {
  const isDelivery = type === 'delivery';
  const title = isDelivery ? 'PHIẾU GIAO HÀNG' : 'HÓA ĐƠN BÁN HÀNG';
  const receiver = o.receiverName ?? o.customerName ?? 'Khách lẻ';
  const phone = o.receiverPhone ?? o.customerPhone ?? '';
  const due = Math.max(0, o.amountPayable - o.paidAmount);

  const rows = o.items
    .map((it, i) =>
      isDelivery
        ? `<tr><td>${i + 1}</td><td>${esc(it.productName)}<br><span class="muted">${esc(it.sku)}</span></td><td>${esc(it.sizeLabel)}</td><td>${esc(it.colorName)}</td><td class="r">${it.quantity}</td></tr>`
        : `<tr><td>${i + 1}</td><td>${esc(it.productName)}<br><span class="muted">${esc(it.sku)} · Size ${esc(it.sizeLabel)} · ${esc(it.colorName)}</span></td><td class="r">${it.quantity}</td><td class="r">${vnd(it.salePrice)}</td><td class="r">${vnd(it.discountAmount)}</td><td class="r">${vnd(it.lineTotal)}</td></tr>`,
    )
    .join('');

  const head = isDelivery
    ? '<tr><th>#</th><th>Sản phẩm</th><th>Size</th><th>Màu</th><th class="r">SL</th></tr>'
    : '<tr><th>#</th><th>Sản phẩm</th><th class="r">SL</th><th class="r">Đơn giá</th><th class="r">Giảm</th><th class="r">Thành tiền</th></tr>';

  const totals = isDelivery
    ? `<table class="totals"><tr class="grand"><td>Tiền cần thu khi giao (COD)</td><td class="r">${vnd(due)}</td></tr></table>`
    : `<table class="totals">
         <tr><td>Tổng tiền hàng</td><td class="r">${vnd(o.totalAmount)}</td></tr>
         <tr><td>Giảm giá hóa đơn${o.voucherCode ? ` (${esc(o.voucherCode)})` : ''}</td><td class="r">-${vnd(o.discountAmount)}</td></tr>
         <tr class="grand"><td>Phải trả</td><td class="r">${vnd(o.amountPayable)}</td></tr>
         <tr><td>Đã thanh toán</td><td class="r">${vnd(o.paidAmount)}</td></tr>
       </table>`;

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${title} #${o.invoiceId}</title><style>${CSS}</style></head><body>
  <div class="head"><div class="brand">OURAN</div><div><h1>${title}</h1><div class="r muted">Mã đơn: #${o.invoiceId}</div></div></div>
  <div class="meta">
    <div><b>Ngày tạo:</b> ${esc(dateTime(o.invoiceDate))}</div>
    <div><b>Kênh:</b> ${o.channel === 'POS' ? 'Tại quầy' : 'Online'}</div>
    <div><b>${isDelivery ? 'Người nhận' : 'Khách hàng'}:</b> ${esc(receiver)}</div>
    <div><b>Điện thoại:</b> ${esc(phone)}</div>
    ${isDelivery ? `<div style="grid-column:1/3"><b>Địa chỉ giao:</b> ${esc(o.shippingAddress ?? '')}</div>` : `<div><b>Nhân viên:</b> ${esc(o.employeeName ?? '—')}</div><div><b>Thanh toán:</b> ${esc(PAYMENT_LABEL[o.paymentStatus] ?? o.paymentStatus)}</div>`}
    <div><b>Trạng thái:</b> ${esc(ORDER_STATUS_LABEL[o.orderStatus])}</div>
    ${o.note ? `<div style="grid-column:1/3"><b>Ghi chú:</b> ${esc(o.note)}</div>` : ''}
  </div>
  <table><thead>${head}</thead><tbody>${rows}</tbody></table>
  ${totals}
  <div class="sign"><div>Người lập phiếu<br><br><br></div><div>${isDelivery ? 'Người nhận hàng' : 'Khách hàng'}<br><br><br></div></div>
  </body></html>`;
}
