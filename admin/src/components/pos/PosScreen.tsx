import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { posService } from '../../services/pos.service';
import type { Paged, CustomerListItem } from '../../types/customer';
import type { PaymentMethodOption, PosOrderResult, PosPreview, PosProduct, PosVariant } from '../../types/order';
import { getErrorMessage } from '../../utils/error';
import { formatVnd } from '../../utils/format';
import { PageHeader } from '../common/PageHeader';
import { SearchBar } from '../common/SearchBar';
import { Pagination } from '../tables/Pagination';
import { PosCart, type CartLine } from './PosCart';
import { PosCheckoutModal } from './PosCheckoutModal';
import { PosCustomerPicker } from './PosCustomerPicker';
import { PosProductCard } from './PosProductCard';
import { PosReceiptModal } from './PosReceiptModal';

const SIZE = 6;

interface Filters {
  q: string;
  inStock: string;
}
const EMPTY: Filters = { q: '', inStock: '' };

/**
 * Bán hàng tại quầy (POS), dùng chung cho Admin và Bán hàng (phân quyền do routes + backend quyết định).
 * Giá, khuyến mãi, voucher, kiểm tồn đều do backend tính lại; màn này chỉ giữ giỏ hàng và gọi API.
 */
export function PosScreen({ ordersPath }: { ordersPath: string }) {
  const { draft, applied, page, setPage, set, apply, pending } = useSearchFilters<Filters>(EMPTY);
  const [products, setProducts] = useState<Paged<PosProduct> | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState('');

  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<CustomerListItem | null>(null);
  const [voucherInput, setVoucherInput] = useState('');
  const [voucher, setVoucher] = useState('');
  const [preview, setPreview] = useState<PosPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [notice, setNotice] = useState('');

  const [pickingCustomer, setPickingCustomer] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [receipt, setReceipt] = useState<PosOrderResult | null>(null);

  /* ---------- sản phẩm ---------- */
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    setProductError('');
    try {
      setProducts(await posService.products({ q: applied.q.trim(), inStock: applied.inStock === 'true', page, size: SIZE }));
    } catch (err) {
      setProductError(getErrorMessage(err));
    } finally {
      setLoadingProducts(false);
    }
  }, [applied, page]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    posService.paymentMethods().then(setMethods).catch((err) => setProductError(getErrorMessage(err)));
  }, []);

  /* ---------- giỏ hàng ---------- */
  const inCart = useMemo(() => new Map(cart.map((l) => [l.variantId, l.quantity])), [cart]);

  function addVariant(p: PosProduct, v: PosVariant) {
    setNotice('');
    setCart((prev) => {
      const ex = prev.find((l) => l.variantId === v.variantId);
      if (ex) {
        if (ex.quantity >= v.stockQuantity) return prev;
        return prev.map((l) => (l.variantId === v.variantId ? { ...l, stockQuantity: v.stockQuantity, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          variantId: v.variantId, productId: p.productId, productName: p.productName, imageUrl: p.imageUrl, sku: v.sku,
          sizeLabel: v.sizeLabel, colorName: v.colorName, stockQuantity: v.stockQuantity, quantity: 1,
        },
      ];
    });
  }

  function setQty(variantId: number, qty: number) {
    setCart((prev) =>
      prev.map((l) => {
        if (l.variantId !== variantId) return l;
        if (qty > l.stockQuantity) setNotice(`"${l.productName}" size ${l.sizeLabel} chỉ còn ${l.stockQuantity} trong kho`);
        return { ...l, quantity: Math.max(1, Math.min(qty, l.stockQuantity)) };
      }),
    );
  }

  const removeLine = (variantId: number) => setCart((prev) => prev.filter((l) => l.variantId !== variantId));

  /* ---------- tính giá bằng backend (debounce, bỏ qua kết quả cũ) ---------- */
  const seq = useRef(0);
  const refreshPreview = useCallback(async (lines: CartLine[], code: string) => {
    const mine = ++seq.current;
    if (!lines.length) {
      setPreview(null);
      setPreviewError('');
      setPreviewing(false);
      return;
    }
    setPreviewing(true);
    try {
      const res = await posService.preview(lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })), code || undefined);
      if (mine !== seq.current) return;
      setPreview(res);
      setPreviewError('');
      // đồng bộ tồn kho mới nhất vào giỏ (không đổi số lượng người dùng đã chọn)
      const stock = new Map(res.items.map((i) => [i.variantId, i.stockQuantity]));
      setCart((prev) => prev.map((l) => (stock.has(l.variantId) && stock.get(l.variantId) !== l.stockQuantity ? { ...l, stockQuantity: stock.get(l.variantId)! } : l)));
    } catch (err) {
      if (mine !== seq.current) return;
      setPreviewError(getErrorMessage(err));
    } finally {
      if (mine === seq.current) setPreviewing(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void refreshPreview(cart, voucher), 250);
    return () => clearTimeout(t);
  }, [cart, voucher, refreshPreview]);

  /* ---------- thao tác ---------- */
  function search() {
    apply();
  }

  function applyVoucher() {
    setVoucher(voucherInput.trim().toUpperCase());
  }

  function clearVoucher() {
    setVoucher('');
    setVoucherInput('');
  }

  function newSale() {
    setReceipt(null);
    setCheckingOut(false);
    setCart([]);
    setCustomer(null);
    setVoucher('');
    setVoucherInput('');
    setPreview(null);
    setNotice('');
    void loadProducts(); // tồn kho đã đổi sau khi bán
  }

  const voucherApplied = !!voucher && voucherInput.trim().toUpperCase() === voucher;
  const itemCount = cart.reduce((s, l) => s + l.quantity, 0);
  const voucherBad = !!preview?.voucher && (preview.voucher.status === 'NOT_FOUND' || preview.voucher.status === 'EXHAUSTED');
  const canPay = !!preview && preview.canCheckout && !previewing && !previewError && cart.length > 0;

  return (
    <>
      <PageHeader title="Bán hàng tại quầy (POS)" subtitle="Chọn sản phẩm, thanh toán và lập hóa đơn ngay tại quầy" />

      <div className="pos">
        {/* ===== Trái: tìm và chọn sản phẩm ===== */}
        <section className="card pos__products">
          <SearchBar onSearch={search} hint={pending ? 'Bạn đã đổi tiêu chí, bấm "Tìm kiếm" để cập nhật kết quả.' : undefined}>
            <input className="search" placeholder="Tên sản phẩm, hãng, danh mục hoặc SKU…" value={draft.q} onChange={set('q')} />
            <select className="select" value={draft.inStock} onChange={set('inStock')} aria-label="Tồn kho">
              <option value="">Tất cả sản phẩm</option>
              <option value="true">Chỉ còn hàng</option>
            </select>
          </SearchBar>
          {productError && <p className="form-error">{productError}</p>}
          {loadingProducts && <p className="muted center">Đang tải sản phẩm…</p>}
          {!loadingProducts && products?.items.length === 0 && <p className="muted center">Không tìm thấy sản phẩm phù hợp</p>}
          <div className="pos-products">
            {!loadingProducts && products?.items.map((p) => <PosProductCard key={p.productId} product={p} inCart={inCart} onAdd={addVariant} />)}
          </div>
          {products && <Pagination page={products.page} totalPages={products.totalPages} total={products.total} onChange={setPage} />}
        </section>

        {/* ===== Phải: giỏ hàng và thanh toán ===== */}
        <aside className="card pos__cart">
          <div className="pos-cart__head">
            <h3 style={{ margin: 0 }}>Giỏ hàng ({itemCount})</h3>
            {cart.length > 0 && <button type="button" className="link-btn" onClick={() => { setCart([]); setNotice(''); }}>Xóa tất cả</button>}
          </div>

          <div className="pos-customer">
            <div>
              <span className="muted">Khách hàng</span>
              <strong>{customer ? customer.fullName : 'Khách vãng lai'}</strong>
              {customer?.phone && <span className="muted"> · {customer.phone}</span>}
            </div>
            <button type="button" className="btn btn--ghost" onClick={() => setPickingCustomer(true)}>{customer ? 'Đổi' : 'Chọn khách'}</button>
          </div>

          {notice && <p className="notice">{notice}</p>}
          <PosCart lines={cart} preview={preview} previewing={previewing} onQty={setQty} onRemove={removeLine} />

          <div className="pos-voucher">
            <input
              className="select"
              style={{ flex: 1 }}
              placeholder="Mã voucher (nếu có)"
              value={voucherInput}
              maxLength={30}
              onChange={(e) => setVoucherInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyVoucher()}
            />
            <button type="button" className="btn btn--ghost" onClick={voucherApplied ? clearVoucher : applyVoucher} disabled={!voucherInput.trim() && !voucher}>
              {voucherApplied ? 'Bỏ mã' : 'Áp dụng'}
            </button>
          </div>
          {preview?.voucher && (
            <p className={voucherBad ? 'form-error' : 'form-success'}>{preview.voucher.message}</p>
          )}

          {previewError && <p className="form-error" role="alert">{previewError}</p>}
          {preview && (
            <dl className="totals-box pos-totals">
              <dt>Tổng tiền hàng</dt><dd>{formatVnd(preview.totalAmount)}</dd>
              <dt>
                Giảm giá hóa đơn
                {preview.invoiceDiscountPercent > 0 && ` (${preview.invoiceDiscountPercent}% – ${preview.invoiceDiscountSource === 'VOUCHER' ? 'voucher' : 'theo mức hóa đơn'})`}
              </dt>
              <dd>-{formatVnd(preview.discountAmount)}</dd>
              <dt className="grand">Khách phải trả</dt><dd className="grand">{formatVnd(preview.amountPayable)}</dd>
            </dl>
          )}

          <button type="button" className="btn btn--primary pos-pay-btn" disabled={!canPay} onClick={() => setCheckingOut(true)}>
            {previewing ? 'Đang tính…' : 'Thanh toán'}
          </button>
          {preview && preview.issues.length > 0 && <p className="form-error">Vui lòng xử lý các sản phẩm báo lỗi trong giỏ trước khi thanh toán.</p>}
        </aside>
      </div>

      {pickingCustomer && (
        <PosCustomerPicker
          onClose={() => setPickingCustomer(false)}
          onSelect={(c) => {
            setCustomer(c);
            setPickingCustomer(false);
          }}
        />
      )}

      {checkingOut && preview && (
        <PosCheckoutModal
          preview={preview}
          methods={methods}
          customerId={customer?.customerId}
          customerName={customer ? customer.fullName : 'Khách vãng lai'}
          voucherCode={voucher || undefined}
          onClose={() => setCheckingOut(false)}
          onStale={() => {
            void loadProducts();
            void refreshPreview(cart, voucher);
          }}
          onSuccess={(res) => {
            // Xóa giỏ ngay khi backend xác nhận: không còn cách nào gửi lại cùng giỏ hàng lần nữa
            setCheckingOut(false);
            setCart([]);
            setPreview(null);
            setReceipt(res);
          }}
        />
      )}

      {receipt && <PosReceiptModal order={receipt} ordersPath={ordersPath} onNewSale={newSale} />}
    </>
  );
}
