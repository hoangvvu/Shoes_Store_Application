import React, { useEffect, useState } from 'react';
import { productService } from '../services/product.service';
import { Product, Category, Brand, Size, Color } from '../types';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Grid,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Layers,
  X,
} from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterBrand, setFilterBrand] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Product Form
  const [productForm, setProductForm] = useState({
    productName: '',
    categoryId: '',
    brandId: '',
    currentPrice: 1500000,
    unit: 'Đôi',
    description: '',
    imageUrl: '',
    isActive: true,
  });

  // Bulk Variant Form
  const [bulkSizeIds, setBulkSizeIds] = useState<number[]>([]);
  const [bulkColorIds, setBulkColorIds] = useState<number[]>([]);

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCatalogData = async () => {
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

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await productService.getProducts({
        q: search || undefined,
        categoryId: filterCategory ? Number(filterCategory) : undefined,
        brandId: filterBrand ? Number(filterBrand) : undefined,
        page,
        size: 10,
      });
      if (res.success) {
        setProducts(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
        }
      }
    } catch (err: any) {
      notify('error', err.message || 'Lỗi tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogData();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [page, filterCategory, filterBrand]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadProducts();
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await productService.createProduct({
        productName: productForm.productName,
        categoryId: productForm.categoryId ? Number(productForm.categoryId) : undefined,
        brandId: productForm.brandId ? Number(productForm.brandId) : undefined,
        currentPrice: Number(productForm.currentPrice),
        unit: productForm.unit,
        description: productForm.description,
        imageUrl: productForm.imageUrl,
        isActive: productForm.isActive,
      });
      notify('success', 'Thêm mới sản phẩm thành công!');
      setIsAddOpen(false);
      setProductForm({
        productName: '',
        categoryId: '',
        brandId: '',
        currentPrice: 1500000,
        unit: 'Đôi',
        description: '',
        imageUrl: '',
        isActive: true,
      });
      loadProducts();
    } catch (err: any) {
      notify('error', err.message || 'Lỗi khi tạo sản phẩm');
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      await productService.updateProduct(selectedProduct.productId, {
        productName: productForm.productName,
        categoryId: productForm.categoryId ? Number(productForm.categoryId) : undefined,
        brandId: productForm.brandId ? Number(productForm.brandId) : undefined,
        currentPrice: Number(productForm.currentPrice),
        unit: productForm.unit,
        description: productForm.description,
        imageUrl: productForm.imageUrl,
        isActive: productForm.isActive,
      });
      notify('success', 'Cập nhật sản phẩm thành công! (Thay đổi giá đã được ghi audit)');
      setIsEditOpen(false);
      loadProducts();
    } catch (err: any) {
      notify('error', err.message || 'Lỗi cập nhật sản phẩm');
    }
  };

  const handleToggleActive = async (p: Product) => {
    try {
      await productService.toggleActive(p.productId, !p.isActive);
      notify('success', `Đã ${!p.isActive ? 'hiển thị' : 'ẩn'} sản phẩm "${p.productName}"`);
      loadProducts();
    } catch (err: any) {
      notify('error', err.message || 'Lỗi đổi trạng thái');
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mềm sản phẩm "${p.productName}" và tất cả biến thể của nó?`)) return;
    try {
      await productService.deleteProduct(p.productId);
      notify('success', 'Xóa mềm sản phẩm và biến thể thành công!');
      loadProducts();
    } catch (err: any) {
      notify('error', err.message || 'Lỗi xóa sản phẩm');
    }
  };

  const openBulkModal = (p: Product) => {
    setSelectedProduct(p);
    setBulkSizeIds([]);
    setBulkColorIds([]);
    setIsBulkOpen(true);
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (bulkSizeIds.length === 0 || bulkColorIds.length === 0) {
      notify('error', 'Vui lòng chọn ít nhất 1 size và 1 màu');
      return;
    }
    try {
      const res = await productService.bulkCreateVariants(selectedProduct.productId, {
        sizeIds: bulkSizeIds,
        colorIds: bulkColorIds,
      });
      notify('success', `Đã tạo ${res.data.createdCount} biến thể size x màu theo SKU tự động!`);
      setIsBulkOpen(false);
      loadProducts();
    } catch (err: any) {
      notify('error', err.message || 'Lỗi sinh biến thể');
    }
  };

  const openDetailModal = async (p: Product) => {
    try {
      const res = await productService.getProductById(p.productId);
      if (res.success) {
        setSelectedProduct(res.data);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      notify('error', err.message || 'Lỗi lấy chi tiết sản phẩm');
    }
  };

  const openEditModal = (p: Product) => {
    setSelectedProduct(p);
    setProductForm({
      productName: p.productName,
      categoryId: p.categoryId ? String(p.categoryId) : '',
      brandId: p.brandId ? String(p.brandId) : '',
      currentPrice: p.currentPrice,
      unit: p.unit || 'Đôi',
      description: p.description || '',
      imageUrl: p.imageUrl || '',
      isActive: p.isActive,
    });
    setIsEditOpen(true);
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
            👟 Quản Lý Sản Phẩm & Biến Thể (M4)
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Quản lý kho giày, đổi giá (audit), tạo biến thể tự động (Tích Descartes size x màu), SKU
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
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
          Thêm Sản Phẩm Mới
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
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Tìm theo tên sản phẩm (không phân biệt dấu)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Tìm
          </button>
        </form>

        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(1);
          }}
          style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.categoryId} value={c.categoryId}>
              {c.categoryName}
            </option>
          ))}
        </select>

        <select
          value={filterBrand}
          onChange={(e) => {
            setFilterBrand(e.target.value);
            setPage(1);
          }}
          style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
        >
          <option value="">Tất cả thương hiệu</option>
          {brands.map((b) => (
            <option key={b.brandId} value={b.brandId}>
              {b.brandName}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '14px 16px' }}>Mã SP</th>
              <th style={{ padding: '14px 16px' }}>Ảnh & Tên Giày</th>
              <th style={{ padding: '14px 16px' }}>Danh Mục / Hãng</th>
              <th style={{ padding: '14px 16px' }}>Giá Hiện Hành</th>
              <th style={{ padding: '14px 16px' }}>Tổng Tồn / Biến Thể</th>
              <th style={{ padding: '14px 16px' }}>Trạng Thái</th>
              <th style={{ padding: '14px 16px', textAlign: 'center' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Đang tải danh sách giày...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  Không tìm thấy sản phẩm nào.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr
                  key={p.productId}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    opacity: p.isActive ? 1 : 0.65,
                  }}
                >
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#64748b' }}>
                    #{p.productId}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.productName}
                          style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '6px',
                            backgroundColor: '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            fontSize: '12px',
                          }}
                        >
                          Giày
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.productName}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>ĐVT: {p.unit || 'Đôi'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: '#334155' }}>{p.categoryName || '—'}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{p.brandName || '—'}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#ef4444' }}>
                    {Number(p.currentPrice).toLocaleString('vi-VN')} đ
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: p.totalStock && p.totalStock > 0 ? '#16a34a' : '#dc2626' }}>
                      {p.totalStock || 0} đôi
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      ({p.variantCount || 0} biến thể size-màu)
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: p.isActive ? '#dcfce7' : '#f1f5f9',
                        color: p.isActive ? '#15803d' : '#64748b',
                      }}
                    >
                      {p.isActive ? 'Đang bán' : 'Ẩn'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                      <button
                        title="Xem chi tiết & biến thể (M4.14)"
                        onClick={() => openDetailModal(p)}
                        style={{ border: 'none', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <Layers size={15} />
                      </button>
                      <button
                        title="Sinh biến thể hàng loạt Size x Màu (M4.9)"
                        onClick={() => openBulkModal(p)}
                        style={{ border: 'none', backgroundColor: '#fef3c7', color: '#b45309', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <Grid size={15} />
                      </button>
                      <button
                        title="Sửa sản phẩm / đổi giá (M4.6)"
                        onClick={() => openEditModal(p)}
                        style={{ border: 'none', backgroundColor: '#eff6ff', color: '#2563eb', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        title={p.isActive ? 'Ẩn sản phẩm' : 'Hiện sản phẩm'}
                        onClick={() => handleToggleActive(p)}
                        style={{ border: 'none', backgroundColor: '#f3f4f6', color: '#4b5563', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        {p.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button
                        title="Xóa mềm sản phẩm & biến thể (M4.8)"
                        onClick={() => handleDeleteProduct(p)}
                        style={{ border: 'none', backgroundColor: '#fef2f2', color: '#dc2626', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <Trash2 size={15} />
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

      {/* Modal: Thêm / Sửa Sản Phẩm */}
      {(isAddOpen || isEditOpen) && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '580px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                {isAddOpen ? '➕ Thêm Sản Phẩm Mới (M4.5)' : '✏️ Cập Nhật Sản Phẩm (M4.6)'}
              </h3>
              <button onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={isAddOpen ? handleCreateProduct : handleUpdateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Tên Giày *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ví dụ: Nike Air Zoom Pegasus 40"
                  value={productForm.productName}
                  onChange={(e) => setProductForm({ ...productForm, productName: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Danh Mục
                  </label>
                  <select
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => (
                      <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Thương Hiệu
                  </label>
                  <select
                    value={productForm.brandId}
                    onChange={(e) => setProductForm({ ...productForm, brandId: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  >
                    <option value="">-- Chọn thương hiệu --</option>
                    {brands.map((b) => (
                      <option key={b.brandId} value={b.brandId}>{b.brandName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Giá Hiện Hành (VNĐ) * {isEditOpen && <span style={{ color: '#2563eb', fontSize: '11px' }}>(Đổi giá sẽ tự audit)</span>}
                  </label>
                  <input
                    required
                    type="number"
                    value={productForm.currentPrice}
                    onChange={(e) => setProductForm({ ...productForm, currentPrice: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Đơn Vị Tính
                  </label>
                  <input
                    type="text"
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  URL Ảnh Sản Phẩm
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Mô Tả Sản Phẩm
                </label>
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {isAddOpen ? 'Tạo Sản Phẩm' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sinh biến thể hàng loạt theo tích Descartes (M4.9) */}
      {isBulkOpen && selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '540px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                ⚡ Sinh Biến Thể Hàng Loạt (M4.9)
              </h3>
              <button onClick={() => setIsBulkOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#64748b' }}>
              Sản phẩm: <strong style={{ color: '#0f172a' }}>{selectedProduct.productName}</strong>.
              Hệ thống sẽ sinh mọi tổ hợp (Tích Descartes Size × Màu) với mã SKU tự động, tồn kho ban đầu = 0.
            </p>

            <form onSubmit={handleBulkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                  1. Chọn các Cỡ Giày (Sizes):
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {sizes.map((s) => {
                    const isSelected = bulkSizeIds.includes(s.sizeId);
                    return (
                      <button
                        type="button"
                        key={s.sizeId}
                        onClick={() => {
                          setBulkSizeIds((prev) =>
                            isSelected ? prev.filter((id) => id !== s.sizeId) : [...prev, s.sizeId]
                          );
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                          color: isSelected ? '#1d4ed8' : '#334155',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        Size {s.sizeLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                  2. Chọn các Màu Sắc (Colors):
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {colors.map((c) => {
                    const isSelected = bulkColorIds.includes(c.colorId);
                    return (
                      <button
                        type="button"
                        key={c.colorId}
                        onClick={() => {
                          setBulkColorIds((prev) =>
                            isSelected ? prev.filter((id) => id !== c.colorId) : [...prev, c.colorId]
                          );
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                          color: isSelected ? '#1d4ed8' : '#334155',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        {c.hexCode && (
                          <span
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: c.hexCode,
                              border: '1px solid #cbd5e1',
                            }}
                          />
                        )}
                        {c.colorName}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#475569' }}>
                Tổng số biến thể sẽ sinh: <strong>{bulkSizeIds.length * bulkColorIds.length}</strong> tổ hợp.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsBulkOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Sinh Biến Thể Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chi tiết biến thể (M4.14 & M4.10) */}
      {isDetailOpen && selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '700px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  📦 Chi Tiết Sản Phẩm & Biến Thể (M4.14)
                </h3>
                <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
                  {selectedProduct.productName} • #{selectedProduct.productId}
                </div>
              </div>
              <button onClick={() => setIsDetailOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', marginBottom: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px' }}>Mã Biến Thể</th>
                  <th style={{ padding: '10px 12px' }}>Mã SKU</th>
                  <th style={{ padding: '10px 12px' }}>Cỡ Size</th>
                  <th style={{ padding: '10px 12px' }}>Màu Sắc</th>
                  <th style={{ padding: '10px 12px' }}>Tồn Kho</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {!selectedProduct.variants || selectedProduct.variants.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                      Chưa có biến thể nào. Hãy dùng nút "Sinh Biến Thể Hàng Loạt".
                    </td>
                  </tr>
                ) : (
                  selectedProduct.variants.map((v) => (
                    <tr key={v.variantId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>#{v.variantId}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{v.sku}</td>
                      <td style={{ padding: '10px 12px' }}>Size {v.sizeLabel}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {v.hexCode && (
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: v.hexCode, border: '1px solid #cbd5e1' }} />
                          )}
                          {v.colorName}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: v.stockQuantity > 0 ? '#16a34a' : '#dc2626' }}>
                        {v.stockQuantity} đôi
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          title="Xóa biến thể"
                          onClick={async () => {
                            if (!window.confirm(`Xóa biến thể SKU ${v.sku}?`)) return;
                            try {
                              await productService.deleteVariant(v.variantId);
                              notify('success', 'Đã xóa mềm biến thể!');
                              openDetailModal(selectedProduct);
                            } catch (err: any) {
                              notify('error', err.message || 'Lỗi khi xóa biến thể');
                            }
                          }}
                          style={{ border: 'none', background: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <button
              onClick={() => setIsDetailOpen(false)}
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
