import React, { useEffect, useState } from 'react';
import { inventoryService } from '../services/inventory.service';
import { StockItem, LedgerEntry, InventoryMovement } from '../types';
import {
  Search,
  History,
  SlidersHorizontal,
  X,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export default function InventoryPage() {
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Ledger state
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<StockItem | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Adjust state
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    variantId: 0,
    quantityChange: 1,
    reason: '',
  });

  // Movement report modal
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadStock = async () => {
    setLoading(true);
    try {
      const res = await inventoryService.getStockList({
        q: search || undefined,
        lowStockOnly,
        threshold: 10,
        page,
        size: 15,
      });
      if (res.success) {
        setStockList(res.data);
        if (res.pagination) setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err: any) {
      notify('error', err.message || 'Lỗi tải danh sách kho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, [page, lowStockOnly]);

  const openLedger = async (item: StockItem) => {
    setSelectedVariant(item);
    setIsLedgerOpen(true);
    setLedgerLoading(true);
    try {
      const res = await inventoryService.getVariantLedger(item.variantId, { size: 50 });
      if (res.success) setLedgerEntries(res.data);
    } catch (err: any) {
      notify('error', err.message || 'Lỗi tải thẻ kho');
    } finally {
      setLedgerLoading(false);
    }
  };

  const openAdjust = (item: StockItem) => {
    setSelectedVariant(item);
    setAdjustForm({
      variantId: item.variantId,
      quantityChange: 0,
      reason: '',
    });
    setIsAdjustOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustForm.quantityChange === 0) {
      notify('error', 'Số lượng điều chỉnh phải khác 0 (+ tăng kho, - giảm kho)');
      return;
    }
    if (!adjustForm.reason.trim()) {
      notify('error', 'Vui lòng nhập lý do kiểm kê / điều chỉnh');
      return;
    }

    try {
      await inventoryService.adjustStock({
        variantId: adjustForm.variantId,
        quantityChange: Number(adjustForm.quantityChange),
        reason: adjustForm.reason.trim(),
      });
      notify('success', 'Điều chỉnh tồn kho thành công! (Tự động ghi audit STOCK_ADJUST)');
      setIsAdjustOpen(false);
      loadStock();
    } catch (err: any) {
      notify('error', err.message || 'Lỗi khi điều chỉnh tồn kho');
    }
  };

  const openMovementReport = async () => {
    try {
      const res = await inventoryService.getMovementReport();
      if (res.success) {
        setMovements(res.data);
        setIsMovementOpen(true);
      }
    } catch (err: any) {
      notify('error', err.message || 'Lỗi tải báo cáo nhập xuất tồn');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            backgroundColor: notification.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 500,
          }}
        >
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
            📦 Quản Lý Tồn Kho & Thẻ Kho (M6)
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Mô hình sổ cái nguyên tử (inventory_transactions), theo dõi thẻ kho và điều chỉnh kiểm kê
          </p>
        </div>

        <button
          onClick={openMovementReport}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          <FileSpreadsheet size={16} />
          Báo Cáo Nhập – Xuất – Tồn (M6.5)
        </button>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            loadStock();
          }}
          style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '450px' }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Tìm theo SKU hoặc tên giày..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 500, cursor: 'pointer' }}>
            Tìm
          </button>
        </form>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked);
              setPage(1);
            }}
            style={{ width: '16px', height: '16px' }}
          />
          <span style={{ fontWeight: 600, color: lowStockOnly ? '#dc2626' : '#334155' }}>
            ⚠️ Chỉ hiện hàng sắp hết (≤ 10 đôi)
          </span>
        </label>
      </div>

      {/* Stock Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '14px 16px' }}>Mã Biến Thể</th>
              <th style={{ padding: '14px 16px' }}>Mã SKU</th>
              <th style={{ padding: '14px 16px' }}>Tên Sản Phẩm</th>
              <th style={{ padding: '14px 16px' }}>Cỡ / Màu</th>
              <th style={{ padding: '14px 16px' }}>Giá Hiện Hành</th>
              <th style={{ padding: '14px 16px' }}>Tồn Kho Thực Tế</th>
              <th style={{ padding: '14px 16px', textAlign: 'center' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Đang tải số liệu tồn kho...
                </td>
              </tr>
            ) : stockList.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  Không tìm thấy mặt hàng nào.
                </td>
              </tr>
            ) : (
              stockList.map((item) => (
                <tr key={item.variantId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', color: '#64748b' }}>#{item.variantId}</td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600 }}>{item.sku}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>{item.productName}</td>
                  <td style={{ padding: '14px 16px' }}>
                    Size {item.sizeLabel} • {item.colorName}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>
                    {Number(item.currentPrice).toLocaleString('vi-VN')} đ
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 700,
                        backgroundColor: item.stockQuantity <= 10 ? '#fee2e2' : '#dcfce7',
                        color: item.stockQuantity <= 10 ? '#dc2626' : '#15803d',
                      }}
                    >
                      {item.stockQuantity} {item.unit || 'đôi'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        title="Xem Thẻ Kho (M6.2 Ledger)"
                        onClick={() => openLedger(item)}
                        style={{
                          border: 'none',
                          background: '#eff6ff',
                          color: '#2563eb',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        <History size={14} /> Thẻ Kho
                      </button>
                      <button
                        title="Điều chỉnh tồn kho kiểm kê (M6.3 sp_adjust_stock)"
                        onClick={() => openAdjust(item)}
                        style={{
                          border: 'none',
                          background: '#fef3c7',
                          color: '#b45309',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        <SlidersHorizontal size={14} /> Điều Chỉnh
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '13px', color: '#64748b' }}>
          <span>Trang {page} / {totalPages}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: page <= 1 ? '#f1f5f9' : '#ffffff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
            >
              Trước
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: page >= totalPages ? '#f1f5f9' : '#ffffff', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Thẻ Kho (M6.2 Ledger) */}
      {isLedgerOpen && selectedVariant && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '820px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  📜 Thẻ Kho Chi Tiết (M6.2 Ledger)
                </h3>
                <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
                  {selectedVariant.productName} • SKU: <strong style={{ fontFamily: 'monospace' }}>{selectedVariant.sku}</strong> • Size {selectedVariant.sizeLabel}
                </div>
              </div>
              <button onClick={() => setIsLedgerOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {ledgerLoading ? (
              <p style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Đang tải lịch sử thẻ kho...</p>
            ) : ledgerEntries.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Chưa có biến động giao dịch nào.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 12px' }}>Thời Gian</th>
                    <th style={{ padding: '10px 12px' }}>Loại Giao Dịch</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Biến Động (±)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tồn Trước</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tồn Sau</th>
                    <th style={{ padding: '10px 12px' }}>Lý Do / Chứng Từ</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((tx) => (
                    <tr key={tx.transactionId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>
                        {new Date(tx.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: tx.quantityChange > 0 ? '#dcfce7' : '#fee2e2',
                            color: tx.quantityChange > 0 ? '#15803d' : '#dc2626',
                          }}
                        >
                          {tx.transactionType}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: tx.quantityChange > 0 ? '#15803d' : '#dc2626' }}>
                        {tx.quantityChange > 0 ? `+${tx.quantityChange}` : tx.quantityChange}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>{tx.stockBefore}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{tx.stockAfter}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>
                        {tx.reason || (tx.purchaseReceiptId ? `Phiếu nhập #${tx.purchaseReceiptId}` : tx.invoiceId ? `Đơn hàng #${tx.invoiceId}` : '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <button
              onClick={() => setIsLedgerOpen(false)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Modal: Điều Chỉnh Tồn Kho (M6.3 sp_adjust_stock) */}
      {isAdjustOpen && selectedVariant && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
              ⚖️ Điều Chỉnh Tồn Kho Thủ Công (M6.3)
            </h3>

            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              <div>Sản phẩm: <strong>{selectedVariant.productName}</strong></div>
              <div>SKU: <strong style={{ fontFamily: 'monospace' }}>{selectedVariant.sku}</strong></div>
              <div>Tồn hiện tại: <strong style={{ color: '#2563eb' }}>{selectedVariant.stockQuantity} đôi</strong></div>
            </div>

            <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Số Lượng Điều Chỉnh (±) * (Dương: Tăng kho, Âm: Giảm kho)
                </label>
                <input
                  required
                  type="number"
                  placeholder="Ví dụ: -2 hoặc 5"
                  value={adjustForm.quantityChange}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantityChange: Number(e.target.value) })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Lý Do Bắt Buộc (Kiểm kê, Hàng hỏng, Thất thoát...) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Bắt buộc phải có lý do để lưu vết vào nhật ký audit..."
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Thực Thi sp_adjust_stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Báo Cáo Nhập – Xuất – Tồn (M6.5) */}
      {isMovementOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '880px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                📊 Báo Cáo Nhập – Xuất – Tồn Toàn Kho (M6.5)
              </h3>
              <button onClick={() => setIsMovementOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', marginBottom: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px' }}>Mã SKU</th>
                  <th style={{ padding: '10px 12px' }}>Tên Sản Phẩm</th>
                  <th style={{ padding: '10px 12px' }}>Cỡ / Màu</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tồn Đầu</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a' }}>Nhập (+)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626' }}>Xuất (-)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>Tồn Cuối</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.variantId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{m.sku}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{m.productName}</td>
                    <td style={{ padding: '10px 12px' }}>Size {m.sizeLabel} • {m.colorName}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{m.tonDau}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>+{m.nhap}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>-{m.xuat}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{m.tonCuoi}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              onClick={() => setIsMovementOpen(false)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
