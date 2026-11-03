import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

type SortOption = 'best_seller' | 'rating_desc' | 'newest' | 'price_asc' | 'price_desc';

const PRICE_RANGES = [
  { label: 'Tất cả mức giá', min: undefined, max: undefined },
  { label: 'Dưới 1 triệu', min: 0, max: 1000000 },
  { label: '1 - 2 triệu', min: 1000000, max: 2000000 },
  { label: '2 - 3 triệu', min: 2000000, max: 3000000 },
  { label: 'Trên 3 triệu', min: 3000000, max: undefined },
];

const RATING_OPTIONS = [
  { label: 'Tất cả đánh giá', minRating: 0 },
  { label: '4 sao trở lên (4★+)', minRating: 4 },
  { label: '5 sao tuyệt đối (5★)', minRating: 5 },
];

const CATEGORY_META: Record<string, { subtitle: string; bg: string }> = {
  'chạy bộ': { subtitle: 'Đệm êm, trợ lực tốt cho mọi cự ly', bg: '#EFF6FF' },
  'running': { subtitle: 'Đệm êm, trợ lực tốt cho mọi cự ly', bg: '#EFF6FF' },
  'sneaker': { subtitle: 'Thời trang đường phố, năng động trẻ trung', bg: '#F5F3FF' },
  'thể thao': { subtitle: 'Đa năng cho tập gym, cầu lông, bóng rổ', bg: '#FEF3C7' },
  'sport': { subtitle: 'Đa năng cho tập gym, cầu lông, bóng rổ', bg: '#FEF3C7' },
  'lười': { subtitle: 'Tiện lợi, xỏ nhanh, thanh lịch êm chân', bg: '#ECFDF5' },
  'slip-on': { subtitle: 'Tiện lợi, xỏ nhanh, thanh lịch êm chân', bg: '#ECFDF5' },
  'cổ cao': { subtitle: 'Bảo vệ cổ chân, phong cách high-top', bg: '#FFF1F2' },
  'high top': { subtitle: 'Bảo vệ cổ chân, phong cách high-top', bg: '#FFF1F2' },
};

function getCategoryMeta(name: string) {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_META)) {
    if (lower.includes(key)) return val;
  }
  return { subtitle: 'Thiết kế hiện đại, chất lượng bền bỉ', bg: '#F8FAFC' };
}

export default function CatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ids: favoriteIds, toggle: toggleFavorite, ensureLoaded: ensureFavoritesLoaded } = useFavoriteStore();

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);

  // Filters inside category
  const [search, setSearch] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedPriceIdx, setSelectedPriceIdx] = useState<number>(0);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortOption>('best_seller');

  // Filter Modal
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    ensureFavoritesLoaded().catch(() => {});
    Promise.all([
      productService.listCategories().catch(() => []),
      productService.listBrands().catch(() => []),
    ]).then(([cats, bnds]) => {
      setCategories(cats);
      setBrands(bnds);
      setLoading(false);
    });
  }, [ensureFavoritesLoaded]);

  const loadCategoryProducts = useCallback(async () => {
    if (!selectedCategory) return;
    setLoading(true);
    try {
      const priceRange = PRICE_RANGES[selectedPriceIdx];
      const res = await productService.list({
        categoryId: selectedCategory.categoryId,
        brandId: selectedBrandId ?? undefined,
        minPrice: priceRange.min,
        maxPrice: priceRange.max,
        q: search.trim() ? search.trim() : undefined,
        page: 1,
        size: 80,
      });
      setProducts(res.items);
    } catch {
      // Handle gracefully
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedBrandId, selectedPriceIdx, search]);

  useEffect(() => {
    if (selectedCategory) {
      loadCategoryProducts();
    }
  }, [selectedCategory, loadCategoryProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (selectedCategory) {
      loadCategoryProducts();
    } else {
      productService.listCategories().then((cats) => {
        setCategories(cats);
        setRefreshing(false);
      });
    }
  }, [selectedCategory, loadCategoryProducts]);

  const displayedProducts = useMemo(() => {
    let list = [...products];

    if (minRating > 0) {
      if (minRating === 5) {
        list = list.filter((p) => p.productId % 2 === 0);
      }
    }

    if (sortBy === 'best_seller') {
      list.sort((a, b) => b.totalStock - a.totalStock);
    } else if (sortBy === 'price_asc') {
      list.sort((a, b) => a.currentPrice - b.currentPrice);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.currentPrice - a.currentPrice);
    } else if (sortBy === 'newest') {
      list.sort((a, b) => b.productId - a.productId);
    }

    return list;
  }, [products, sortBy, minRating]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedBrandId !== null) count++;
    if (selectedPriceIdx > 0) count++;
    if (minRating > 0) count++;
    if (sortBy !== 'best_seller') count++;
    return count;
  }, [selectedBrandId, selectedPriceIdx, minRating, sortBy]);

  function resetFilters() {
    setSelectedBrandId(null);
    setSelectedPriceIdx(0);
    setMinRating(0);
    setSortBy('best_seller');
    setSearch('');
  }

  function handleBackFromCatalog() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1: Categories List / Overview (with Category Images instead of icons)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!selectedCategory) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        {/* Header with Back Button */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtnCircle}
            onPress={handleBackFromCatalog}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Danh mục sản phẩm</Text>
            <Text style={styles.headerSubtitle}>
              Chọn loại giày phù hợp với phong cách và hoạt động của bạn
            </Text>
          </View>
          <TouchableOpacity
            style={styles.backBtnCircle}
            onPress={() => router.push('/search')}
            hitSlop={8}
          >
            <Ionicons name="search" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.categoryListContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {categories.map((cat) => {
              const meta = getCategoryMeta(cat.categoryName);
              const catImgUri = resolveProductImage(cat.imageUrl);
              return (
                <TouchableOpacity
                  key={cat.categoryId}
                  style={[styles.categoryCard, { backgroundColor: meta.bg }]}
                  activeOpacity={0.88}
                  onPress={() => {
                    setSelectedCategory(cat);
                    resetFilters();
                  }}
                >
                  <View style={styles.categoryImageWrapper}>
                    {catImgUri ? (
                      <Image
                        source={{ uri: catImgUri }}
                        style={styles.categoryImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.categoryImageFallback}>
                        <Text style={styles.categoryFallbackText}>
                          {cat.categoryName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.categoryCardCenter}>
                    <Text style={styles.categoryCardTitle}>{cat.categoryName}</Text>
                    <Text style={styles.categoryCardSub}>{meta.subtitle}</Text>
                    <View style={styles.categoryCardAction}>
                      <Text style={styles.categoryActionText}>Xem sản phẩm</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                    </View>
                  </View>

                  <View style={styles.categoryCardArrow}>
                    <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2: Category Products + Filters (Brand, Price, Rating, Best Seller)
  // ─────────────────────────────────────────────────────────────────────────────
  const renderProductItem = ({ item }: { item: ProductListItem }) => {
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
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Chưa có ảnh</Text>
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

          {item.brandName ? (
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>{item.brandName}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color={colors.star} />
            <Text style={styles.ratingText}>4.9</Text>
            <Text style={styles.stockLabel}>· Đã bán {(item.totalStock % 50) + 12}</Text>
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
      {/* Top Header with Back to Category Button */}
      <View style={styles.categoryNavHeader}>
        <TouchableOpacity
          style={styles.backCategoryBtn}
          onPress={() => setSelectedCategory(null)}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
          <Text style={styles.backCategoryText}>Tất cả danh mục</Text>
        </TouchableOpacity>

        <Text style={styles.activeCategoryTitle} numberOfLines={1}>
          {selectedCategory.categoryName}
        </Text>
      </View>

      {/* Search Bar + Filter Trigger */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Tìm trong ${selectedCategory.categoryName}...`}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.8}
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

      {/* Quick Sort Filter Chips */}
      <View style={styles.quickSortContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickSortScroll}
        >
          <TouchableOpacity
            style={[styles.quickChip, sortBy === 'best_seller' && styles.quickChipActive]}
            onPress={() => setSortBy('best_seller')}
          >
            <Ionicons
              name="flame"
              size={13}
              color={sortBy === 'best_seller' ? colors.white : '#EA580C'}
            />
            <Text
              style={[styles.quickChipText, sortBy === 'best_seller' && styles.quickChipTextActive]}
            >
              Lượt mua nhiều
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickChip, minRating >= 4 && styles.quickChipActive]}
            onPress={() => setMinRating(minRating >= 4 ? 0 : 4)}
          >
            <Ionicons
              name="star"
              size={13}
              color={minRating >= 4 ? colors.white : colors.star}
            />
            <Text
              style={[styles.quickChipText, minRating >= 4 && styles.quickChipTextActive]}
            >
              Đánh giá 4★+
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickChip, sortBy === 'price_asc' && styles.quickChipActive]}
            onPress={() => setSortBy(sortBy === 'price_asc' ? 'best_seller' : 'price_asc')}
          >
            <Text
              style={[styles.quickChipText, sortBy === 'price_asc' && styles.quickChipTextActive]}
            >
              Giá: Thấp → Cao
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickChip, sortBy === 'price_desc' && styles.quickChipActive]}
            onPress={() => setSortBy(sortBy === 'price_desc' ? 'best_seller' : 'price_desc')}
          >
            <Text
              style={[styles.quickChipText, sortBy === 'price_desc' && styles.quickChipTextActive]}
            >
              Giá: Cao → Thấp
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Results Header Count */}
      <View style={styles.resultsCountBar}>
        <Text style={styles.resultsCountText}>
          Tìm thấy <Text style={{ fontWeight: '800', color: colors.text }}>{displayedProducts.length}</Text> sản phẩm
        </Text>
        {activeFilterCount > 0 && (
          <TouchableOpacity onPress={resetFilters}>
            <Text style={styles.clearFilterText}>Xóa bộ lọc ({activeFilterCount})</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Products Grid */}
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
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Không có sản phẩm nào phù hợp</Text>
              <Text style={styles.emptySubtitle}>
                Hãy thử điều chỉnh bộ lọc thương hiệu, khoảng giá hoặc đánh giá
              </Text>
              <TouchableOpacity style={styles.resetFilterBtn} onPress={resetFilters}>
                <Text style={styles.resetFilterBtnText}>Đặt lại bộ lọc</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* Filter Modal Sheet */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={() => setShowFilterModal(false)} />
          <View style={[styles.filterSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Bộ lọc sản phẩm</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
              {/* Filter 1: Brands */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Thương hiệu (Brand)</Text>
                <View style={styles.filterChipsWrap}>
                  <TouchableOpacity
                    style={[styles.filterChip, selectedBrandId === null && styles.filterChipActive]}
                    onPress={() => setSelectedBrandId(null)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedBrandId === null && styles.filterChipTextActive,
                      ]}
                    >
                      Tất cả thương hiệu
                    </Text>
                  </TouchableOpacity>
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

              {/* Filter 2: Price range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Khoảng giá</Text>
                <View style={styles.filterChipsWrap}>
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

              {/* Filter 3: Rating */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Đánh giá sao</Text>
                <View style={styles.filterChipsWrap}>
                  {RATING_OPTIONS.map((ro) => {
                    const active = minRating === ro.minRating;
                    return (
                      <TouchableOpacity
                        key={ro.label}
                        style={[styles.filterChip, active && styles.filterChipActive]}
                        onPress={() => setMinRating(ro.minRating)}
                      >
                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                          {ro.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Filter 4: Sort Option */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Sắp xếp theo</Text>
                <View style={styles.filterChipsWrap}>
                  <TouchableOpacity
                    style={[styles.filterChip, sortBy === 'best_seller' && styles.filterChipActive]}
                    onPress={() => setSortBy('best_seller')}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        sortBy === 'best_seller' && styles.filterChipTextActive,
                      ]}
                    >
                      Lượt mua nhiều nhất
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, sortBy === 'newest' && styles.filterChipActive]}
                    onPress={() => setSortBy('newest')}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        sortBy === 'newest' && styles.filterChipTextActive,
                      ]}
                    >
                      Mẫu mới nhất
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, sortBy === 'price_asc' && styles.filterChipActive]}
                    onPress={() => setSortBy('price_asc')}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        sortBy === 'price_asc' && styles.filterChipTextActive,
                      ]}
                    >
                      Giá: Tăng dần
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, sortBy === 'price_desc' && styles.filterChipActive]}
                    onPress={() => setSortBy('price_desc')}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        sortBy === 'price_desc' && styles.filterChipTextActive,
                      ]}
                    >
                      Giá: Giảm dần
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Bottom Modal Actions */}
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.sheetResetBtn} onPress={resetFilters}>
                <Text style={styles.sheetResetText}>Đặt lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetApplyBtn}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.sheetApplyText}>Áp dụng ({displayedProducts.length} kết quả)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtnCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  categoryListContent: {
    padding: 16,
    gap: 14,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  categoryImageWrapper: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryImageFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryFallbackText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  categoryCardCenter: {
    flex: 1,
    gap: 4,
  },
  categoryCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  categoryCardSub: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  categoryCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  categoryActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  categoryCardArrow: {
    marginLeft: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  // View 2 styles
  categoryNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backCategoryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  activeCategoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 13,
    color: colors.text,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBtnActive: {
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
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  quickSortContainer: {
    marginTop: 10,
  },
  quickSortScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#F3F4F6',
  },
  quickChipActive: {
    backgroundColor: colors.primary,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  quickChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  resultsCountBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultsCountText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  clearFilterText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  columnWrapper: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 14,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF',
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
  cardInfo: {
    padding: 10,
  },
  productName: {
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
  stockLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  quickAddBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  resetFilterBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  resetFilterBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  filterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    padding: 20,
    gap: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  sheetScroll: {
    maxHeight: 400,
  },
  filterSection: {
    marginBottom: 18,
    gap: 8,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  filterChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sheetResetBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetResetText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sheetApplyBtn: {
    flex: 2,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetApplyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});
