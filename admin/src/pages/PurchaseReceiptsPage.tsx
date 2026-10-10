import React, { useEffect, useState } from 'react';
import { supplierService } from '../services/supplier.service';
import { productService } from '../services/product.service';
import { PurchaseReceipt, Supplier, Product } from '../types';
import {
  Plus,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  X,
  PlusCircle,
  Printer,
} from 'lucide-react';

interface ReceiptLineInput {
  variantId: number;
  label: string;
  quantity: number;
  importPrice: number;
}

export default function PurchaseReceiptsPage() {
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allVariants, setAllVariants] = useState<Array<{ variantId: number; label: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterSupplier, setFilterSupplier] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PurchaseReceipt | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New receipt form
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [receiptLines, setReceiptLines] = useState<ReceiptLineInput[]>([]);

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadSuppliersAndVariants = async () => {
    try {
      const supRes = await supplierService.getSuppliers({ size: 100 });
      if (supRes.success) setSuppliers(supRes.data);

      const prodRes = await productService.getProducts({ size: 100 });
      if (prodRes.success) {
        // Flatten variants
        const list: Array<{ variantId: number; label: string }> = [];
        prodRes.data.forEach((p: Product) => {
          if (p.variants) {
            p.variants.forEach((v) => {
              list.push({
                variantId: v.variantId,
                label: `${p.productName} (Size ${v.sizeLabel} - ${v.colorName}) [${v.sku}]`,
              });
            });
          }
        });
        setAllVariants(list);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const res = await supplierService.getPurchaseReceipts({
        supplierId: filterSupplier ? Number(filterSupplier) : undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        page,
        size: 10,
      });
      if (res.success) {
        setReceipts(res.data);
        if (res.pagination) setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err: any) {
      notify('error', err.message || 'Lỗi tải phiếu nhập kho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliersAndVariants();
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [page, filterSupplier, fromDate, toDate]);

  const addLine = () => {
    if (allVariants.length === 0) {
      notify('error', 'Chưa có biến thể sản phẩm nào trong hệ thống');
      return;
    }
    const first = allVariants[0];
    setReceiptLines([
      ...receiptLines,
      { variantId: first.variantId, label: first.label, quantity: 10, importPrice: 1000000 },
    ]);
  };

  const removeLine = (index: number) => {
    setReceiptLines(receiptLines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof ReceiptLineInput, val: any) => {
    const updated = [...receiptLines];
    if (field === 'variantId') {
      const v = allVariants.find((x) => x.variantId === Number(val));
      updated[index].variantId = Number(val);
      if (v) updated[index].label = v.label;
    } else {
      (updated[index] as any)[field] = val;
    }
    setReceiptLines(updated);
  };

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      notify('error', 'Vui lòng chọn nhà cung cấp');
      return;
    }
    if (receiptLines.length === 0) {
      notify('error', 'Vui lòng thêm ít nhất 1 mặt hàng nhập');
      return;
    }

    try {
      await supplierService.createPurchaseReceipt({
        supplierId: Number(selectedSupplierId),
        items: receiptLines.map((l) => ({
          variantId: l.variantId,
          quantity: Number(l.quantity),
          importPrice: Number(l.importPrice),
        })),
      });

      notify('success', 'Lập phiếu nhập thành công! Tồn kho đã tự động tăng.');
      setIsAddOpen(false);
      setReceiptLines([]);
      setSelectedSupplierId('');
      loadReceipts();
    } catch (err: any) {
      notify('error', err.message || 'Lỗi khi lập phiếu nhập');
    }
  };

  const handleDeleteReceipt = async (r: PurchaseReceipt) => {
    if (!window.confirm(`Xóa mềm phiếu nhập #${r.receiptId}? Tồn kho sẽ bị trừ hoàn tác tương ứng.`)) return;
    try {
      await supplierService.deletePurchaseReceipt(r.receiptId);
      notify('success', 'Đã xóa mềm phiếu nhập và hoàn tác tồn kho thành công!');
      loadReceipts();
    } catch (err: any) {
      notify('error', err.message || 'Lỗi xóa phiếu nhập');
    }
  };

  const openDetail = async (r: PurchaseReceipt) => {
    try {
      const res = await supplierService.getPurchaseReceiptById(r.receiptId);
      if (res.success) {
        setSelectedReceipt(res.data);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      notify('error', err.message || 'Lỗi tải chi tiết phiếu nhập');
    }
  };

  const calculateGrandTotal = () => {
    return receiptLines.reduce((acc, curr) => acc + curr.quantity * curr.importPrice, 0);
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
            📥 Quản Lý Nhập Kho (M5.2 - M5.6)
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Lập phiếu nhập hàng từ nhà cung cấp, tự động ghi sổ kho IMPORT và tăng tồn kho nguyên tử
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedSupplierId('');
            setReceiptLines([]);
            setIsAddOpen(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
          }}
        >
          <Plus size={18} />
          Lập Phiếu Nhập Mới
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <select
          value={filterSupplier}
          onChange={(e) => {
            setFilterSupplier(e.target.value);
            setPage(1);
          }}
          style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
        >
          <option value="">-- Tất cả nhà cung cấp --</option>
          {suppliers.map((s) => (
            <option key={s.supplierId} value={s.supplierId}>
              {s.supplierName}
            </option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#64748b' }}>
          <span>Từ ngày:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#64748b' }}>
          <span>Đến ngày:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>
      </div>

      {/* Receipts Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '14px 16px' }}>Mã Phiếu</th>
              <th style={{ padding: '14px 16px' }}>Ngày Nhập</th>
              <th style={{ padding: '14px 16px' }}>Nhà Cung Cấp</th>
              <th style={{ padding: '14px 16px' }}>Nhân Viên Lập</th>
              <th style={{ padding: '14px 16px' }}>Số Mặt Hàng</th>
              <th style={{ padding: '14px 16px' }}>Tổng Tiền Nhập</th>
              <th style={{ padding: '14px 16px', textAlign: 'center' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Đang tải phiếu nhập kho...
                </td>
              </tr>
            ) : receipts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  Không tìm thấy phiếu nhập nào.
                </td>
              </tr>
            ) : (
              receipts.map((r) => (
                <tr key={r.receiptId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#64748b' }}>
                    #{r.receiptId}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#334155' }}>
                    {new Date(r.receiptDate).toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {r.supplierName}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>
                    {r.employeeName}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: '#e2e8f0', fontSize: '12px', fontWeight: 600 }}>
                      {r.itemCount || 0} mục ({r.totalQuantity || 0} đôi)
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#16a34a' }}>
                    {Number(r.totalAmount || 0).toLocaleString('vi-VN')} đ
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        title="Xem chi tiết & In phiếu"
                        onClick={() => openDetail(r)}
                        style={{ border: 'none', background: '#eff6ff', color: '#2563eb', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        title="Xóa mềm (hoàn tác kho)"
                        onClick={() => handleDeleteReceipt(r)}
                        style={{ border: 'none', background: '#fef2f2', color: '#dc2626', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
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

      {/* Modal: Lập phiếu nhập kho mới (M5.2) */}
      {isAddOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '780px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                📥 Lập Phiếu Nhập Hàng Mới (M5.2)
              </h3>
              <button onClick={() => setIsAddOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateReceipt} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Nhà Cung Cấp *
                </label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                >
                  <option value="">-- Chọn nhà cung cấp nguồn hàng --</option>
                  {suppliers.map((s) => (
                    <option key={s.supplierId} value={s.supplierId}>
                      {s.supplierName} ({s.phone || 'SĐT: N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                    Danh Sách Giày Cần Nhập:
                  </label>
                  <button
                    type="button"
                    onClick={addLine}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #2563eb',
                      background: '#eff6ff',
                      color: '#2563eb',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <PlusCircle size={15} /> Thêm Dòng Nhập
                  </button>
                </div>

                {receiptLines.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#94a3b8', fontSize: '13px' }}>
                    Chưa có dòng hàng nào. Bấm nút "Thêm Dòng Nhập" ở trên.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {receiptLines.map((line, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 100px 140px 36px',
                          gap: '10px',
                          alignItems: 'center',
                          padding: '10px',
                          backgroundColor: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <select
                          value={line.variantId}
                          onChange={(e) => updateLine(idx, 'variantId', e.target.value)}
                          style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        >
                          {allVariants.map((v) => (
                            <option key={v.variantId} value={v.variantId}>
                              {v.label}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          placeholder="SL"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />

                        <input
                          type="number"
                          placeholder="Giá nhập (đ)"
                          min="0"
                          value={line.importPrice}
                          onChange={(e) => updateLine(idx, 'importPrice', Number(e.target.value))}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />

                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          style={{ border: 'none', background: '#fee2e2', color: '#dc2626', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {receiptLines.length > 0 && (
                <div style={{ padding: '14px 18px', backgroundColor: '#f0fdf4', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#166534' }}>Tổng Tạm Tính:</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#166534' }}>
                    {calculateGrandTotal().toLocaleString('vi-VN')} đ
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Xác Nhận Nhập Kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xem Chi Tiết & In Phiếu (M5.4) */}
      {isDetailOpen && selectedReceipt && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '720px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                  PHIẾU NHẬP HÀNG (PURCHASE RECEIPT)
                </h2>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Số phiếu: <strong>#{selectedReceipt.receiptId}</strong> | Ngày:{' '}
                  {new Date(selectedReceipt.receiptDate).toLocaleString('vi-VN')}
                </div>
              </div>
              <button onClick={() => setIsDetailOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', fontSize: '13px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontWeight: 700, color: '#334155', marginBottom: '6px' }}>NHÀ CUNG CẤP:</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedReceipt.supplierName}</div>
                <div style={{ color: '#64748b', marginTop: '2px' }}>ĐT: {selectedReceipt.supplierPhone || '—'}</div>
                <div style={{ color: '#64748b', marginTop: '2px' }}>ĐC: {selectedReceipt.supplierAddress || '—'}</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontWeight: 700, color: '#334155', marginBottom: '6px' }}>NHÂN VIÊN TIẾP NHẬN:</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedReceipt.employeeName}</div>
                <div style={{ color: '#64748b', marginTop: '2px' }}>Mã NV: #{selectedReceipt.employeeId}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', marginBottom: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '10px 12px' }}>Tên Sản Phẩm / SKU</th>
                  <th style={{ padding: '10px 12px' }}>Biến Thể</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Số Lượng</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Đơn Giá Nhập</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thành Tiền</th>
                </tr>
              </thead>
              <tbody>
                {selectedReceipt.details?.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{d.productName}</div>
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>{d.sku}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>Size {d.sizeLabel} • {d.colorName}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{d.quantity}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{Number(d.importPrice).toLocaleString('vi-VN')} đ</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{Number(d.lineTotal).toLocaleString('vi-VN')} đ</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px' }}>
                Tổng Giá Trị Phiếu:{' '}
                <strong style={{ fontSize: '20px', color: '#16a34a' }}>
                  {Number(selectedReceipt.totalAmount || 0).toLocaleString('vi-VN')} đ
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
              >
                <Printer size={16} /> In Phiếu
              </button>
              <button
                onClick={() => setIsDetailOpen(false)}
                style={{ padding: '9px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
