import React, { useEffect, useState } from 'react';
import { supplierService } from '../services/supplier.service';
import { Supplier } from '../types';
import { Plus, Search, Edit2, Trash2, CheckCircle, AlertCircle, Building2, Phone, Mail, MapPin } from 'lucide-react';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    supplierName: '',
    phone: '',
    email: '',
    address: '',
  });

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await supplierService.getSuppliers({ q: search, page, size: 10 });
      if (res.success) {
        setSuppliers(res.data);
        if (res.pagination) setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err: any) {
      notify('error', err.message || 'Lỗi tải danh sách nhà cung cấp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await supplierService.updateSupplier(editingSupplier.supplierId, form);
        notify('success', 'Cập nhật nhà cung cấp thành công!');
      } else {
        await supplierService.createSupplier(form);
        notify('success', 'Thêm mới nhà cung cấp thành công!');
      }
      setIsOpen(false);
      setEditingSupplier(null);
      setForm({ supplierName: '', phone: '', email: '', address: '' });
      loadSuppliers();
    } catch (err: any) {
      notify('error', err.message || 'Lỗi khi lưu nhà cung cấp');
    }
  };

  const handleDelete = async (s: Supplier) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhà cung cấp "${s.supplierName}"?`)) return;
    try {
      await supplierService.deleteSupplier(s.supplierId);
      notify('success', 'Đã xóa nhà cung cấp!');
      loadSuppliers();
    } catch (err: any) {
      notify('error', err.message || 'Lỗi khi xóa nhà cung cấp');
    }
  };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setForm({
      supplierName: s.supplierName,
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
    });
    setIsOpen(true);
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
            🏭 Quản Lý Nhà Cung Cấp (M5.1)
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Danh bạ các nguồn hàng giày thể thao chính hãng và đối tác nhập kho
          </p>
        </div>

        <button
          onClick={() => {
            setEditingSupplier(null);
            setForm({ supplierName: '', phone: '', email: '', address: '' });
            setIsOpen(true);
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
          }}
        >
          <Plus size={18} />
          Thêm Nhà Cung Cấp
        </button>
      </div>

      {/* Search */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '16px 20px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            loadSuppliers();
          }}
          style={{ display: 'flex', gap: '10px', maxWidth: '450px' }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Tìm theo tên, email hoặc SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 500, cursor: 'pointer' }}>
            Tìm
          </button>
        </form>
      </div>

      {/* Grid Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {loading ? (
          <p style={{ color: '#64748b' }}>Đang tải nhà cung cấp...</p>
        ) : suppliers.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>Chưa có nhà cung cấp nào.</p>
        ) : (
          suppliers.map((s) => (
            <div
              key={s.supplierId}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={18} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>{s.supplierName}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>#{s.supplierId}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={14} color="#64748b" />
                    <span>{s.phone || 'Chưa cập nhật SĐT'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={14} color="#64748b" />
                    <span>{s.email || 'Chưa cập nhật Email'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={14} color="#64748b" />
                    <span>{s.address || 'Chưa có địa chỉ'}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <button
                  onClick={() => openEdit(s)}
                  style={{ border: 'none', background: '#eff6ff', color: '#2563eb', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}
                >
                  <Edit2 size={13} /> Sửa
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  style={{ border: 'none', background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}
                >
                  <Trash2 size={13} /> Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
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

      {/* Modal Add / Edit */}
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
              {editingSupplier ? '✏️ Sửa Nhà Cung Cấp' : '➕ Thêm Nhà Cung Cấp Mới'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Tên Nhà Cung Cấp *
                </label>
                <input
                  required
                  type="text"
                  value={form.supplierName}
                  onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Số Điện Thoại
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Địa Chỉ Trụ Sở
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Lưu Lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
