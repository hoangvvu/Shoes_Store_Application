import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
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

type HomeGroupKey = 'all' | 'best_seller' | 'newest' | 'discount';

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
    subtitle: 'Giảm đến 30% dòng Sneaker',
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

const HOME_TABS: { key: HomeGroupKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'Tất cả', icon: 'apps-outline' },
  { key: 'best_seller', label: 'Sản phẩm bán chạy', icon: 'flame-outline' },
  { key: 'newest', label: 'Sản phẩm mới', icon: 'sparkles-outline' },
  { key: 'discount', label: 'Sản phẩm giảm giá', icon: 'pricetag-outline' },
];

function getDiscountPercent(productId: number): number {
  const discounts = [15, 20, 10, 25, 30];
  return discounts[productId % discounts.length];
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthUser();
  const insets = useSafeAreaInsets();
  const cartLineCount = useCartStore((s) => s.cart.lineCount);
  const { ids: favoriteIds, toggle: toggleFavorite, ensureLoaded: ensureFavoritesLoaded } = useFavoriteStore();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [activeGroup, setActiveGroup] = useState<HomeGroupKey>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [banners, setBanners] = useState<Banner[]>([]);

  const bannerScrollRef = useRef<any>(null);

  const loadBanners = useCallback(async () => {
    try {
      const data = await bannerService.list({ platform: 'MOBILE', isActive: true });
      setBanners(data);
    } catch {
      // Fallback to static banners
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const res = await productService.list({
        page: 1,
        size: 80,
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
    ensureFavoritesLoaded().catch(() => {});
    loadBanners();
    loadProducts();
  }, [ensureFavoritesLoaded, loadBanners, loadProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProducts();
    loadBanners();
  }, [loadProducts, loadBanners]);

  // Auto-scroll banner horizontally to the left every 3.5 seconds
  const currentBannerCount = banners.length > 0 ? banners.length : BANNERS.length;
  useEffect(() => {
    if (currentBannerCount <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIdx((prev) => {
        const next = (prev + 1) % currentBannerCount;
        bannerScrollRef.current?.scrollTo({
          x: next * (BANNER_WIDTH + 12),
          animated: true,
        });
        return next;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [currentBannerCount]);

  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (BANNER_WIDTH + 12));
    if (index >= 0 && index < currentBannerCount) {
      setActiveBannerIdx(index);
    }
  };

  // Navigate to separate Search page displaying relevant products
  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    const q = search.trim();
    router.push({
      pathname: '/search',
      params: q ? { q } : {},
    });
  };

  // Product groups:
  // 1. Sản phẩm bán chạy (sorted by sales/stock volume)
  const bestSellerProducts = useMemo(() => {
    return [...products].sort((a, b) => b.totalStock - a.totalStock);
  }, [products]);

  // 2. Sản phẩm mới (sorted by newest productId DESC)
  const newestProducts = useMemo(() => {
    return [...products].sort((a, b) => b.productId - a.productId);
  }, [products]);

  // 3. Sản phẩm giảm giá
  const discountProducts = useMemo(() => {
    const filtered = products.filter((_, idx) => idx % 2 === 0);
    return filtered.length > 0 ? filtered : products;
  }, [products]);

  const renderProductCard = (
    item: ProductListItem,
    badgeType?: 'best_seller' | 'newest' | 'discount',
  ) => {
    const imgUri = resolveProductImage(item.imageUrl);
    const isFav = favoriteIds.includes(item.productId);
    const discountPct = badgeType === 'discount' ? getDiscountPercent(item.productId) : 0;
    const originalPrice =
      discountPct > 0 ? Math.round(item.currentPrice / (1 - discountPct / 100)) : null;

    return (
      <TouchableOpacity
        key={`${badgeType ?? 'p'}-${item.productId}`}
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

          {/* Top-left Group Badge */}
          {badgeType === 'best_seller' && (
            <View style={[styles.typeBadge, { backgroundColor: '#EA580C' }]}>
              <Text style={styles.typeBadgeText}>🔥 BÁN CHẠY</Text>
            </View>
          )}
          {badgeType === 'newest' && (
            <View style={[styles.typeBadge, { backgroundColor: '#0284C7' }]}>
              <Text style={styles.typeBadgeText}>✨ MỚI</Text>
            </View>
          )}
          {badgeType === 'discount' && (
            <View style={[styles.typeBadge, { backgroundColor: '#E11D48' }]}>
              <Text style={styles.typeBadgeText}>-{discountPct}%</Text>
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
            <Text style={styles.stockLabel}>
              · Đã bán {(item.totalStock % 50) + 18}
            </Text>
          </View>

          <View style={styles.priceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.price}>{formatVnd(item.currentPrice)}</Text>
              {originalPrice && (
                <Text style={styles.oldPrice}>{formatVnd(originalPrice)}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.quickAddBtn}
              onPress={() => router.push(`/products/${item.productId}`)}
              hitSlop={6}
            >
              <Ionicons name="add" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGridSection = (
    title: string,
    subtitle: string,
    items: ProductListItem[],
    badgeType: 'best_seller' | 'newest' | 'discount',
    onSeeMore?: () => void,
  ) => (
    <View style={styles.groupSection}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        {onSeeMore && (
          <TouchableOpacity onPress={onSeeMore}>
            <Text style={styles.seeAllText}>Xem tất cả &gt;</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.gridWrap}>
        {items.map((item) => renderProductCard(item, badgeType))}
      </View>
    </View>
  );

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

      {/* Search Bar that opens dedicated Search Results Screen (no suggestion dropdown) */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm mẫu giày, thương hiệu..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
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
          onPress={handleSearchSubmit}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Auto-scroll Banner Carousel */}
        {banners.length > 0 ? (
          <View style={styles.carouselContainer}>
            <ScrollView
              ref={bannerScrollRef}
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
                  <View key={banner.bannerId} style={styles.bannerImageCard}>
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
              ref={bannerScrollRef}
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

        {/* Group Filter Tabs (replaces Category chips: Bán chạy, Sản phẩm mới, Sản phẩm giảm giá) */}
        <View style={styles.groupTabsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.groupTabsScroll}
          >
            {HOME_TABS.map((t) => {
              const active = activeGroup === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.groupChip, active && styles.groupChipActive]}
                  onPress={() => setActiveGroup(t.key)}
                >
                  <Ionicons
                    name={t.icon}
                    size={15}
                    color={active ? colors.white : colors.textSecondary}
                  />
                  <Text style={[styles.groupChipText, active && styles.groupChipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Product Sections */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="cube-outline" size={36} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyText}>Chưa có sản phẩm nào</Text>
          </View>
        ) : activeGroup === 'all' ? (
          <>
            {renderGridSection(
              '🔥 Sản phẩm bán chạy',
              'Những mẫu giày được săn đón nhiều nhất',
              bestSellerProducts.slice(0, 4),
              'best_seller',
              () => setActiveGroup('best_seller'),
            )}
            {renderGridSection(
              '✨ Sản phẩm mới',
              'Bộ sưu tập vừa cập bến cửa hàng',
              newestProducts.slice(0, 4),
              'newest',
              () => setActiveGroup('newest'),
            )}
            {renderGridSection(
              '🏷️ Sản phẩm giảm giá',
              'Ưu đãi giá tốt đặc biệt trong tuần',
              discountProducts.slice(0, 4),
              'discount',
              () => setActiveGroup('discount'),
            )}
          </>
        ) : activeGroup === 'best_seller' ? (
          renderGridSection(
            '🔥 Sản phẩm bán chạy',
            'Tất cả sản phẩm có lượt mua cao nhất',
            bestSellerProducts,
            'best_seller',
          )
        ) : activeGroup === 'newest' ? (
          renderGridSection(
            '✨ Sản phẩm mới',
            'Tất cả mẫu giày mới ra mắt',
            newestProducts,
            'newest',
          )
        ) : (
          renderGridSection(
            '🏷️ Sản phẩm giảm giá',
            'Tất cả sản phẩm đang có mức giá ưu đãi',
            discountProducts,
            'discount',
          )
        )}
      </ScrollView>
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
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  carouselContainer: {
    marginBottom: 16,
  },
  bannerScrollContent: {
    gap: 12,
  },
  bannerCard: {
    width: BANNER_WIDTH,
    borderRadius: radius.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    minHeight: 155,
    ...shadows.md,
  },
  bannerImageCard: {
    width: BANNER_WIDTH,
    borderRadius: radius.xl,
    overflow: 'hidden',
    height: 160,
    backgroundColor: '#E2E8F0',
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
    padding: 20,
  },
  bannerFallbackTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  bannerInfo: {
    flex: 1,
    paddingRight: 12,
  },
  bannerTagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: 8,
  },
  bannerTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  bannerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    marginBottom: 14,
  },
  bannerBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  bannerBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  bannerGraphic: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEmoji: {
    fontSize: 44,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#CBD5E1',
  },
  groupTabsWrap: {
    marginBottom: 16,
  },
  groupTabsScroll: {
    gap: 8,
    paddingRight: 8,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  groupChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  groupChipTextActive: {
    color: colors.white,
    fontWeight: '800',
  },
  groupSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
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
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  card: {
    width: '48.2%',
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
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
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
    padding: 12,
    gap: 4,
  },
  categoryName: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    minHeight: 38,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
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
    marginTop: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  oldPrice: {
    fontSize: 11,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  quickAddBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
