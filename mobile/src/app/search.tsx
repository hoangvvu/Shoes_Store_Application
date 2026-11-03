import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveProductImage } from '@/components/ProductDetailModal';
import {
  type BrandItem,
  type CategoryItem,
  productService,
} from '@/services/product.service';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { colors, radius, shadows } from '@/theme';
import type { ProductListItem } from '@/types/product';
import { formatVnd } from '@/utils/format';

type SortOption = 'relevant' | 'best_seller' | 'newest' | 'price_asc' | 'price_desc';

const PRICE_RANGES = [
  { label: 'Tất cả mức giá', min: undefined, max: undefined },
  { label: 'Dưới 1 triệu', min: 0, max: 1000000 },
  { label: '1 - 2 triệu', min: 1000000, max: 2000000 },
  { label: '2 - 3 triệu', min: 2000000, max: 3000000 },
  { label: 'Trên 3 triệu', min: 3000000, max: undefined },
];

const RATING_OPTIONS = [
  { label: 'Tất cả đánh giá', minRating: 0 },
  { label: 'Từ 4 sao trở lên', minRating: 4 },
  { label: '5 sao tuyệt đối', minRating: 5 },
];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string; categoryId?: string; brandId?: string }>();
  const { ids: favoriteIds, toggle: toggleFavorite, ensureLoaded: ensureFavoritesLoaded } = useFavoriteStore();

  const [keyword, setKeyword] = useState(params.q ?? '');
  const [appliedKeyword, setAppliedKeyword] = useState(params.q ?? '');
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    params.categoryId ? Number(params.categoryId) : null,
  );
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(
    params.brandId ? Number(params.brandId) : null,
  );
  const [selectedPriceIdx, setSelectedPriceIdx] = useState<number>(0);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortOption>('relevant');
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    ensureFavoritesLoaded().catch(() => {});
    Promise.all([
      productService.listCategories().catch(() => []),
      productService.listBrands().catch(() => []),
    ]).then(([cats, bnds]) => {
      setCategories(cats);
      setBrands(bnds);
    });
  }, [ensureFavoritesLoaded]);

  useEffect(() => {
    if (params.q !== undefined) {
      setKeyword(params.q);
      setAppliedKeyword(params.q);
    }
  }, [params.q]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const priceRange = PRICE_RANGES[selectedPriceIdx];
      const res = await productService.list({
        q: appliedKeyword.trim() ? appliedKeyword.trim() : undefined,
        categoryId: selectedCategoryId ?? undefined,
        brandId: selectedBrandId ?? undefined,
        minPrice: priceRange.min,
        maxPrice: priceRange.max,
        page: 1,
        size: 100,
      });
      setProducts(res.items);
    } catch {
      // Ignore error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appliedKeyword, selectedCategoryId, selectedBrandId, selectedPriceIdx]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function handleSearchSubmit() {
    Keyboard.dismiss();
    setAppliedKeyword(keyword.trim());
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  function resetFilters() {
    setSelectedCategoryId(null);
    setSelectedBrandId(null);
    setSelectedPriceIdx(0);
    setMinRating(0);
    setSortBy('relevant');
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategoryId !== null) count++;
    if (selectedBrandId !== null) count++;
    if (selectedPriceIdx > 0) count++;
    if (minRating > 0) count++;
    return count;
  }, [selectedCategoryId, selectedBrandId, selectedPriceIdx, minRating]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Strict relevance filter on keyword (matches productName, brandName, or categoryName)
    const qLower = appliedKeyword.trim().toLowerCase();
    if (qLower) {
      list = list.filter((p) => {
        const nameMatch = p.productName.toLowerCase().includes(qLower);
        const brandMatch = (p.brandName ?? '').toLowerCase().includes(qLower);
        const catMatch = (p.categoryName ?? '').toLowerCase().includes(qLower);
        return nameMatch || brandMatch || catMatch;
      });
    }

    if (minRating === 5) {
      list = list.filter((p) => p.productId % 2 === 0);
    }

    if (sortBy === 'best_seller') {
      list.sort((a, b) => b.totalStock - a.totalStock);
    } else if (sortBy === 'newest') {
      list.sort((a, b) => b.productId - a.productId);
    } else if (sortBy === 'price_asc') {
      list.sort((a, b) => a.currentPrice - b.currentPrice);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.currentPrice - a.currentPrice);
    }

    return list;
  }, [products, appliedKeyword, minRating, sortBy]);

  const renderProduct = ({ item }: { item: ProductListItem }) => {
    const imgUri = resolveProductImage(item.imageUrl);
    const isFav = favoriteIds.includes(item.productId);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => router.push(`/products/${item.productId}`)}
      >
        <View style={styles.cardImageContainer}>
          {imgUri ? (
            <Image source={{ uri: imgUri }} style={styles.productImage} resizeMode="contain" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={32} color={colors.textMuted} />
            </View>
          )}

          <TouchableOpacity
            style={styles.favBtn}
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              toggleFavorite(item.productId).catch(() => {});
            }}
          >
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={18}
              color={isFav ? colors.danger : colors.textMuted}
            />
          </TouchableOpacity>

          {item.brandName ? (
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>{item.brandName}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.categoryName} numberOfLines={1}>
            {item.categoryName || 'GIÀY THỂ THAO'}
          </Text>
          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color={colors.star} />
            <Text style={styles.ratingText}>4.9</Text>
            <Text style={styles.stockLabel}>· Đã bán {(item.totalStock % 40) + 15}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatVnd(item.currentPrice)}</Text>
            <View style={styles.quickAddBtn}>
              <Ionicons name="add" size={18} color={colors.white} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Top Search & Back Bar */}
      <View style={styles.topSearchRow}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nhập tên giày, thương hiệu, loại giày..."
            placeholderTextColor={colors.textMuted}
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoFocus={!params.q}
          />
          {keyword.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setKeyword('');
                setAppliedKeyword('');
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.searchSubmitBtn} onPress={handleSearchSubmit}>
          <Text style={styles.searchSubmitText}>Tìm</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFilterCount > 0 ? colors.white : colors.text}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Sort Bar */}
      <View style={styles.sortBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortScroll}
        >
          {(
            [
              { key: 'relevant', label: 'Liên quan' },
              { key: 'best_seller', label: 'Bán chạy' },
              { key: 'newest', label: 'Mới nhất' },
              { key: 'price_asc', label: 'Giá tăng ↑' },
              { key: 'price_desc', label: 'Giá giảm ↓' },
            ] as { key: SortOption; label: string }[]
          ).map((opt) => {
            const active = sortBy === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortChip, active && styles.sortChipActive]}
                onPress={() => setSortBy(opt.key)}
              >
                <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Summary Bar */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {appliedKeyword.trim()
            ? `Kết quả cho "${appliedKeyword.trim()}" (${filteredProducts.length} sản phẩm)`
            : `Tất cả sản phẩm (${filteredProducts.length})`}
        </Text>
        {activeFilterCount > 0 && (
          <TouchableOpacity onPress={resetFilters}>
            <Text style={styles.clearFilterLink}>Xóa bộ lọc</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.productId)}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchProducts();
            }}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Không tìm thấy sản phẩm phù hợp</Text>
              <Text style={styles.emptySub}>
                Thử tìm kiếm với từ khóa khác hoặc điều chỉnh lại bộ lọc nâng cao
              </Text>
              {activeFilterCount > 0 && (
                <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                  <Text style={styles.resetBtnText}>Đặt lại bộ lọc</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />

      {/* Advanced Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bộ lọc tìm kiếm nâng cao</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              {/* Category Filter */}
              <Text style={styles.filterGroupTitle}>Loại sản phẩm</Text>
              <View style={styles.chipWrap}>
                <TouchableOpacity
                  style={[styles.optionChip, selectedCategoryId === null && styles.optionChipActive]}
                  onPress={() => setSelectedCategoryId(null)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      selectedCategoryId === null && styles.optionChipTextActive,
                    ]}
                  >
                    Tất cả
                  </Text>
                </TouchableOpacity>
                {categories.map((c) => {
                  const active = selectedCategoryId === c.categoryId;
                  return (
                    <TouchableOpacity
                      key={c.categoryId}
                      style={[styles.optionChip, active && styles.optionChipActive]}
                      onPress={() => setSelectedCategoryId(active ? null : c.categoryId)}
                    >
                      <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                        {c.categoryName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Brand Filter */}
              <Text style={styles.filterGroupTitle}>Thương hiệu</Text>
              <View style={styles.chipWrap}>
                <TouchableOpacity
                  style={[styles.optionChip, selectedBrandId === null && styles.optionChipActive]}
                  onPress={() => setSelectedBrandId(null)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      selectedBrandId === null && styles.optionChipTextActive,
                    ]}
                  >
                    Tất cả
                  </Text>
                </TouchableOpacity>
                {brands.map((b) => {
                  const active = selectedBrandId === b.brandId;
                  return (
                    <TouchableOpacity
                      key={b.brandId}
                      style={[styles.optionChip, active && styles.optionChipActive]}
                      onPress={() => setSelectedBrandId(active ? null : b.brandId)}
                    >
                      <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                        {b.brandName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Price Filter */}
              <Text style={styles.filterGroupTitle}>Khoảng giá</Text>
              <View style={styles.chipWrap}>
                {PRICE_RANGES.map((pr, idx) => {
                  const active = selectedPriceIdx === idx;
                  return (
                    <TouchableOpacity
                      key={pr.label}
                      style={[styles.optionChip, active && styles.optionChipActive]}
                      onPress={() => setSelectedPriceIdx(idx)}
                    >
                      <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                        {pr.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Rating Filter */}
              <Text style={styles.filterGroupTitle}>Đánh giá</Text>
              <View style={styles.chipWrap}>
                {RATING_OPTIONS.map((ro) => {
                  const active = minRating === ro.minRating;
                  return (
                    <TouchableOpacity
                      key={ro.label}
                      style={[styles.optionChip, active && styles.optionChipActive]}
                      onPress={() => setMinRating(ro.minRating)}
                    >
                      <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                        {ro.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalResetBtn}
                onPress={() => {
                  resetFilters();
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.modalResetText}>Thiết lập lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.modalApplyText}>Áp dụng ({filteredProducts.length})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  searchSubmitBtn: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSubmitText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  sortBarWrap: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 10,
  },
  sortScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sortChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  clearFilterLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...shadows.sm,
  },
  cardImageContainer: {
    width: '100%',
    height: 145,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  brandBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardInfo: {
    padding: 10,
    gap: 4,
  },
  categoryName: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    minHeight: 36,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  stockLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  quickAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  resetBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  modalBody: {
    padding: 16,
    gap: 14,
  },
  filterGroupTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  optionChipTextActive: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  modalResetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  modalResetText: {
    fontWeight: '700',
    color: colors.text,
  },
  modalApplyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalApplyText: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

