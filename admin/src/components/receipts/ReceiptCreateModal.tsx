import { type FormEvent, useMemo, useState } from 'react';
import { inventoryService, receiptService, supplierService } from '../../services/inventory.service';
import type { StockItem, Supplier } from '../../types/inventory';
import { getErrorMessage } from '../../utils/error';
import { formatNumber, formatVnd } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { Modal } from '../common/Modal';
import { LoadState } from '../common/Widgets';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

interface DraftLine {
  variantId: number;
  variantLabel: string;
  sku: string;
  supplierName: string;
  quantity: number;
  importPrice: number;
}

/** M5 #2 – Lập phiếu nhập kho. Thêm dòng, tính tạm tính thành tiền; trigger backend tự tăng kho và tính tổng tiền phiếu. */
export function ReceiptCreateModal({ onClose, onSaved }: Props) {
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | ''>('');
  const [variantSearch, setVariantSearch] = useState('');
  const [qtyInput, setQtyInput] = useState('10');
  const [priceInput, setPriceInput] = useState('500000');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Chế độ nhập: 'PRODUCT_MATRIX' (theo mẫu giày) hoặc 'SINGLE_VARIANT' (chọn lẻ)
  const [inputMode, setInputMode] = useState<'PRODUCT_MATRIX' | 'SINGLE_VARIANT'>('PRODUCT_MATRIX');

  // State cho chế độ nhập theo mẫu giày (Matrix Import)
  const [matrixProductId, setMatrixProductId] = useState<number | ''>('');
  const [batchPrice, setBatchPrice] = useState('500000');
  const [batchQty, setBatchQty] = useState('10');
  const [matrixDraft, setMatrixDraft] = useState<Record<number, { qty: number; price: number }>>({});

  const { data: suppliers, loading: supLoading, error: supErr } = useAsync(
    () => supplierService.list({ page: 1, size: 100 }),
    [],
  );

  // Chỉ tải biến thể kho của nhà cung cấp được chọn
  const { data: stockData, loading: stLoading, error: stErr } = useAsync(
    () =>
      supplierId
        ? inventoryService.list({ page: 1, size: 500, supplierId: Number(supplierId) })
        : Promise.resolve({ items: [], total: 0, page: 1, size: 500, totalPages: 0 }),
    [supplierId],
  );

  const selectedSupplier = suppliers?.items.find((s: Supplier) => s.supplierId === supplierId);
  const variants = stockData?.items || [];

  // Danh sách các mẫu sản phẩm thuộc nhà cung cấp (được gom nhóm từ variants)
  const productOptions = useMemo(() => {
    const map = new Map<number, { productId: number; productName: string; variantCount: number }>();
    for (const v of variants) {
      if (!map.has(v.productId)) {
        map.set(v.productId, { productId: v.productId, productName: v.productName, variantCount: 0 });
      }
      map.get(v.productId)!.variantCount++;
    }
    return Array.from(map.values());
  }, [variants]);

  // Các biến thể của mẫu sản phẩm đang chọn trong chế độ Matrix
  const activeMatrixVariants = useMemo(() => {
    if (!matrixProductId) return [];
    return variants.filter((v: StockItem) => v.productId === matrixProductId);
  }, [variants, matrixProductId]);

  // Khi chọn mẫu sản phẩm mới: khởi tạo bảng số lượng và giá cho tất cả size của mẫu đó
  const handleSelectMatrixProduct = (prodId: number | '') => {
    setMatrixProductId(prodId);
    if (!prodId) {
      setMatrixDraft({});
      return;
    }
    const curVariants = variants.filter((v: StockItem) => v.productId === prodId);
    const initialDraft: Record<number, { qty: number; price: number }> = {};
    const defaultP = Number(batchPrice) || 500000;
    const defaultQ = Number(batchQty) || 10;
    for (const v of curVariants) {
      initialDraft[v.variantId] = { qty: defaultQ, price: defaultP };
    }
    setMatrixDraft(initialDraft);
  };

  // Áp dụng giá chung cho tất cả các size của mẫu đang chọn
  const applyBatchPriceToAll = () => {
    const p = Number(batchPrice);
    if (!Number.isFinite(p) || p < 0) return setError('Giá nhập chung không hợp lệ');
    setError('');
    setMatrixDraft((prev) => {
      const next: Record<number, { qty: number; price: number }> = {};
      for (const v of activeMatrixVariants) {
        next[v.variantId] = { qty: prev[v.variantId]?.qty ?? 10, price: p };
      }
      return next;
    });
  };

  // Điền số lượng chung cho tất cả các size của mẫu đang chọn
  const applyBatchQtyToAll = () => {
    const q = Number(batchQty);
    if (!Number.isFinite(q) || q < 0) return setError('Số lượng không hợp lệ');
    setError('');
    setMatrixDraft((prev) => {
      const next: Record<number, { qty: number; price: number }> = {};
      const defPrice = Number(batchPrice) || 500000;
      for (const v of activeMatrixVariants) {
        next[v.variantId] = { qty: q, price: prev[v.variantId]?.price ?? defPrice };
      }
      return next;
    });
  };

  // Thay đổi số lượng của 1 biến thể trong ma trận
  const updateMatrixVariantQty = (vId: number, qty: number) => {
    setMatrixDraft((prev) => ({
      ...prev,
      [vId]: {
        qty: Math.max(0, qty),
        price: prev[vId]?.price ?? (Number(batchPrice) || 500000),
      },
    }));
  };

  // Thay đổi giá của 1 biến thể trong ma trận
  const updateMatrixVariantPrice = (vId: number, price: number) => {
    setMatrixDraft((prev) => ({
      ...prev,
      [vId]: {
        qty: prev[vId]?.qty ?? 10,
        price: Math.max(0, price),
      },
    }));
  };

  // Thêm toàn bộ các size có SL > 0 vào phiếu nhập
  const addMatrixToLines = () => {
    if (!supplierId) return setError('Vui lòng chọn nhà cung cấp đối tác trước');
    if (!matrixProductId) return setError('Vui lòng chọn mẫu sản phẩm cần nhập');

    const toAdd: DraftLine[] = [];
    const supName = selectedSupplier?.supplierName || 'Chưa xác định';

    for (const v of activeMatrixVariants) {
      const row = matrixDraft[v.variantId];
      if (row && row.qty > 0) {
        toAdd.push({
          variantId: v.variantId,
          variantLabel: `${v.productName} (Size ${v.sizeLabel} - ${v.colorName})`,
          sku: v.sku,
          supplierName: v.supplierName || supName,
          quantity: row.qty,
          importPrice: row.price,
        });
      }
    }

    if (toAdd.length === 0) {
      return setError('Vui lòng nhập số lượng lớn hơn 0 cho ít nhất một kích cỡ giày');
    }

    setError('');
    setLines((prev) => {
      const next = [...prev];
      for (const item of toAdd) {
        const idx = next.findIndex((l) => l.variantId === item.variantId);
        if (idx >= 0) {
          next[idx].quantity += item.quantity;
          next[idx].importPrice = item.importPrice;
        } else {
          next.push(item);
        }
      }
      return next;
    });

    // Thông báo thêm thành công và cho phép người dùng chọn tiếp mẫu khác
    setMatrixProductId('');
    setMatrixDraft({});
  };

  const filteredVariants = variantSearch.trim()
    ? variants.filter((v: StockItem) => {
        const term = variantSearch.toLowerCase();
        return (
          v.productName.toLowerCase().includes(term) ||
          v.sku.toLowerCase().includes(term) ||
          v.colorName.toLowerCase().includes(term) ||
          v.sizeLabel.toLowerCase().includes(term)
        );
      })
    : variants;

  const handleSupplierChange = (newSupId: number | '') => {
    if (lines.length > 0 && newSupId !== supplierId) {
      const ok = window.confirm(
        'Thay đổi nhà cung cấp sẽ làm mới danh sách sản phẩm trong phiếu nhập hiện tại. Bạn có chắc chắn muốn đổi không?',
      );
      if (!ok) return;
      setLines([]);
    }
    setSupplierId(newSupId);
    setSelectedVariantId('');
    setMatrixProductId('');
    setMatrixDraft({});
    setVariantSearch('');
    setError('');
  };

  const addLine = () => {
    if (!supplierId) return setError('Vui lòng chọn nhà cung cấp đối tác trước khi thêm sản phẩm');
    if (!selectedVariantId) return setError('Vui lòng chọn biến thể cần nhập hàng');
    const q = Number(qtyInput);
    const p = Number(priceInput);
    if (!Number.isFinite(q) || q <= 0) return setError('Số lượng nhập phải lớn hơn 0');
    if (!Number.isFinite(p) || p < 0) return setError('Giá nhập không được âm');

    const v = variants.find((x: StockItem) => x.variantId === selectedVariantId);
    if (!v) return;

    const supName = v.supplierName || selectedSupplier?.supplierName || 'Chưa xác định';

    setError('');
    // Nếu biến thể đã có trong danh sách -> cộng dồn số lượng
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.variantId === v.variantId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].quantity += q;
        next[idx].importPrice = p;
        return next;
      }
      return [
        ...prev,
        {
          variantId: v.variantId,
          variantLabel: `${v.productName} (Size ${v.sizeLabel} - ${v.colorName})`,
          sku: v.sku,
          supplierName: supName,
          quantity: q,
          importPrice: p,
        },
      ];
    });

    // Reset input
    setSelectedVariantId('');
    setQtyInput('10');
  };

  const updateLineQty = (idx: number, newQty: number) => {
    if (newQty <= 0) return;
    setLines((prev) => {
      const next = [...prev];
      next[idx].quantity = newQty;
      return next;
    });
  };

  const updateLinePrice = (idx: number, newPrice: number) => {
    if (newPrice < 0) return;
    setLines((prev) => {
      const next = [...prev];
      next[idx].importPrice = newPrice;
      return next;
    });
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const grandTotal = lines.reduce((sum, l) => sum + l.quantity * l.importPrice, 0);

  // Thống kê nhanh trong chế độ Matrix
  const matrixTotalQty = Object.values(matrixDraft).reduce((sum, item) => sum + (item.qty || 0), 0);
  const matrixTotalAmount = Object.values(matrixDraft).reduce((sum, item) => sum + (item.qty || 0) * (item.price || 0), 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supplierId) return setError('Vui lòng chọn nhà cung cấp');
    if (lines.length === 0) return setError('Phiếu nhập phải có ít nhất một dòng hàng');
    setError('');
    setSaving(true);
    try {
      await receiptService.create({
        supplierId: Number(supplierId),
        lines: lines.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
          importPrice: l.importPrice,
        })),
      });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Lập phiếu nhập kho" onClose={onClose} wide>
      <form onSubmit={submit} className="form" noValidate>
        <LoadState loading={supLoading || (!!supplierId && stLoading)} error={supErr || stErr} />

        <label className="field">
          <span>Nhà cung cấp đối tác *</span>
          <select
            className="select"
            value={supplierId}
            onChange={(e) => handleSupplierChange(e.target.value ? Number(e.target.value) : '')}
            autoFocus
          >
            <option value="">-- Chọn nhà cung cấp --</option>
            {suppliers?.items.map((s: Supplier) => (
              <option key={s.supplierId} value={s.supplierId}>
                {s.supplierName} ({s.phone || 'Chưa có SĐT'})
              </option>
            ))}
          </select>
        </label>

        <fieldset className="fieldset" style={{ opacity: supplierId ? 1 : 0.65 }}>
          <legend>
            Thêm dòng hàng vào phiếu nhập {selectedSupplier ? `– ${selectedSupplier.supplierName}` : ''}
          </legend>

          {!supplierId ? (
            <div
              style={{
                padding: '12px 14px',
                background: '#FEF3C7',
                color: '#92400E',
                borderRadius: '6px',
                marginBottom: 12,
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              Vui lòng chọn nhà cung cấp đối tác ở trên trước. Hệ thống sẽ chỉ hiển thị các sản phẩm thuộc nhà cung cấp đó.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button
                type="button"
                className={`btn ${inputMode === 'PRODUCT_MATRIX' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setInputMode('PRODUCT_MATRIX')}
              >
                Nhập nhanh theo mẫu giày (Tất cả size)
              </button>
              <button
                type="button"
                className={`btn ${inputMode === 'SINGLE_VARIANT' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setInputMode('SINGLE_VARIANT')}
              >
                Chọn từng biến thể lẻ
              </button>
            </div>
          )}

          {/* CHẾ ĐỘ 1: NHẬP NHANH THEO MẪU GIÀY (MATRIX IMPORT) */}
          {supplierId && inputMode === 'PRODUCT_MATRIX' && (
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div className="form-grid" style={{ alignItems: 'flex-end', marginBottom: 12 }}>
                <label className="field span-2">
                  <span>Chọn mẫu giày của nhà cung cấp ({productOptions.length} mẫu có sẵn) *</span>
                  <select
                    className="select"
                    value={matrixProductId}
                    onChange={(e) => handleSelectMatrixProduct(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">-- Chọn mẫu sản phẩm cần nhập --</option>
                    {productOptions.map((p) => (
                      <option key={p.productId} value={p.productId}>
                        {p.productName} ({p.variantCount} kích cỡ/màu)
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Giá nhập chung / đôi (VND)</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={batchPrice}
                      onChange={(e) => setBatchPrice(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={applyBatchPriceToAll}
                      title="Gán giá này cho tất cả kích cỡ"
                      disabled={!matrixProductId}
                    >
                      Áp dụng
                    </button>
                  </div>
                </label>

                <label className="field">
                  <span>Điền nhanh số lượng</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="number"
                      min={1}
                      value={batchQty}
                      onChange={(e) => setBatchQty(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={applyBatchQtyToAll}
                      title="Gán số lượng này cho tất cả kích cỡ"
                      disabled={!matrixProductId}
                    >
                      Điền tất cả
                    </button>
                  </div>
                </label>
              </div>

              {matrixProductId && activeMatrixVariants.length > 0 && (
                <div>
                  <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' }}>
                    <table className="table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Kích cỡ</th>
                          <th>Màu sắc</th>
                          <th>Mã SKU</th>
                          <th className="num">Tồn kho hiện tại</th>
                          <th className="num" style={{ width: 130 }}>SL nhập</th>
                          <th className="num" style={{ width: 160 }}>Giá nhập (VND)</th>
                          <th className="num">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeMatrixVariants.map((v: StockItem) => {
                          const row = matrixDraft[v.variantId] || { qty: 0, price: Number(batchPrice) || 500000 };
                          const lineSum = row.qty * row.price;
                          return (
                            <tr key={v.variantId} style={{ background: row.qty > 0 ? '#f0fdf4' : 'transparent' }}>
                              <td><strong style={{ fontSize: '15px' }}>Size {v.sizeLabel}</strong></td>
                              <td>{v.colorName}</td>
                              <td><code>{v.sku}</code></td>
                              <td className="num">{v.stockQuantity} đôi</td>
                              <td className="num">
                                <input
                                  type="number"
                                  min={0}
                                  value={row.qty}
                                  onChange={(e) => updateMatrixVariantQty(v.variantId, Number(e.target.value) || 0)}
                                  style={{ width: 75, textAlign: 'center', padding: '4px 6px', fontWeight: 'bold' }}
                                />
                              </td>
                              <td className="num">
                                <input
                                  type="number"
                                  min={0}
                                  step={10000}
                                  value={row.price}
                                  onChange={(e) => updateMatrixVariantPrice(v.variantId, Number(e.target.value) || 0)}
                                  style={{ width: 130, textAlign: 'right', padding: '4px 6px' }}
                                />
                              </td>
                              <td className="num font-bold" style={{ color: row.qty > 0 ? '#059669' : '#94a3b8' }}>
                                {formatVnd(lineSum)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 12,
                      padding: '10px 14px',
                      background: '#ecfdf5',
                      borderRadius: 6,
                      border: '1px solid #a7f3d0',
                    }}
                  >
                    <div>
                      <strong>Đang chọn mẫu:</strong> {matrixTotalQty} đôi · <strong>Tạm tính:</strong>{' '}
                      <span style={{ color: '#059669', fontSize: '16px' }}>{formatVnd(matrixTotalAmount)}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={addMatrixToLines}
                      disabled={matrixTotalQty <= 0}
                    >
                      Thêm {activeMatrixVariants.filter((v) => (matrixDraft[v.variantId]?.qty || 0) > 0).length} kích cỡ này vào phiếu nhập
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHẾ ĐỘ 2: CHỌN TỪNG BIẾN THỂ LẺ (TRUYỀN THỐNG) */}
          {supplierId && inputMode === 'SINGLE_VARIANT' && (
            <div>
              <div style={{ marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Lọc theo tên sản phẩm, SKU, size, màu của nhà cung cấp này..."
                  value={variantSearch}
                  onChange={(e) => setVariantSearch(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-grid" style={{ alignItems: 'flex-end' }}>
                <label className="field span-2">
                  <span>
                    Chọn biến thể giày ({filteredVariants.length}/{variants.length})
                  </span>
                  <select
                    className="select"
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value ? Number(e.target.value) : '')}
                    disabled={variants.length === 0}
                  >
                    {variants.length === 0 ? (
                      <option value="">-- Nhà cung cấp này chưa có sản phẩm nào trong hệ thống --</option>
                    ) : (
                      <>
                        <option value="">-- Chọn biến thể giày ({filteredVariants.length} lựa chọn) --</option>
                        {filteredVariants.map((v: StockItem) => (
                          <option key={v.variantId} value={v.variantId}>
                            {v.sku} · {v.productName} (Size {v.sizeLabel} - {v.colorName}) [Tồn: {v.stockQuantity}]
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </label>

                <label className="field">
                  <span>Số lượng nhập</span>
                  <input
                    type="number"
                    min={1}
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Giá nhập / đôi (VND)</span>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ marginTop: 10, textAlign: 'right' }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={addLine}
                  disabled={!selectedVariantId}
                >
                  Thêm vào danh sách
                </button>
              </div>
            </div>
          )}
        </fieldset>

        {lines.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Nhà cung cấp</th>
                  <th>Mã SKU</th>
                  <th className="num" style={{ width: 130 }}>SL nhập</th>
                  <th className="num" style={{ width: 160 }}>Giá nhập (VND)</th>
                  <th className="num">Thành tiền</th>
                  <th className="actions-col" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={l.variantId}>
                    <td><strong>{l.variantLabel}</strong></td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: '#E0E7FF',
                          color: '#3730A3',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {l.supplierName}
                      </span>
                    </td>
                    <td><code>{l.sku}</code></td>
                    <td className="num">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          style={{ padding: '2px 8px', minWidth: 'auto' }}
                          onClick={() => updateLineQty(idx, l.quantity - 1)}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={l.quantity}
                          onChange={(e) => updateLineQty(idx, Math.max(1, Number(e.target.value) || 1))}
                          style={{ width: 60, textAlign: 'center', padding: '2px 4px' }}
                        />
                        <button
                          type="button"
                          className="btn btn--ghost"
                          style={{ padding: '2px 8px', minWidth: 'auto' }}
                          onClick={() => updateLineQty(idx, l.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        value={l.importPrice}
                        onChange={(e) => updateLinePrice(idx, Math.max(0, Number(e.target.value) || 0))}
                        style={{ width: 120, textAlign: 'right', padding: '2px 6px' }}
                      />
                    </td>
                    <td className="num font-bold" style={{ color: '#059669' }}>
                      {formatVnd(l.quantity * l.importPrice)}
                    </td>
                    <td className="actions">
                      <button type="button" className="btn btn--danger" onClick={() => removeLine(idx)}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="totals-box">
          <dt>Số mặt hàng:</dt>
          <dd>{lines.length} dòng</dd>
          <dt>Tổng số lượng nhập:</dt>
          <dd>{formatNumber(lines.reduce((a, b) => a + b.quantity, 0))} đôi</dd>
          <dt className="grand">Tạm tính tổng tiền:</dt>
          <dd className="grand" style={{ color: '#059669' }}>{formatVnd(grandTotal)}</dd>
        </div>

        <p className="muted small">
          Khi lưu phiếu, trigger trong CSDL sẽ tự động ghi sổ kho (<code>IMPORT</code>) và cộng dồn số lượng tồn kho ngay lập tức. Toàn bộ thao tác chạy trong 1 Transaction an toàn.
        </p>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving || lines.length === 0}>
            {saving ? 'Đang lưu phiếu…' : 'Xác nhận nhập kho'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
