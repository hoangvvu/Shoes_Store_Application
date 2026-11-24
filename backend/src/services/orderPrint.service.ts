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
  /** Chương trình khuyến mãi áp dụng cho giảm giá hóa đơn (có thể là chương trình của voucher). */
  promotionName?: string | null;
  totalAmount: number;
  discountAmount: number;
  amountPayable: number;
  paidAmount: number;
  refundedAmount?: number;
  paymentStatus: string;
  note: string | null;
  items: { productName: string; sku: string; sizeLabel: string; colorName: string; quantity: number; salePrice: number; discountAmount: number; lineTotal: number }[];
  /** Lịch sử trạng thái: dùng để lấy tên nhân viên xác nhận đơn online. */
  history?: { newStatus: string; changedByName: string | null }[];
  /** Giao dịch thanh toán: dùng để in phương thức khách đã chọn. */
  payments?: { methodName?: string | null; status: string }[];
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
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:13px;line-height:1.5;max-width:820px;margin:24px auto;padding:0 24px}
  .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:16px}
  .brand{font-size:28px;font-weight:800;letter-spacing:4px} .title{text-align:right} h1{font-size:19px;margin:0 0 2px}
  .meta{display:block;margin-bottom:8px}
  .row{display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #eee}
  .k{flex:0 0 165px;font-weight:700}
  .v{flex:1;min-width:0;word-break:break-word}
  .wide{border-top:1px dashed #bbb;margin-top:4px;padding-top:7px}
  .muted{color:#555;font-size:12px}
  .items{margin:14px 0;border-top:1px solid #999}
  .item{padding:10px 2px;border-bottom:1px solid #bbb}
  .item-title{font-weight:700;margin-bottom:3px}
  .item-sub{color:#555;font-size:12px;margin-bottom:6px}
  .item-line{display:flex;justify-content:space-between;gap:12px;padding:2px 0}
  .item-line span:first-child{color:#444}
  .item-line .value{text-align:right;white-space:normal}
  .item-total{font-weight:700;border-top:1px dashed #ccc;margin-top:4px;padding-top:5px}
  .sumgrid{display:block;border-top:1px solid #999;margin-top:8px;padding-top:8px}
  .srow{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:4px 0}
  .sv{text-align:right;white-space:nowrap}
  .srow.grand{font-size:16px;font-weight:700;padding:6px 0;border-top:1px solid #111;border-bottom:2px solid #111;margin:4px 0}
  .scap{color:#555;font-size:12px;padding:0 0 5px}
  .sign{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:36px;text-align:center}
  .sign b{display:block} .sign i{display:block;color:#666;font-size:12px} .sign .space{height:70px}
  .foot{margin-top:28px;padding-top:10px;border-top:1px dashed #bbb;text-align:center;color:#666;font-size:12px}
  @media print{body{margin:0 auto} .noprint{display:none}}
`;

const row = (label: string, value: string) => `<div class="row"><span class="k">${esc(label)}:</span><span class="v">${esc(value)}</span></div>`;

/** HTML sẵn sàng in; trình duyệt dùng "In → Lưu dưới dạng PDF" (font tiếng Việt do trình duyệt lo). */
export function renderOrderHtml(o: PrintOrder, type: 'invoice' | 'delivery'): string {
  const isDelivery = type === 'delivery';
  const isPos = o.channel === 'POS';
  const title = isDelivery ? 'PHIẾU GIAO HÀNG' : 'HÓA ĐƠN BÁN HÀNG';
  const receiver = o.receiverName ?? o.customerName ?? 'Khách lẻ';
  const phone = o.receiverPhone ?? o.customerPhone ?? '—';
  const due = Math.max(0, o.amountPayable - o.paidAmount);
  const refunded = o.refundedAmount ?? 0;

  // Phương thức theo đúng cách khách chọn lúc đặt (giao dịch chưa thất bại)
  const methods = [...new Set((o.payments ?? []).filter((p) => p.status !== 'FAILED').map((p) => p.methodName).filter((m): m is string => !!m))].join(', ');
  const payLabel = PAYMENT_LABEL[o.paymentStatus] ?? o.paymentStatus;
  const payText = methods ? `${payLabel} · ${methods}` : payLabel;

  // Đơn POS: thu ngân; đơn online: nhân viên xác nhận (khách tự đặt nên employeeName rỗng)
  const confirmedBy = o.history?.find((h) => h.newStatus === 'CONFIRMED')?.changedByName ?? null;
  const staffRow = isPos ? row('Thu ngân', o.employeeName ?? '—') : row('Nhân viên xác nhận', confirmedBy ?? '—');

  const left = isDelivery
    ? [row('Ngày tạo', dateTime(o.invoiceDate)), row('Người nhận', receiver), row('Điện thoại', phone)]
    : [row('Ngày tạo', dateTime(o.invoiceDate)), row('Khách hàng', o.customerName ?? 'Khách lẻ'), row('Điện thoại', phone)];
  const right = isDelivery
    ? [row('Kênh', isPos ? 'Tại quầy' : 'Online'), row('Trạng thái', ORDER_STATUS_LABEL[o.orderStatus]), row('Thanh toán', payText)]
    : [row('Kênh', isPos ? 'Tại quầy' : 'Online'), staffRow, row('Thanh toán', payText)];
  // Hóa đơn chỉ in trạng thái khi đơn chưa hoàn tất (đơn đã giao thì hóa đơn mặc nhiên hoàn thành)
  if (!isDelivery && o.orderStatus !== 'DELIVERED') left.push(row('Trạng thái', ORDER_STATUS_LABEL[o.orderStatus]));

  const wide: string[] = [];
  if (!isPos && o.shippingAddress) wide.push(`<div class="row wide"><span class="k">Địa chỉ giao hàng:</span><span class="v">${esc(o.shippingAddress)}</span></div>`);
  if (o.note) wide.push(`<div class="row wide"><span class="k">Ghi chú:</span><span class="v">${esc(o.note)}</span></div>`);

  const itemsHtml = o.items
    .map((it, i) => {
      const details = isDelivery
        ? `<div class="item-line"><span>Size</span><span class="value">${esc(it.sizeLabel)}</span></div>
           <div class="item-line"><span>Màu sắc</span><span class="value">${esc(it.colorName)}</span></div>
           <div class="item-line"><span>Số lượng</span><span class="value">${it.quantity}</span></div>`
        : `<div class="item-line"><span>Số lượng</span><span class="value">${it.quantity}</span></div>
           <div class="item-line"><span>Đơn giá</span><span class="value">${vnd(it.salePrice)}</span></div>
           <div class="item-line"><span>Giảm giá sản phẩm</span><span class="value">${it.discountAmount > 0 ? `-${vnd(it.discountAmount)}` : '—'}</span></div>
           <div class="item-line item-total"><span>Thành tiền</span><span class="value">${vnd(it.lineTotal)}</span></div>`;
      return `<div class="item">
        <div class="item-title">${i + 1}. ${esc(it.productName)}</div>
        <div class="item-sub">Mã sản phẩm: ${esc(it.sku)}${isDelivery ? '' : ` · Size ${esc(it.sizeLabel)} · ${esc(it.colorName)}`}</div>
        ${details}
      </div>`;
    })
    .join('');

  // Chương trình giảm giá hóa đơn: tên chương trình + voucher (nếu có) + % trên tổng tiền hàng
  const pct = o.totalAmount > 0 ? Math.round((o.discountAmount * 1000) / o.totalAmount) / 10 : 0;
  const program = [o.promotionName, o.voucherCode ? `Voucher ${o.voucherCode}` : null].filter(Boolean).join(' · ') || 'Giảm giá theo hóa đơn';
  const srow = (label: string, value: string, cls = '') => `<div class="srow ${cls}"><span>${label}</span><span class="sv">${value}</span></div>`;

  // Tổng kết tiền hiển thị theo từng dòng dọc.
  const totals = isDelivery
    ? `<div class="sumgrid">${srow('Phải trả', vnd(o.amountPayable))}${srow('Đã thanh toán', vnd(o.paidAmount))}${srow('Tiền cần thu khi giao (COD)', vnd(due), 'grand')}</div>`
    : `<div class="sumgrid">
         ${srow('Tổng tiền hàng', vnd(o.totalAmount))}
         ${o.discountAmount > 0 ? `${srow(`Giảm giá hóa đơn (${String(pct).replace('.', ',')}%)`, `-${vnd(o.discountAmount)}`)}<div class="scap">Áp dụng: ${esc(program)}</div>` : ''}
         ${srow('Phải trả', vnd(o.amountPayable), 'grand')}
         ${srow('Đã thanh toán', vnd(o.paidAmount))}
         ${refunded > 0 ? `${srow('Đã hoàn tiền', `-${vnd(refunded)}`)}${srow('Thực thu', vnd(o.paidAmount - refunded))}` : ''}
       </div>`;

  const signLeft = isDelivery ? 'Người giao hàng' : 'Người lập phiếu';
  const signRight = isDelivery ? 'Người nhận hàng' : 'Khách hàng';

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${title} #${o.invoiceId}</title><style>${CSS}</style></head><body>
  <div class="head"><div class="brand">OURAN</div><div class="title"><h1>${title}</h1><div class="muted">${isDelivery ? 'Mã đơn' : 'Mã hóa đơn'}: #${o.invoiceId}</div></div></div>
  <div class="meta">${[...left, ...right].join('')}</div>
  ${wide.join('')}
  <section class="items">${itemsHtml || '<div class="item muted">Không có sản phẩm.</div>'}</section>
  ${totals}
  <div class="sign"><div><b>${signLeft}</b><i>(Ký, ghi rõ họ tên)</i><div class="space"></div></div><div><b>${signRight}</b><i>(Ký, ghi rõ họ tên)</i><div class="space"></div></div></div>
  <div class="foot">Cảm ơn quý khách đã mua hàng tại OURAN · In lúc ${esc(dateTime(new Date()))}</div>
  </body></html>`;
}
