import React, { useEffect, useState } from 'react';
import { NavIcon } from '../../components/common/NavIcon';
import { productService } from '../../services/product.service';
import { promotionService } from '../../services/promotion.service';
import type { ProductListItem } from '../../types/product';
import type {
  BatchVoucherParams,
  Promotion,
  PromotionDetailResponse,
  PromotionFormParams,
  PromotionVoucher,
  PromoType,
} from '../../types/promotion';

const PROMO_TYPE_CONFIG: Record<PromoType, { label: string; bg: string; text: string }> = {
  PRODUCT: { label: 'Theo sản phẩm', bg: '#e6fcf5', text: '#0ca678' },
  INVOICE: { label: 'Bậc hóa đơn', bg: '#fff4e6', text: '#d9480f' },
  VOUCHER: { label: 'Mã Voucher', bg: '#f3f0ff', text: '#6741d9' },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return d && m && y ? `${d}/${m}/${y}` : dateStr;
}

function formatVnd(val: number): string {
  return Number(val || 0).toLocaleString('vi-VN') + ' đ';
}

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  // Bộ lọc đang chọn (Draft)
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Bộ lọc đã ấn Tìm kiếm (Applied)
  const [appliedFilters, setAppliedFilters] = useState({
    promoType: '',
    status: 'ALL',
    search: '',
  });

  const handleSearch = () => {
    setAppliedFilters({
      promoType: filterType,
      status: filterStatus,
      search: search.trim(),
    });
  };

  const handleResetFilters = () => {
    setSearch('');
    setFilterType('');
    setFilterStatus('ALL');
    setAppliedFilters({
      promoType: '',
      status: 'ALL',
      search: '',
    });
  };

  // Modal Thêm/Sửa CTKM
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState<PromotionFormParams>({
    promotionName: '',
    promoType: 'PRODUCT',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    isActive: true,
  });

  // Modal Chi tiết & Cấu hình (Sản phẩm / Bậc HĐ / Voucher)
  const [selectedPromoId, setSelectedPromoId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<PromotionDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Dành cho tab PRODUCT: Danh sách tất cả sản phẩm để chọn
  const [allProducts, setAllProducts] = useState<ProductListItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [productDiscount, setProductDiscount] = useState<number>(10);

  // Dành cho tab INVOICE: Thêm bậc
  const [tierMinAmount, setTierMinAmount] = useState<number>(500000);
  const [tierDiscount, setTierDiscount] = useState<number>(5);

  // Dành cho tab VOUCHER: Thêm mã đơn lẻ & Sinh hàng loạt
  const [singleVoucherCode, setSingleVoucherCode] = useState('');
  const [singleVoucherPct, setSingleVoucherPct] = useState(10);
  const [singleVoucherLimit, setSingleVoucherLimit] = useState<number | ''>(100);

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchParams, setBatchParams] = useState<BatchVoucherParams>({
    count: 20,
    discountPercent: 10,
    usageLimit: 1,
    prefix: 'SALE',
    codeLength: 8,
  });
  const [generatedBatchCodes, setGeneratedBatchCodes] = useState<string[]>([]);

  // Tải danh sách khuyến mãi theo appliedFilters
  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const res = await promotionService.list({
        promoType: appliedFilters.promoType || undefined,
        status: appliedFilters.status !== 'ALL' ? appliedFilters.status : undefined,
        search: appliedFilters.search || undefined,
      });
      setPromotions(res.items);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [appliedFilters]);

  // Thống kê tổng quan hệ thống (độc lập, không bị thay đổi khi tìm kiếm/lọc)
  const [overviewStats, setOverviewStats] = useState({
    total: 0,
    running: 0,
    productCount: 0,
    voucherCount: 0,
  });

  const fetchOverviewStats = async () => {
    try {
      const res = await promotionService.list({ size: 100 });
      const items = res.items || [];
      const total = items.length;
      const running = items.filter((p) => p.status === 'RUNNING' && p.isActive).length;
      const productCount = items.filter((p) => p.promoType === 'PRODUCT').length;
      const voucherCount = items.filter((p) => p.promoType === 'VOUCHER').length;
      setOverviewStats({ total, running, productCount, voucherCount });
    } catch (err) {
      console.error('Lỗi khi tải thống kê tổng quan:', err);
    }
  };

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  // Tải chi tiết chương trình
  const loadDetail = async (id: number) => {
    setDetailLoading(true);
    setSelectedPromoId(id);
    try {
      const data = await promotionService.get(id);
      setDetailData(data);
      if (data.promotion.promoType === 'PRODUCT') {
        const pRes = await productService.list({ page: 1, size: 100 });
        setAllProducts(pRes.items);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi tải chi tiết khuyến mãi');
    } finally {
      setDetailLoading(false);
    }
  };

  // Lưu tạo/sửa chương trình
  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPromo) {
        await promotionService.update(editingPromo.promotionId, {
          promotionName: formData.promotionName,
          startDate: formData.startDate,
          endDate: formData.endDate,
          isActive: formData.isActive,
        });
      } else {
        await promotionService.create(formData);
      }
      setIsModalOpen(false);
      setEditingPromo(null);
      fetchPromotions();
      fetchOverviewStats();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lưu chương trình thất bại');
    }
  };

  // Bật/tắt trạng thái
  const handleToggleActive = async (promo: Promotion) => {
    try {
      await promotionService.toggleActive(promo.promotionId, !promo.isActive);
      fetchPromotions();
      fetchOverviewStats();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể đổi trạng thái');
    }
  };

  // Xóa chương trình
  const handleDeletePromo = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa chương trình khuyến mãi này?')) return;
    try {
      await promotionService.remove(id);
      fetchPromotions();
      fetchOverviewStats();
      if (selectedPromoId === id) {
        setSelectedPromoId(null);
        setDetailData(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xóa thất bại');
    }
  };

  // Thêm SP vào khuyến mãi
  const handleAddProduct = async () => {
    if (!detailData || !selectedProductId) return;
    const currentList = detailData.products || [];
    if (currentList.some((p) => p.productId === selectedProductId)) {
      alert('Sản phẩm này đã có trong chương trình!');
      return;
    }
    const updated = [
      ...currentList.map((p) => ({ productId: p.productId, discountPercent: p.discountPercent })),
      { productId: Number(selectedProductId), discountPercent: Number(productDiscount) },
    ];
    try {
      await promotionService.syncProducts(detailData.promotion.promotionId, updated);
      loadDetail(detailData.promotion.promotionId);
      setSelectedProductId('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Thêm sản phẩm thất bại');
    }
  };

  // Xóa SP khỏi khuyến mãi
  const handleRemoveProduct = async (productId: number) => {
    if (!detailData) return;
    const updated = (detailData.products || [])
      .filter((p) => p.productId !== productId)
      .map((p) => ({ productId: p.productId, discountPercent: p.discountPercent }));
    try {
      await promotionService.syncProducts(detailData.promotion.promotionId, updated);
      loadDetail(detailData.promotion.promotionId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xóa sản phẩm thất bại');
    }
  };

  // Thêm bậc hóa đơn
  const handleAddTier = async () => {
    if (!detailData) return;
    const current = detailData.tiers || [];
    if (current.some((t) => t.minInvoiceAmount === tierMinAmount)) {
      alert('Đã tồn tại bậc với mức tiền này!');
      return;
    }
    const updated = [
      ...current.map((t) => ({ minInvoiceAmount: t.minInvoiceAmount, discountPercent: t.discountPercent })),
      { minInvoiceAmount: Number(tierMinAmount), discountPercent: Number(tierDiscount) },
    ].sort((a, b) => a.minInvoiceAmount - b.minInvoiceAmount);

    try {
      await promotionService.syncTiers(detailData.promotion.promotionId, updated);
      loadDetail(detailData.promotion.promotionId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Thêm bậc thất bại');
    }
  };

  // Xóa bậc hóa đơn
  const handleRemoveTier = async (minAmount: number) => {
    if (!detailData) return;
    const updated = (detailData.tiers || [])
      .filter((t) => t.minInvoiceAmount !== minAmount)
      .map((t) => ({ minInvoiceAmount: t.minInvoiceAmount, discountPercent: t.discountPercent }));
    try {
      await promotionService.syncTiers(detailData.promotion.promotionId, updated);
      loadDetail(detailData.promotion.promotionId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xóa bậc thất bại');
    }
  };

  // Tạo voucher đơn lẻ
  const handleCreateSingleVoucher = async () => {
    if (!detailData || !singleVoucherCode.trim()) return;
    try {
      await promotionService.createVoucher(detailData.promotion.promotionId, {
        voucherCode: singleVoucherCode.trim(),
        discountPercent: Number(singleVoucherPct),
        usageLimit: singleVoucherLimit !== '' ? Number(singleVoucherLimit) : null,
      });
      setSingleVoucherCode('');
      loadDetail(detailData.promotion.promotionId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Tạo voucher thất bại');
    }
  };

  // Sinh voucher hàng loạt
  const handleGenerateBatch = async () => {
    if (!detailData) return;
    try {
      const res = await promotionService.generateBatchVouchers(detailData.promotion.promotionId, batchParams);
      setGeneratedBatchCodes(res.codes);
      loadDetail(detailData.promotion.promotionId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Sinh voucher thất bại');
    }
  };

  // Bật/tắt voucher
  const handleToggleVoucher = async (v: PromotionVoucher) => {
    try {
      await promotionService.toggleVoucherStatus(v.voucherCode, !v.isDeleted);
      if (selectedPromoId) loadDetail(selectedPromoId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể đổi trạng thái voucher');
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. HEADER CHÍNH */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1d2433' }}>
            Quản lý Khuyến mãi & Voucher
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6b7488', fontSize: '14px' }}>
            Cấu hình chính sách giảm giá: theo sản phẩm, bậc hóa đơn và phát hành mã voucher
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPromo(null);
            setFormData({
              promotionName: '',
              promoType: 'PRODUCT',
              startDate: new Date().toISOString().slice(0, 10),
              endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
              isActive: true,
            });
            setIsModalOpen(true);
          }}
          className="btn btn--primary"
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '15px',
            boxShadow: '0 4px 14px rgba(59, 91, 219, 0.25)',
          }}
        >
          Tạo chương trình mới
        </button>
      </div>

      {/* 2. STATS KPI CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e3e8f2', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '13px', color: '#8a93a7', fontWeight: 600 }}>TỔNG CHƯƠNG TRÌNH</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1d2433' }}>{overviewStats.total}</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e3e8f2', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '13px', color: '#2b8a3e', fontWeight: 600 }}>ĐANG DIỄN RA</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#2b8a3e' }}>{overviewStats.running}</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e3e8f2', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '13px', color: '#0ca678', fontWeight: 600 }}>KM THEO SẢN PHẨM</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0ca678' }}>{overviewStats.productCount}</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e3e8f2', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '13px', color: '#6741d9', fontWeight: 600 }}>CHƯƠNG TRÌNH VOUCHER</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#6741d9' }}>{overviewStats.voucherCount}</div>
        </div>
      </div>

      {/* 3. BỘ LỌC TÌM KIẾM */}
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #e3e8f2',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '320px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Ô tìm kiếm */}
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Tìm theo tên chương trình..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{
                width: '100%',
                padding: search ? '9px 32px 9px 14px' : '9px 14px',
                border: '1px solid #d9deea',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#8a93a7',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '2px 4px',
                }}
                title="Xóa từ khóa"
              >
                ✕
              </button>
            )}
          </div>

          {/* Dropdown hình thức khuyến mãi */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '9px 12px',
              border: '1px solid #d9deea',
              borderRadius: '8px',
              fontSize: '14px',
              background: '#fff',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Tất cả hình thức</option>
            <option value="PRODUCT">Giảm theo sản phẩm</option>
            <option value="INVOICE">Bậc hóa đơn</option>
            <option value="VOUCHER">Mã Voucher</option>
          </select>

          {/* Tab pills trạng thái */}
          <div style={{ display: 'flex', gap: '6px', background: '#f1f3f9', padding: '4px', borderRadius: '8px' }}>
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'RUNNING', label: 'Đang chạy' },
              { id: 'UPCOMING', label: 'Sắp tới' },
              { id: 'EXPIRED', label: 'Kết thúc' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setFilterStatus(st.id)}
                style={{
                  border: 0,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: filterStatus === st.id ? '#fff' : 'transparent',
                  color: filterStatus === st.id ? '#1d2433' : '#6b7488',
                  boxShadow: filterStatus === st.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nút ngoài cùng bên phải: Đặt lại & Tìm kiếm */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {(search || filterType || filterStatus !== 'ALL' || appliedFilters.search || appliedFilters.promoType || appliedFilters.status !== 'ALL') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn--outline"
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#6b7488',
                borderColor: '#d9deea',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Đặt lại
            </button>
          )}

          <button
            type="button"
            onClick={handleSearch}
            className="btn btn--primary"
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            Tìm kiếm
          </button>
        </div>
      </div>

      {/* 4. BẢNG DANH SÁCH CHƯƠNG TRÌNH KHUYẾN MÃI */}
      <div
        style={{
          background: '#fff',
          borderRadius: '14px',
          border: '1px solid #e3e8f2',
          overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fc', borderBottom: '1px solid #e3e8f2' }}>
                <th style={{ width: '60px', padding: '14px 16px' }}>Mã</th>
                <th style={{ minWidth: '220px', padding: '14px 16px' }}>Tên chương trình</th>
                <th style={{ minWidth: '150px', padding: '14px 16px' }}>Hình thức</th>
                <th style={{ minWidth: '200px', padding: '14px 16px', whiteSpace: 'nowrap' }}>Thời gian hiệu lực</th>
                <th style={{ minWidth: '130px', padding: '14px 16px' }}>Quy mô</th>
                <th style={{ minWidth: '130px', padding: '14px 16px' }}>Trạng thái</th>
                <th style={{ width: '90px', padding: '14px 16px', textAlign: 'center' }}>Bật/Tắt</th>
                <th style={{ minWidth: '160px', padding: '14px 16px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#8a93a7' }}>
                    Đang nạp dữ liệu khuyến mãi...
                  </td>
                </tr>
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '50px', textAlign: 'center', color: '#8a93a7' }}>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>Không tìm thấy chương trình khuyến mãi nào</div>
                    <div style={{ fontSize: '13px', marginTop: '4px', color: '#adb5bd' }}>Bấm "Tạo chương trình mới" để bắt đầu</div>
                  </td>
                </tr>
              ) : (
                promotions.map((p) => {
                  const typeCfg = PROMO_TYPE_CONFIG[p.promoType];
                  const isSelected = selectedPromoId === p.promotionId;

                  let statusBadge = { bg: '#eef1f7', text: '#5b6479', label: 'Đã kết thúc' };
                  if (p.status === 'RUNNING') {
                    statusBadge = { bg: '#e3f7ec', text: '#168a4f', label: 'Đang diễn ra' };
                  } else if (p.status === 'UPCOMING') {
                    statusBadge = { bg: '#e7f5ff', text: '#1971c2', label: 'Sắp diễn ra' };
                  }

                  return (
                    <tr
                      key={p.promotionId}
                      style={{
                        background: isSelected ? '#f5f7ff' : '#fff',
                        borderBottom: '1px solid #f0f2f8',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#8a93a7' }}>
                        #{p.promotionId}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#1d2433', fontSize: '15px' }}>
                          {p.promotionName}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            background: typeCfg.bg,
                            color: typeCfg.text,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {typeCfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600, color: '#2b303a' }}>{formatDate(p.startDate)}</span>
                        <span style={{ margin: '0 6px', color: '#adb5bd' }}>→</span>
                        <span style={{ fontWeight: 600, color: '#2b303a' }}>{formatDate(p.endDate)}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 700, color: '#1d2433' }}>{p.itemsCount ?? 0}</span>{' '}
                        <span style={{ color: '#6b7488', fontSize: '13px' }}>
                          {p.promoType === 'PRODUCT' ? 'sản phẩm' : p.promoType === 'INVOICE' ? 'bậc' : 'mã voucher'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: statusBadge.bg,
                            color: statusBadge.text,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {statusBadge.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <label style={{ display: 'inline-flex', cursor: 'pointer', position: 'relative' }}>
                          <input
                            type="checkbox"
                            checked={p.isActive}
                            onChange={() => handleToggleActive(p)}
                            style={{ width: '18px', height: '18px', accentColor: '#3b5bdb', cursor: 'pointer' }}
                          />
                        </label>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => loadDetail(p.promotionId)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: isSelected ? '1px solid #3b5bdb' : '1px solid #d9deea',
                              background: isSelected ? '#3b5bdb' : '#fff',
                              color: isSelected ? '#fff' : '#3b5bdb',
                              boxShadow: isSelected ? '0 2px 6px rgba(59,91,219,0.25)' : 'none',
                              transition: 'all 0.15s',
                            }}
                          >
                            Cấu hình
                          </button>
                          <button
                            onClick={() => {
                              setEditingPromo(p);
                              setFormData({
                                promotionName: p.promotionName,
                                promoType: p.promoType,
                                startDate: p.startDate,
                                endDate: p.endDate,
                                isActive: p.isActive,
                              });
                              setIsModalOpen(true);
                            }}
                            className="btn btn--ghost"
                            style={{ padding: '6px 10px', borderRadius: '8px' }}
                            title="Chỉnh sửa"
                          >
                            <NavIcon name="edit" size={14} />
                          </button>
                          <button
                            onClick={() => handleDeletePromo(p.promotionId)}
                            className="btn btn--danger"
                            style={{ padding: '6px 10px', borderRadius: '8px' }}
                            title="Xóa chương trình"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. KHU VỰC CẤU HÌNH CHI TIẾT (PANEL EXPANDABLE) */}
      {selectedPromoId && detailData && (
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid #d0d7e6',
            boxShadow: '0 8px 30px rgba(29, 36, 51, 0.08)',
            padding: '24px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* Header Panel */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '16px',
              borderBottom: '1px solid #eef1f7',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#1d2433' }}>
                  Cấu hình: {detailData.promotion.promotionName}
                </h2>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: PROMO_TYPE_CONFIG[detailData.promotion.promoType].bg,
                    color: PROMO_TYPE_CONFIG[detailData.promotion.promoType].text,
                  }}
                >
                  {PROMO_TYPE_CONFIG[detailData.promotion.promoType].label}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#8a93a7', marginTop: '4px' }}>
                Hiệu lực từ <strong>{formatDate(detailData.promotion.startDate)}</strong> đến{' '}
                <strong>{formatDate(detailData.promotion.endDate)}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedPromoId(null);
                setDetailData(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                background: '#f1f3f9',
                color: '#475066',
                border: '1px solid #d9deea',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ffe3e3';
                e.currentTarget.style.color = '#c92a2a';
                e.currentTarget.style.borderColor = '#ffa8a8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f1f3f9';
                e.currentTarget.style.color = '#475066';
                e.currentTarget.style.borderColor = '#d9deea';
              }}
            >
              ✕ Đóng panel
            </button>
          </div>

          {detailLoading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#8a93a7' }}>Đang nạp chi tiết...</div>
          ) : (
            <>
              {/* TAB 1: PRODUCT */}
              {detailData.promotion.promoType === 'PRODUCT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Form thêm sản phẩm */}
                  <div
                    style={{
                      background: '#f8f9fc',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid #e3e8f2',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px',
                      alignItems: 'flex-end',
                    }}
                  >
                    <div style={{ flex: '1', minWidth: '260px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475066', marginBottom: '6px' }}>
                        Chọn sản phẩm áp dụng:
                      </label>
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : '')}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #d9deea',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fff',
                        }}
                      >
                        <option value="">-- Chọn sản phẩm từ danh mục kho --</option>
                        {allProducts.map((prod) => (
                          <option key={prod.productId} value={prod.productId}>
                            {prod.productName} ({formatVnd(prod.currentPrice)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ width: '130px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475066', marginBottom: '6px' }}>
                        % Giảm giá:
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={productDiscount}
                          onChange={(e) => setProductDiscount(Number(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '9px 24px 9px 12px',
                            border: '1px solid #d9deea',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 700,
                          }}
                        />
                        <span style={{ position: 'absolute', right: '10px', top: '9px', color: '#8a93a7', fontWeight: 600 }}>%</span>
                      </div>
                    </div>

                    <button
                      onClick={handleAddProduct}
                      disabled={!selectedProductId}
                      className="btn btn--primary"
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        background: '#0ca678',
                      }}
                    >
                      Thêm vào danh sách
                    </button>
                  </div>

                  {/* Bảng sản phẩm */}
                  <div style={{ overflowX: 'auto', border: '1px solid #e3e8f2', borderRadius: '12px' }}>
                    <table className="table" style={{ margin: 0 }}>
                      <thead>
                        <tr style={{ background: '#f8f9fc' }}>
                          <th style={{ width: '70px', padding: '12px' }}>Mã SP</th>
                          <th style={{ padding: '12px' }}>Tên sản phẩm</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Giá niêm yết</th>
                          <th style={{ padding: '12px', textAlign: 'center' }}>Chiết khấu</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Giá sau giảm</th>
                          <th style={{ width: '90px', padding: '12px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detailData.products || []).length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#8a93a7' }}>
                              Chưa có sản phẩm nào được gán vào chương trình này.
                            </td>
                          </tr>
                        ) : (
                          detailData.products?.map((p) => (
                            <tr key={p.productId}>
                              <td style={{ padding: '12px', fontWeight: 700, color: '#8a93a7' }}>#{p.productId}</td>
                              <td style={{ padding: '12px', fontWeight: 600 }}>{p.productName}</td>
                              <td style={{ padding: '12px', textAlign: 'right', color: '#8a93a7', textDecoration: 'line-through' }}>
                                {formatVnd(p.currentPrice)}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <span style={{ background: '#fff0f6', color: '#d6336c', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                                  -{p.discountPercent}%
                                </span>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: '#0ca678' }}>
                                {formatVnd(p.salePrice)}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProduct(p.productId)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '12.5px',
                                    fontWeight: 700,
                                    border: '1px solid #fca5a5',
                                    background: '#fef2f2',
                                    color: '#b91c1c',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(185, 28, 28, 0.08)',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#fee2e2';
                                    e.currentTarget.style.borderColor = '#f87171';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#fef2f2';
                                    e.currentTarget.style.borderColor = '#fca5a5';
                                  }}
                                  title="Xóa sản phẩm khỏi chương trình"
                                >
                                  Xóa
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: INVOICE */}
              {detailData.promotion.promoType === 'INVOICE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Form thêm bậc */}
                  <div
                    style={{
                      background: '#f8f9fc',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid #e3e8f2',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px',
                      alignItems: 'flex-end',
                    }}
                  >
                    <div style={{ flex: '1', minWidth: '220px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475066', marginBottom: '6px' }}>
                        Mức đơn hàng tối thiểu (VNĐ):
                      </label>
                      <input
                        type="number"
                        step="50000"
                        min="0"
                        value={tierMinAmount}
                        onChange={(e) => setTierMinAmount(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #d9deea',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 700,
                        }}
                      />
                    </div>

                    <div style={{ width: '130px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475066', marginBottom: '6px' }}>
                        % Giảm giá:
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={tierDiscount}
                          onChange={(e) => setTierDiscount(Number(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '9px 24px 9px 12px',
                            border: '1px solid #d9deea',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 700,
                          }}
                        />
                        <span style={{ position: 'absolute', right: '10px', top: '9px', color: '#8a93a7', fontWeight: 600 }}>%</span>
                      </div>
                    </div>

                    <button
                      onClick={handleAddTier}
                      className="btn btn--primary"
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        background: '#d9480f',
                      }}
                    >
                      Thêm bậc ưu đãi
                    </button>
                  </div>

                  {/* Bảng bậc chiết khấu */}
                  <div style={{ overflowX: 'auto', border: '1px solid #e3e8f2', borderRadius: '12px' }}>
                    <table className="table" style={{ margin: 0 }}>
                      <thead>
                        <tr style={{ background: '#f8f9fc' }}>
                          <th style={{ padding: '12px' }}>Điều kiện áp dụng</th>
                          <th style={{ padding: '12px', textAlign: 'center' }}>Tỷ lệ giảm giá</th>
                          <th style={{ width: '90px', padding: '12px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detailData.tiers || []).length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ padding: '30px', textAlign: 'center', color: '#8a93a7' }}>
                              Chưa có bậc giảm giá nào được thiết lập.
                            </td>
                          </tr>
                        ) : (
                          detailData.tiers?.map((t) => (
                            <tr key={t.minInvoiceAmount}>
                              <td style={{ padding: '12px', fontWeight: 600, fontSize: '15px' }}>
                                Đơn hàng từ <span style={{ color: '#d9480f' }}>{formatVnd(t.minInvoiceAmount)}</span> trở lên
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <span style={{ background: '#fff4e6', color: '#d9480f', fontWeight: 800, padding: '4px 12px', borderRadius: '6px', fontSize: '14px' }}>
                                  Giảm {t.discountPercent}%
                                </span>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTier(t.minInvoiceAmount)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '12.5px',
                                    fontWeight: 700,
                                    border: '1px solid #fca5a5',
                                    background: '#fef2f2',
                                    color: '#b91c1c',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(185, 28, 28, 0.08)',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#fee2e2';
                                    e.currentTarget.style.borderColor = '#f87171';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#fef2f2';
                                    e.currentTarget.style.borderColor = '#fca5a5';
                                  }}
                                  title="Xóa bậc giảm giá này"
                                >
                                  Xóa
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: VOUCHER */}
              {detailData.promotion.promoType === 'VOUCHER' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Action Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontWeight: 700, color: '#1d2433' }}>
                      Mã Voucher phát hành: <span style={{ color: '#6741d9' }}>{detailData.vouchers?.items.length ?? 0}</span>
                    </div>

                    <button
                      onClick={() => {
                        setGeneratedBatchCodes([]);
                        setIsBatchModalOpen(true);
                      }}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '8px',
                        background: '#6741d9',
                        color: '#fff',
                        border: 0,
                        fontWeight: 700,
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(103,65,217,0.25)',
                      }}
                    >
                      Sinh hàng loạt voucher tự động
                    </button>
                  </div>

                  {/* Form tạo mã thủ công */}
                  <div
                    style={{
                      background: '#f8f9fc',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid #e3e8f2',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px',
                      alignItems: 'flex-end',
                    }}
                  >
                    <div style={{ flex: '2', minWidth: '180px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475066', marginBottom: '6px' }}>
                        Mã voucher (tự nhập):
                      </label>
                      <input
                        type="text"
                        placeholder="VD: CHAOHET2026"
                        value={singleVoucherCode}
                        onChange={(e) => setSingleVoucherCode(e.target.value.toUpperCase())}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #d9deea',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 700,
                          letterSpacing: '0.5px',
                        }}
                      />
                    </div>

                    <div style={{ width: '110px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475066', marginBottom: '6px' }}>
                        % Giảm:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={singleVoucherPct}
                        onChange={(e) => setSingleVoucherPct(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #d9deea',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 700,
                        }}
                      />
                    </div>

                    <div style={{ width: '150px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475066', marginBottom: '6px' }}>
                        Giới hạn lượt dùng:
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Không giới hạn"
                        value={singleVoucherLimit}
                        onChange={(e) => setSingleVoucherLimit(e.target.value ? Number(e.target.value) : '')}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #d9deea',
                          borderRadius: '8px',
                          fontSize: '14px',
                        }}
                      />
                    </div>

                    <button
                      onClick={handleCreateSingleVoucher}
                      disabled={!singleVoucherCode.trim()}
                      className="btn btn--primary"
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        background: '#3b5bdb',
                      }}
                    >
                      Tạo mã này
                    </button>
                  </div>

                  {/* Bảng danh sách voucher */}
                  <div style={{ overflowX: 'auto', border: '1px solid #e3e8f2', borderRadius: '12px' }}>
                    <table className="table" style={{ margin: 0 }}>
                      <thead>
                        <tr style={{ background: '#f8f9fc' }}>
                          <th style={{ padding: '12px' }}>Mã Voucher</th>
                          <th style={{ padding: '12px', textAlign: 'center' }}>Mức giảm</th>
                          <th style={{ padding: '12px', textAlign: 'center' }}>Đã dùng / Giới hạn</th>
                          <th style={{ padding: '12px', textAlign: 'center' }}>Tình trạng</th>
                          <th style={{ width: '130px', padding: '12px', textAlign: 'right' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detailData.vouchers?.items || []).length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#8a93a7' }}>
                              Chưa có mã voucher nào được tạo.
                            </td>
                          </tr>
                        ) : (
                          detailData.vouchers?.items.map((v) => (
                            <tr key={v.voucherCode}>
                              <td style={{ padding: '12px' }}>
                                <code
                                  style={{
                                    background: '#f1f3f9',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '13.5px',
                                    fontWeight: 700,
                                    color: '#1d2433',
                                    border: '1px solid #e3e8f2',
                                  }}
                                >
                                  {v.voucherCode}
                                </code>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <span style={{ background: '#f3f0ff', color: '#6741d9', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                                  -{v.discountPercent}%
                                </span>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>
                                <span style={{ color: v.usageLimit && v.usedCount >= v.usageLimit ? '#e03131' : '#1d2433' }}>
                                  {v.usedCount}
                                </span>{' '}
                                / <span style={{ color: '#8a93a7' }}>{v.usageLimit ?? '∞'}</span>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                {v.isDeleted ? (
                                  <span style={{ color: '#d64545', fontWeight: 600, fontSize: '12px' }}>Đã khóa</span>
                                ) : v.usageLimit !== null && v.usedCount >= v.usageLimit ? (
                                  <span style={{ color: '#f59f00', fontWeight: 600, fontSize: '12px' }}>Hết lượt</span>
                                ) : (
                                  <span style={{ color: '#168a4f', fontWeight: 600, fontSize: '12px' }}>Khả dụng</span>
                                )}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleVoucher(v)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '7px 14px',
                                    borderRadius: '8px',
                                    fontSize: '12.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    border: v.isDeleted ? '1px solid #a7f3d0' : '1px solid #fecdd3',
                                    background: v.isDeleted ? '#ecfdf5' : '#fff1f2',
                                    color: v.isDeleted ? '#059669' : '#e11d48',
                                    boxShadow: v.isDeleted
                                      ? '0 1px 3px rgba(5, 150, 105, 0.12)'
                                      : '0 1px 3px rgba(225, 29, 72, 0.12)',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = v.isDeleted ? '#d1fae5' : '#ffe4e6';
                                    e.currentTarget.style.borderColor = v.isDeleted ? '#6ee7b7' : '#fda4af';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = v.isDeleted ? '#ecfdf5' : '#fff1f2';
                                    e.currentTarget.style.borderColor = v.isDeleted ? '#a7f3d0' : '#fecdd3';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                  }}
                                  title={v.isDeleted ? 'Kích hoạt lại mã voucher này' : 'Tạm khóa / vô hiệu hóa mã này'}
                                >
                                  {v.isDeleted ? 'Mở lại' : 'Vô hiệu hóa'}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 6. MODAL THÊM / SỬA CHƯƠNG TRÌNH */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="modal__title" style={{ margin: 0 }}>
                {editingPromo ? 'Chỉnh sửa chương trình' : 'Tạo chương trình khuyến mãi mới'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 0, fontSize: '18px', cursor: 'pointer', color: '#8a93a7' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePromo} className="form">
              <div className="field">
                <label>Tên chương trình khuyến mãi:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giảm giá mùa hè 2026"
                  value={formData.promotionName}
                  onChange={(e) => setFormData({ ...formData, promotionName: e.target.value })}
                />
              </div>

              {!editingPromo && (
                <div className="field">
                  <label>Loại hình khuyến mãi:</label>
                  <select
                    value={formData.promoType}
                    onChange={(e) => setFormData({ ...formData, promoType: e.target.value as PromoType })}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #d9deea',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fff',
                    }}
                  >
                    <option value="PRODUCT">Khuyến mãi theo từng sản phẩm (PRODUCT)</option>
                    <option value="INVOICE">Khuyến mãi theo bậc hóa đơn (INVOICE)</option>
                    <option value="VOUCHER">Mã giảm giá Voucher (VOUCHER)</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="field">
                  <label>Ngày bắt đầu:</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Ngày kết thúc:</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#3b5bdb' }}
                />
                <label htmlFor="activeCheck" style={{ fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                  Kích hoạt chương trình ngay
                </label>
              </div>

              <div className="form__actions" style={{ marginTop: '14px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn--ghost">
                  Hủy
                </button>
                <button type="submit" className="btn btn--primary">
                  {editingPromo ? 'Lưu thay đổi' : 'Tạo chương trình'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL SINH VOUCHER HÀNG LOẠT */}
      {isBatchModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="modal__title" style={{ margin: 0 }}>
                Sinh mã Voucher hàng loạt tự động
              </h2>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                style={{ background: 'none', border: 0, fontSize: '18px', cursor: 'pointer', color: '#8a93a7' }}
              >
                ✕
              </button>
            </div>

            {generatedBatchCodes.length === 0 ? (
              <div className="form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="field">
                    <label>Số lượng mã cần sinh:</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={batchParams.count}
                      onChange={(e) => setBatchParams({ ...batchParams, count: Number(e.target.value) })}
                    />
                  </div>
                  <div className="field">
                    <label>Phần trăm giảm (%):</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={batchParams.discountPercent}
                      onChange={(e) => setBatchParams({ ...batchParams, discountPercent: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="field">
                    <label>Tiền tố mã (VD: VIP, TET):</label>
                    <input
                      type="text"
                      placeholder="Tùy chọn"
                      value={batchParams.prefix}
                      onChange={(e) => setBatchParams({ ...batchParams, prefix: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="field">
                    <label>Lượt dùng tối đa mỗi mã:</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1 (dùng 1 lần)"
                      value={batchParams.usageLimit ?? ''}
                      onChange={(e) =>
                        setBatchParams({
                          ...batchParams,
                          usageLimit: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                </div>

                <p style={{ margin: '4px 0', fontSize: '12.5px', color: '#8a93a7' }}>
                  Lưu ý: Mã được tạo tự động từ bộ ký tự đã loại trừ <code>0, O, 1, I</code> để tránh nhầm lẫn khi người dùng gõ tay.
                </p>

                <div className="form__actions" style={{ marginTop: '16px' }}>
                  <button type="button" onClick={() => setIsBatchModalOpen(false)} className="btn btn--ghost">
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateBatch}
                    className="btn btn--primary"
                    style={{ background: '#6741d9' }}
                  >
                    Bắt đầu sinh mã
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background: '#e3f7ec', color: '#168a4f', padding: '12px 16px', borderRadius: '8px', fontWeight: 700, marginBottom: '14px' }}>
                  Đã sinh thành công {generatedBatchCodes.length} mã voucher mới!
                </div>

                <div
                  style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    background: '#f8f9fc',
                    border: '1px solid #e3e8f2',
                    borderRadius: '8px',
                    padding: '12px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '6px',
                    marginBottom: '16px',
                  }}
                >
                  {generatedBatchCodes.map((c) => (
                    <div key={c} style={{ background: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #d9deea', textAlign: 'center' }}>
                      {c}
                    </div>
                  ))}
                </div>

                <div className="form__actions">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedBatchCodes.join('\n'));
                      alert('Đã sao chép tất cả các mã vào bộ nhớ tạm!');
                    }}
                    className="btn btn--ghost"
                  >
                    Sao chép tất cả mã
                  </button>
                  <button
                    onClick={() => setIsBatchModalOpen(false)}
                    className="btn btn--primary"
                  >
                    Hoàn tất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
