import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProductDetailModal, resolveProductImage } from '@/components/ProductDetailModal';
import {
  type BrandItem,
  type ColorItem,
  productService,
  type SizeItem,
} from '@/services/product.service';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { colors, radius, shadows } from '@/theme';
import type { ProductListItem } from '@/types/product';
import { formatVnd } from '@/utils/format';

interface CategoryItem {
  categoryId: number;
  categoryName: string;
}

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

const PRICE_RANGES = [
  { label: 'Tất cả giá', min: undefined, max: undefined },
  { label: 'Dưới 1 triệu', min: 0, max: 1000000 },
  { label: '1 - 2 triệu', min: 1000000, max: 2000000 },
  { label: '2 - 3 triệu', min: 2000000, max: 3000000 },
  { label: 'Trên 3 triệu', min: 3000000, max: undefined },
];

export default function CatalogScreen() {
  const insets = useSafeAreaInsets();
  const { ids: favoriteIds, toggle: toggleFavorite, ensureLoaded: ensureFavoritesLoaded } = useFavoriteStore();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [sizes, setSizes] = useState<SizeItem[]>([]);
  const [colorItems, setColorItems] = useState<ColorItem[]>([]);

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedPriceIdx, setSelectedPriceIdx] = useState<number>(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    ensureFavoritesLoaded().catch(() => {});
    Promise.all([
      productService.listCategories().catch(() => []),
      productService.listBrands().catch(() => []),
      productService.listSizes().catch(() => []),
      productService.listColors().catch(() => []),
    ]).then(([cats, bnds, szs, cols]) => {
      setCategories(cats);
      setBrands(bnds);
      setSizes(szs);
      setColorItems(cols);
    });
  }, [ensureFavoritesLoaded]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCatId !== null) count++;
    if (selectedBrandId !== null) count++;
    if (selectedPriceIdx > 0) count++;
    if (selectedSize !== null) count++;
    if (selectedColor !== null) count++;
    return count;
  }, [selectedCatId, selectedBrandId, selectedPriceIdx, selectedSize, selectedColor]);

  const loadProducts = useCallback(async () => {
    try {
      const priceRange = PRICE_RANGES[selectedPriceIdx];
      const res = await productService.list({
        q: search.trim() ? search.trim() : undefined,
        categoryId: selectedCatId ?? undefined,
        brandId: selectedBrandId ?? undefined,
        minPrice: priceRange.min,
        maxPrice: priceRange.max,
        page: 1,
        size: 60,
      });
      setProducts(res.items);
    } catch {
      // Ignore network errors on pull
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedCatId, selectedBrandId, selectedPriceIdx]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProducts();
  }, [loadProducts]);

  // Client-side sort & additional filter by size/color if applicable
  const displayedProducts = useMemo(() => {
    let list = [...products];

    // Client-side sorting
    if (sortBy === 'price_asc') {
      list.sort((a, b) => a.currentPrice - b.currentPrice);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.currentPrice - a.currentPrice);
    } else if (sortBy === 'name_asc') {
      list.sort((a, b) => a.productName.localeCompare(b.productName));
    }
    return list;
  }, [products, sortBy]);

  function resetAllFilters() {
    setSelectedCatId(null);
    setSelectedBrandId(null);
    setSelectedPriceIdx(0);
    setSelectedSize(null);
    setSelectedColor(null);
    setSearch('');
  }

  const renderProductItem = ({ item }: { item: ProductListItem }) => {
    const imgUri = resolveProductImage(item.imageUrl);
    const isFav = favoriteIds.includes(item.productId);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => setSelectedProductId(item.productId)}
      >
        <View style={styles.cardImageContainer}>
          {imgUri ? (
            <Image source={{ uri: imgUri }} style={styles.cardImage} resizeMode="contain" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={{ fontSize: 36 }}>👟</Text>
            </View>
          )}

          {/* Favorite button */}
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

          {/* Brand badge */}
          {item.brandName ? (
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>{item.brandName}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardCategory} numberOfLines={1}>
            {item.categoryName || 'SNEAKER'}
          </Text>

          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.productName}
          </Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color={colors.star} />
            <Text style={styles.ratingText}>4.9</Text>
            <Text style={styles.soldText}>· Còn {item.totalStock}</Text>
          </View>

          <View style={styles.bottomCardRow}>
            <Text style={styles.cardPrice}>{formatVnd(item.currentPrice)}</Text>
            <TouchableOpacity
              style={styles.quickAddBtn}
              onPress={() => setSelectedProductId(item.productId)}
            >
              <Ionicons name="add" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Top Header & Search Bar */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm mẫu giày, thương hiệu..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Trigger Button */}
        <TouchableOpacity
          style={[styles.filterTrigger, activeFilterCount > 0 && styles.filterTriggerActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons
            name="options-outline"
            size={22}
            color={activeFilterCount > 0 ? colors.white : colors.text}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Brand & Category Quick Chips */}
      <View style={styles.quickChipsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsScroll}>
          <TouchableOpacity
            style={[styles.chip, selectedBrandId === null && selectedCatId === null && styles.chipActive]}
            onPress={() => {
              setSelectedBrandId(null);
              setSelectedCatId(null);
            }}
          >
            <Text style={[styles.chipText, selectedBrandId === null && selectedCatId === null && styles.chipTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>

          {brands.map((b) => {
            const active = selectedBrandId === b.brandId;
            return (
              <TouchableOpacity
                key={`b-${b.brandId}`}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => {
                  setSelectedBrandId(active ? null : b.brandId);
                }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{b.brandName}</Text>
              </TouchableOpacity>
            );
          })}

          {categories.map((c) => {
            const active = selectedCatId === c.categoryId;
            return (
              <TouchableOpacity
                key={`c-${c.categoryId}`}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => {
                  setSelectedCatId(active ? null : c.categoryId);
                }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.categoryName}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sort Bar */}
      <View style={styles.sortBar}>
        <Text style={styles.resultCount}>
          {displayedProducts.length} sản phẩm
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
          {([
            ['newest', 'Mới nhất'],
            ['price_asc', 'Giá thấp ↑'],
            ['price_desc', 'Giá cao ↓'],
            ['name_asc', 'Tên A-Z'],
          ] as [SortOption, string][]).map(([key, label]) => {
            const active = sortBy === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.sortBtn, active && styles.sortBtnActive]}
                onPress={() => setSortBy(key)}
              >
                <Text style={[styles.sortBtnText, active && styles.sortBtnTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Product List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={displayedProducts}
          keyExtractor={(item) => String(item.productId)}
          renderItem={renderProductItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="search-outline" size={40} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Không tìm thấy sản phẩm phù hợp</Text>
              <Text style={styles.emptySubtitle}>
                Hãy thử thay đổi từ khóa hoặc điều chỉnh lại bộ lọc giá và thương hiệu.
              </Text>
              {activeFilterCount > 0 && (
                <TouchableOpacity style={styles.resetBtn} onPress={resetAllFilters}>
                  <Text style={styles.resetBtnText}>Xóa tất cả bộ lọc</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Filter Bottom Sheet Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bộ lọc sản phẩm</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              {/* Khoảng giá */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Khoảng giá</Text>
                <View style={styles.filterChipsRow}>
                  {PRICE_RANGES.map((pr, idx) => {
                    const active = selectedPriceIdx === idx;
                    return (
                      <TouchableOpacity
                        key={pr.label}
                        style={[styles.filterChip, active && styles.filterChipActive]}
                        onPress={() => setSelectedPriceIdx(idx)}
                      >
                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                          {pr.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Thương hiệu */}
              {brands.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Thương hiệu</Text>
                  <View style={styles.filterChipsRow}>
                    {brands.map((b) => {
                      const active = selectedBrandId === b.brandId;
                      return (
                        <TouchableOpacity
                          key={b.brandId}
                          style={[styles.filterChip, active && styles.filterChipActive]}
                          onPress={() => setSelectedBrandId(active ? null : b.brandId)}
                        >
                          <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                            {b.brandName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Danh mục */}
              {categories.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Danh mục giày</Text>
                  <View style={styles.filterChipsRow}>
                    {categories.map((c) => {
                      const active = selectedCatId === c.categoryId;
                      return (
                        <TouchableOpacity
                          key={c.categoryId}
                          style={[styles.filterChip, active && styles.filterChipActive]}
                          onPress={() => setSelectedCatId(active ? null : c.categoryId)}
                        >
                          <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                            {c.categoryName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Kích cỡ */}
              {sizes.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Kích cỡ (Size)</Text>
                  <View style={styles.filterChipsRow}>
                    {sizes.map((s) => {
                      const active = selectedSize === s.sizeLabel;
                      return (
                        <TouchableOpacity
                          key={s.sizeId}
                          style={[styles.sizeSquare, active && styles.sizeSquareActive]}
                          onPress={() => setSelectedSize(active ? null : s.sizeLabel)}
                        >
                          <Text style={[styles.sizeSquareText, active && styles.sizeSquareTextActive]}>
                            {s.sizeLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Màu sắc */}
              {colorItems.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Màu sắc</Text>
                  <View style={styles.colorPillsWrap}>
                    {colorItems.map((col) => {
                      const active = selectedColor === col.colorName;
                      return (
                        <TouchableOpacity
                          key={col.colorId}
                          style={[styles.colorPill, active && styles.colorPillActive]}
                          onPress={() => setSelectedColor(active ? null : col.colorName)}
                        >
                          {col.hexCode ? (
                            <View style={[styles.colorCircle, { backgroundColor: col.hexCode }]} />
                          ) : null}
                          <Text style={[styles.colorPillText, active && styles.colorPillTextActive]}>
                            {col.colorName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Bottom Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalResetBtn} onPress={resetAllFilters}>
                <Text style={styles.modalResetText}>Thiết lập lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.modalApplyText}>Áp dụng ({displayedProducts.length})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Product Detail Modal */}
      <ProductDetailModal
        productId={selectedProductId}
        visible={!!selectedProductId}
        onClose={() => setSelectedProductId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    height: '100%',
  },
  filterTrigger: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTriggerActive: {
    backgroundColor: colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  quickChipsWrapper: {
    marginBottom: 10,
  },
  quickChipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: '#F3F4F6',
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginRight: 10,
  },
  sortScroll: {
    gap: 6,
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sortBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  sortBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sortBtnTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  card: {
    width: '48.3%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...shadows.sm,
  },
  cardImageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 10,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  brandBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  brandBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  cardContent: {
    padding: 10,
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 18,
    minHeight: 36,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  soldText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  bottomCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  resetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  resetBtnText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },

  // Filter Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalBody: {
    padding: 20,
    gap: 20,
  },
  filterSection: {
    gap: 10,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  sizeSquare: {
    minWidth: 44,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeSquareActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sizeSquareText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  sizeSquareTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  colorPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  colorPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  colorCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  colorPillText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  colorPillTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFF',
  },
  modalResetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.pill,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalResetText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalApplyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApplyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});
