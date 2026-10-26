import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import { useAuthUser } from '@/hooks/useAuth';
import { bannerService } from '@/services/banner.service';
import { productService } from '@/services/product.service';
import { useCartStore } from '@/store/useCartStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { colors, radius, shadows } from '@/theme';
import type { Banner } from '@/types/banner';
import type { ProductListItem } from '@/types/product';
import { formatVnd } from '@/utils/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;

interface CategoryItem {
  categoryId: number;
  categoryName: string;
}

interface BannerItem {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  ctaText: string;
  bgColor: string;
  shoeEmoji: string;
}

const BANNERS: BannerItem[] = [
  {
    id: '1',
    tag: 'NEW ARRIVALS',
    title: 'Mẫu Giày Mới 2026',
    subtitle: 'Đậm chất thể thao & cá tính',
    ctaText: 'Khám phá ngay',
    bgColor: colors.primary,
    shoeEmoji: '👟',
  },
  {
    id: '2',
    tag: 'HOT PROMO',
    title: 'Ưu Đãi Siêu Cấp',
    subtitle: 'Giảm đến 40% dòng Sneaker',
    ctaText: 'Xem ưu đãi',
    bgColor: '#1E293B',
    shoeEmoji: '⚡',
  },
  {
    id: '3',
    tag: 'RUNNING SERIES',
    title: 'Êm Ái Mọi Cung Đường',
    subtitle: 'Bộ sưu tập chạy bộ cao cấp',
    ctaText: 'Mua ngay',
    bgColor: '#0F766E',
    shoeEmoji: '🏃',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthUser();
  const insets = useSafeAreaInsets();
  const cartLineCount = useCartStore((s) => s.cart.lineCount);
  const { ids: favoriteIds, toggle: toggleFavorite, ensureLoaded: ensureFavoritesLoaded } = useFavoriteStore();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [brands, setBrands] = useState<{ brandId: number; brandName: string }[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [banners, setBanners] = useState<Banner[]>([]);

  const loadBanners = useCallback(async () => {
    try {
      const data = await bannerService.list({ platform: 'MOBILE', isActive: true });
      setBanners(data);
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    ensureFavoritesLoaded().catch(() => {});
    loadBanners();
    Promise.all([
      productService.listCategories().catch(() => []),
      productService.listBrands().catch(() => []),
    ]).then(([cats, bnds]) => {
      setCategories(cats);
      setBrands(bnds);
    });
  }, [ensureFavoritesLoaded, loadBanners]);

  const loadProducts = useCallback(async (q?: string, catId?: number | null, brandId?: number | null) => {
    try {
      const res = await productService.list({
        q: q ? q.trim() : undefined,
        categoryId: catId ?? undefined,
        brandId: brandId ?? undefined,
        page: 1,
        size: 40,
      });
      setProducts(res.items);
    } catch {
      // Ignore network errors
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts(search, selectedCatId, selectedBrandId);
  }, [loadProducts, search, selectedCatId, selectedBrandId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProducts(search, selectedCatId, selectedBrandId);
    loadBanners();
  }, [loadProducts, search, selectedCatId, selectedBrandId, loadBanners]);

  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / BANNER_WIDTH);
    setActiveBannerIdx(index);
  };

  const renderProduct = ({ item }: { item: ProductListItem }) => {
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
            <Image source={{ uri: imgUri }} style={styles.productImage} resizeMode="contain" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>👟</Text>
            </View>
          )}

          {/* Favorite heart button */}
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
            {item.categoryName || 'SNEAKER'}
          </Text>

          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color={colors.star} />
            <Text style={styles.ratingText}>4.9</Text>
            <Text style={styles.stockLabel}>· Còn {item.totalStock}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatVnd(item.currentPrice)}</Text>
            <TouchableOpacity
              style={styles.quickAddBtn}
              onPress={() => setSelectedProductId(item.productId)}
              hitSlop={6}
            >
              <Ionicons name="add" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const displayName = user?.fullName || 'bạn';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Fixed Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.greetingBox}>
          <Text style={styles.greetingSubtitle}>Xin chào,</Text>
          <Text style={styles.greetingName} numberOfLines={1}>
            {displayName} 👋
          </Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => router.push('/(tabs)/cart')}
          >
            <Ionicons name="bag-handle-outline" size={22} color={colors.text} />
            {cartLineCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartLineCount > 99 ? '99+' : cartLineCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="person" size={20} color={colors.primary} />
            <View style={styles.onlineBadge} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
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

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => router.push('/(tabs)/catalog')}
        >
          <Ionicons name="options-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Main Content List */}
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.productId)}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            {/* Banner Carousel */}
            {banners.length > 0 ? (
              <View style={styles.carouselContainer}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={onBannerScroll}
                  scrollEventThrottle={16}
                  contentContainerStyle={styles.bannerScrollContent}
                >
                  {banners.map((banner) => {
                    const imgUri = resolveProductImage(banner.imageUrl);
                    return (
                      <View
                        key={banner.bannerId}
                        style={styles.bannerImageCard}
                      >
                        {imgUri ? (
                          <Image
                            source={{ uri: imgUri }}
                            style={styles.bannerImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.bannerFallback}>
                            <Text style={styles.bannerFallbackTitle}>{banner.title}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Dots Pagination */}
                {banners.length > 1 && (
                  <View style={styles.dotsRow}>
                    {banners.map((_, idx) => (
                      <View
                        key={`b-dot-${idx}`}
                        style={[
                          styles.dot,
                          activeBannerIdx === idx ? styles.dotActive : styles.dotInactive,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.carouselContainer}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={onBannerScroll}
                  scrollEventThrottle={16}
                  contentContainerStyle={styles.bannerScrollContent}
                >
                  {BANNERS.map((banner) => (
                    <View
                      key={banner.id}
                      style={[styles.bannerCard, { backgroundColor: banner.bgColor }]}
                    >
                      <View style={styles.bannerInfo}>
                        <View style={styles.bannerTagBadge}>
                          <Text style={styles.bannerTagText}>{banner.tag}</Text>
                        </View>
                        <Text style={styles.bannerTitle}>{banner.title}</Text>
                        <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                        <TouchableOpacity
                          style={styles.bannerBtn}
                          onPress={() => router.push('/(tabs)/catalog')}
                        >
                          <Text style={styles.bannerBtnText}>{banner.ctaText}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.bannerGraphic}>
                        <Text style={styles.bannerEmoji}>{banner.shoeEmoji}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {/* Dots Pagination */}
                <View style={styles.dotsRow}>
                  {BANNERS.map((_, idx) => (
                    <View
                      key={`dot-${idx}`}
                      style={[
                        styles.dot,
                        activeBannerIdx === idx ? styles.dotActive : styles.dotInactive,
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Horizontal Categories & Brands Scroll */}
            <View style={styles.catWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.catChip,
                    selectedCatId === null && selectedBrandId === null && styles.catChipActive,
                  ]}
                  onPress={() => {
                    setSelectedCatId(null);
                    setSelectedBrandId(null);
                  }}
                >
                  <Text
                    style={[
                      styles.catText,
                      selectedCatId === null && selectedBrandId === null && styles.catTextActive,
                    ]}
                  >
                    Tất cả
                  </Text>
                </TouchableOpacity>

                {brands.map((b) => {
                  const active = selectedBrandId === b.brandId;
                  return (
                    <TouchableOpacity
                      key={`b-${b.brandId}`}
                      style={[styles.catChip, active && styles.catChipActive]}
                      onPress={() => {
                        setSelectedCatId(null);
                        setSelectedBrandId(active ? null : b.brandId);
                      }}
                    >
                      <Text style={[styles.catText, active && styles.catTextActive]}>
                        {b.brandName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {categories.map((c) => {
                  const active = selectedCatId === c.categoryId;
                  return (
                    <TouchableOpacity
                      key={`c-${c.categoryId}`}
                      style={[styles.catChip, active && styles.catChipActive]}
                      onPress={() => {
                        setSelectedBrandId(null);
                        setSelectedCatId(active ? null : c.categoryId);
                      }}
                    >
                      <Text style={[styles.catText, active && styles.catTextActive]}>
                        {c.categoryName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Section Header: Trending / Nổi bật */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Sản phẩm nổi bật</Text>
                <Text style={styles.sectionSubtitle}>Xu hướng được chọn nhiều nhất</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/catalog')}>
                <Text style={styles.seeAllText}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="search" size={36} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyText}>Không tìm thấy sản phẩm nào</Text>
            </View>
          )
        }
      />

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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  greetingBox: {
    flex: 1,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.primary,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  cartBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    color: colors.text,
    fontSize: 14,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  carouselContainer: {
    marginBottom: 16,
  },
  bannerScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  bannerCard: {
    width: BANNER_WIDTH,
    height: 155,
    borderRadius: radius.xl,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...shadows.md,
  },
  bannerImageCard: {
    width: BANNER_WIDTH,
    height: 165,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    ...shadows.md,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerFallback: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  bannerFallbackTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  bannerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bannerTagBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  bannerTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 10,
  },
  bannerBtn: {
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  bannerBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  bannerGraphic: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEmoji: {
    fontSize: 60,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#E5E7EB',
  },
  catWrap: {
    marginBottom: 16,
  },
  catScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: '#F3F4F6',
  },
  catChipActive: {
    backgroundColor: colors.primary,
  },
  catText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  catTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  listContent: {
    paddingBottom: 28,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 36,
  },
  favBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
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
  categoryName: {
    fontSize: 10,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 2,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
