import React, { useEffect, useState } from 'react';
import { productService } from '../services/product.service';
import { Category, Brand, Size, Color } from '../types';
import { Plus, Edit2, Trash2, CheckCircle, AlertCircle, Layers, Tag, Ruler, Palette } from 'lucide-react';

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands' | 'sizes' | 'colors'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal / Inputs
  const [editingId, setEditingId] = useState<number | null>(null);
  const [textInput, setTextInput] = useState('');
  const [secondaryInput, setSecondaryInput] = useState(''); // sortOrder or hexCode

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadAll = async () => {
    try {
      const [catsRes, brandsRes, sizesRes, colorsRes] = await Promise.all([
        productService.getCategories(),
        productService.getBrands(),
        productService.getSizes(),
        productService.getColors(),
      ]);
      if (catsRes.success) setCategories(catsRes.data);
      if (brandsRes.success) setBrands(brandsRes.data);
      if (sizesRes.success) setSizes(sizesRes.data);
      if (colorsRes.success) setColors(colorsRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    try {
      if (activeTab === 'categories') {
        if (editingId) {
          await productService.updateCategory(editingId, { categoryName: textInput });
          notify('success', 'Cập nhật danh mục thành công!');
        } else {
          await productService.createCategory({ categoryName: textInput });
          notify('success', 'Thêm mới danh mục thành công!');
        }
      } else if (activeTab === 'brands') {
        if (editingId) {
          await productService.updateBrand(editingId, { brandName: textInput });
          notify('success', 'Cập nhật thương hiệu thành công!');
        } else {
          await productService.createBrand({ brandName: textInput });
          notify('success', 'Thêm mới thương hiệu thành công!');
        }
      } else if (activeTab === 'sizes') {
        const sortOrder = Number(secondaryInput) || 0;
        if (editingId) {
          await productService.updateSize(editingId, { sizeLabel: textInput, sortOrder });
          notify('success', 'Cập nhật cỡ giày thành công!');
        } else {
          await productService.createSize({ sizeLabel: textInput, sortOrder });
          notify('success', 'Thêm mới cỡ giày thành công!');
        }
      } else if (activeTab === 'colors') {
        const hex = secondaryInput.trim() || undefined;
        if (editingId) {
          await productService.updateColor(editingId, { colorName: textInput, hexCode: hex });
          notify('success', 'Cập nhật màu sắc thành công!');
        } else {
          await productService.createColor({ colorName: textInput, hexCode: hex });
          notify('success', 'Thêm mới màu sắc thành công!');
        }
      }

      setEditingId(null);
      setTextInput('');
      setSecondaryInput('');
      loadAll();
    } catch (err: any) {
      notify('error', err.message || 'Lỗi xử lý');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mục này?')) return;
    try {
      if (activeTab === 'categories') await productService.deleteCategory(id);
      if (activeTab === 'brands') await productService.deleteBrand(id);
      if (activeTab === 'sizes') await productService.deleteSize(id);
      if (activeTab === 'colors') await productService.deleteColor(id);
      notify('success', 'Đã xóa mềm thành công!');
      loadAll();
    } catch (err: any) {
      notify('error', err.message || 'Lỗi khi xóa mục này');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
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
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
          📑 Quản Lý Thuộc Tính Danh Mục & Cỡ/Màu (M4.1 - M4.4)
        </h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
          Thiết lập cấu hình Danh mục, Thương hiệu, Cỡ giày (Size) và Bảng màu phục vụ bán hàng
        </p>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
        {[
          { id: 'categories', label: 'Danh Mục (M4.1)', icon: Layers, count: categories.length },
          { id: 'brands', label: 'Thương Hiệu (M4.2)', icon: Tag, count: brands.length },
          { id: 'sizes', label: 'Cỡ Giày (M4.3)', icon: Ruler, count: sizes.length },
          { id: 'colors', label: 'Màu Sắc (M4.4)', icon: Palette, count: colors.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setEditingId(null);
                setTextInput('');
                setSecondaryInput('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                border: 'none',
                borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                backgroundColor: 'transparent',
                color: isActive ? '#2563eb' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '-2px',
              }}
            >
              <Icon size={16} />
              {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      {/* Form Add / Edit */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '20px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
          {editingId ? '✏️ Cập Nhật' : '➕ Thêm Mới'}{' '}
          {activeTab === 'categories' && 'Danh Mục'}
          {activeTab === 'brands' && 'Thương Hiệu'}
          {activeTab === 'sizes' && 'Cỡ Giày'}
          {activeTab === 'colors' && 'Màu Sắc'}
        </h3>

        <form onSubmit={handleSave} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
              {activeTab === 'categories' && 'Tên Danh Mục *'}
              {activeTab === 'brands' && 'Tên Thương Hiệu *'}
              {activeTab === 'sizes' && 'Nhãn Cỡ Giày (Size) *'}
              {activeTab === 'colors' && 'Tên Màu Sắc *'}
            </label>
            <input
              required
              type="text"
              placeholder={activeTab === 'sizes' ? '39, 40, 41...' : activeTab === 'colors' ? 'Trắng, Đen, Xanh...' : 'Nhập tên...'}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          {activeTab === 'sizes' && (
            <div style={{ width: '160px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Thứ Tự Sắp Xếp
              </label>
              <input
                type="number"
                placeholder="1, 2, 3..."
                value={secondaryInput}
                onChange={(e) => setSecondaryInput(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {activeTab === 'colors' && (
            <div style={{ width: '180px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Mã Hex (VD: #FFFFFF)
              </label>
              <input
                type="text"
                placeholder="#000000"
                value={secondaryInput}
                onChange={(e) => setSecondaryInput(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              {editingId ? 'Cập Nhật' : 'Lưu Lại'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setTextInput('');
                  setSecondaryInput('');
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Grid Cards List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
        {activeTab === 'categories' &&
          categories.map((c) => (
            <div
              key={c.categoryId}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                padding: '14px 16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>#{c.categoryId}</span>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>{c.categoryName}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => {
                    setEditingId(c.categoryId);
                    setTextInput(c.categoryName);
                  }}
                  style={{ border: 'none', background: '#eff6ff', color: '#2563eb', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(c.categoryId)}
                  style={{ border: 'none', background: '#fef2f2', color: '#dc2626', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

        {activeTab === 'brands' &&
          brands.map((b) => (
            <div
              key={b.brandId}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                padding: '14px 16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>#{b.brandId}</span>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>{b.brandName}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => {
                    setEditingId(b.brandId);
                    setTextInput(b.brandName);
                  }}
                  style={{ border: 'none', background: '#eff6ff', color: '#2563eb', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(b.brandId)}
                  style={{ border: 'none', background: '#fef2f2', color: '#dc2626', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

        {activeTab === 'sizes' &&
          sizes.map((s) => (
            <div
              key={s.sizeId}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                padding: '14px 16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Thứ tự: {s.sortOrder}</span>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>Size {s.sizeLabel}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => {
                    setEditingId(s.sizeId);
                    setTextInput(s.sizeLabel);
                    setSecondaryInput(String(s.sortOrder));
                  }}
                  style={{ border: 'none', background: '#eff6ff', color: '#2563eb', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(s.sizeId)}
                  style={{ border: 'none', background: '#fef2f2', color: '#dc2626', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

        {activeTab === 'colors' &&
          colors.map((c) => (
            <div
              key={c.colorId}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                padding: '14px 16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {c.hexCode ? (
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: c.hexCode, border: '1px solid #cbd5e1' }} />
                ) : (
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>{c.colorName}</div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{c.hexCode || 'Chưa có hex'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => {
                    setEditingId(c.colorId);
                    setTextInput(c.colorName);
                    setSecondaryInput(c.hexCode || '');
                  }}
                  style={{ border: 'none', background: '#eff6ff', color: '#2563eb', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(c.colorId)}
                  style={{ border: 'none', background: '#fef2f2', color: '#dc2626', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
