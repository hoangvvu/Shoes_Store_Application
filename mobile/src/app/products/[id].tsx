import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveProductImage } from '@/components/ProductDetailModal';
import { StarRating } from '@/components/StarRating';
import { productService } from '@/services/product.service';
import { reviewService } from '@/services/review.service';
import { useCartStore } from '@/store/useCartStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { colors, radius, shadows } from '@/theme';
import type { ProductDetail, ProductVariant } from '@/types/product';
import type { ProductReviews } from '@/types/review';
import { formatDateTime } from '@/utils/datetime';
import { getErrorMessage } from '@/utils/error';
import { formatVnd } from '@/utils/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 320;

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const insets = useSafeAreaInsets();

  const addToCart = useCartStore((s) => s.add);
  const cartLineCount = useCartStore((s) => s.cart.lineCount);
  const { ids: favoriteIds, toggle: toggleFavorite, ensureLoaded: ensureFavoritesLoaded } = useFavoriteStore();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [reviewsData, setReviewsData] = useState<ProductReviews | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const imageScrollRef = useRef<any>(null);
  const isFavorite = productId ? favoriteIds.includes(productId) : false;

  useEffect(() => {
    ensureFavoritesLoaded().catch(() => {});
  }, [ensureFavoritesLoaded]);

  const loadData = useCallback(async () => {
    if (!productId || isNaN(productId)) return;
    setLoading(true);
    try {
      const [detail, revs] = await Promise.all([
        productService.getDetail(productId),
        reviewService.listForProduct(productId, { page: 1, size: 5 }).catch(() => null),
      ]);
      setProduct(detail);
      setReviewsData(revs);
      if (detail.variants && detail.variants.length > 0) {
        const firstInStock = detail.variants.find((v) => v.stockQuantity > 0) || detail.variants[0];
        setSelectedSize(firstInStock.sizeLabel);
        setSelectedColor(firstInStock.colorName);
      }
    } catch (err) {
      Alert.alert('Lỗi tải sản phẩm', getErrorMessage(err));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [productId, router]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // Extract all images (supports multiple images uploaded via admin comma-separated)
  const imageUris = useMemo<string[]>(() => {
    if (!product?.imageUrl) return [];
    return product.imageUrl
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((u) => resolveProductImage(u))
      .filter((u): u is string => !!u);
  }, [product?.imageUrl]);

  // Extract unique sizes and colors
  const { sizes, colorsList } = useMemo(() => {
    if (!product?.variants) return { sizes: [], colorsList: [] };
    const sMap = new Map<string, string>();
    const cMap = new Map<string, { name: string; hex: string | null }>();

    for (const v of product.variants) {
      sMap.set(v.sizeLabel, v.sizeLabel);
      if (!cMap.has(v.colorName)) {
        cMap.set(v.colorName, { name: v.colorName, hex: v.hexCode });
      }
    }

    return {
      sizes: Array.from(sMap.keys()),
      colorsList: Array.from(cMap.values()),
    };
  }, [product]);

  // Find currently selected variant
  const currentVariant = useMemo<ProductVariant | null>(() => {
    if (!product?.variants || !selectedSize || !selectedColor) return null;
    return (
      product.variants.find(
        (v) => v.sizeLabel === selectedSize && v.colorName === selectedColor,
      ) ?? null
    );
  }, [product, selectedSize, selectedColor]);

  const maxStock = currentVariant ? currentVariant.stockQuantity : 0;
  const isOutOfStock = !currentVariant || maxStock <= 0;

  async function handleAddToCart(isBuyNow = false) {
    if (!currentVariant) {
      Alert.alert('Thông báo', 'Vui lòng chọn kích cỡ và màu sắc.');
      return;
    }
    if (isOutOfStock) {
      Alert.alert('Hết hàng', 'Phiên bản này hiện đã hết hàng trong kho.');
      return;
    }

    setAdding(true);
    try {
      const warning = await addToCart(currentVariant.variantId, quantity);
      if (isBuyNow) {
        router.push('/checkout');
        return;
      }
      Alert.alert(
        'Thành công',
        warning ? `Đã thêm vào giỏ hàng. ${warning}` : 'Đã thêm sản phẩm vào giỏ hàng!',
        [
          { text: 'Tiếp tục xem', style: 'cancel' },
          {
            text: 'Đến giỏ hàng',
            onPress: () => router.push('/(tabs)/cart'),
          },
        ],
      );
    } catch (err) {
      Alert.alert('Không thể thêm vào giỏ', getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  function handleShare() {
    if (!product) return;
    Share.share({
      title: product.productName,
      message: `Khám phá ngay "${product.productName}" trên ShoeStore với giá ưu đãi ${formatVnd(
        product.currentPrice,
      )}!`,
    }).catch(() => {});
  }

  const onImageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index >= 0 && index < imageUris.length) {
      setActiveImageIdx(index);
    }
  };

  const scrollToImage = (index: number) => {
    setActiveImageIdx(index);
    imageScrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  if (loading || !product) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Đang tải chi tiết sản phẩm...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Floating Top Navigation Bar */}
      <View style={[styles.navBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.navCircleBtn}
          onPress={() => router.back()}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.navTitle} numberOfLines={1}>
          {product.brandName || 'Chi tiết giày'}
        </Text>

        <View style={styles.navActionsRight}>
          <TouchableOpacity
            style={styles.navCircleBtn}
            onPress={handleShare}
            hitSlop={8}
            activeOpacity={0.7}
          >
            <Ionicons name="share-social-outline" size={20} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navCircleBtn}
            hitSlop={8}
            activeOpacity={0.7}
            onPress={() => {
              if (productId) toggleFavorite(productId).catch(() => {});
            }}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? colors.danger : colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navCircleBtn}
            hitSlop={8}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/cart')}
          >
            <Ionicons name="bag-handle-outline" size={20} color={colors.text} />
            {cartLineCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartLineCount > 99 ? '99+' : cartLineCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
      >
        {/* Multi-Image Gallery Carousel */}
        <View style={styles.galleryContainer}>
          {imageUris.length > 0 ? (
            <>
              <ScrollView
                ref={imageScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onImageScroll}
                style={styles.imageSlider}
              >
                {imageUris.map((uri, idx) => (
                  <View key={idx} style={styles.slideImageWrapper}>
                    <Image source={{ uri }} style={styles.slideImage} resizeMode="contain" />
                  </View>
                ))}
              </ScrollView>

              {/* Pagination Dots */}
              {imageUris.length > 1 && (
                <View style={styles.dotsWrapper}>
                  {imageUris.map((_, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => scrollToImage(idx)}
                      style={[styles.dot, activeImageIdx === idx && styles.dotActive]}
                    />
                  ))}
                </View>
              )}

              {/* Image Counter Badge */}
              {imageUris.length > 1 && (
                <View style={styles.imageCounterBadge}>
                  <Text style={styles.imageCounterText}>
                    {activeImageIdx + 1} / {imageUris.length}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={{ fontSize: 90 }}>👟</Text>
              <Text style={styles.placeholderText}>Chưa có ảnh mô tả</Text>
            </View>
          )}

          {/* Stock Status Badge */}
          <View style={styles.stockStatusBadge}>
            <View
              style={[
                styles.stockStatusDot,
                { backgroundColor: maxStock > 0 ? colors.success : colors.danger },
              ]}
            />
            <Text style={styles.stockStatusText}>
              {maxStock > 0 ? `Còn ${maxStock} đôi trong kho` : 'Tạm hết hàng'}
            </Text>
          </View>
        </View>

        {/* Thumbnail Selector Strip (if > 1 image) */}
        {imageUris.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailStrip}
          >
            {imageUris.map((uri, idx) => {
              const isActive = activeImageIdx === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => scrollToImage(idx)}
                  style={[styles.thumbBox, isActive && styles.thumbBoxActive]}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Product Details Section */}
        <View style={styles.detailsCard}>
          {/* Brand & Category badges */}
          <View style={styles.tagRow}>
            {product.brandName && (
              <View style={styles.brandBadge}>
                <Ionicons name="pricetag-outline" size={13} color={colors.primary} />
                <Text style={styles.brandBadgeText}>{product.brandName}</Text>
              </View>
            )}
            {product.categoryName && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{product.categoryName}</Text>
              </View>
            )}
          </View>

          {/* Product Name */}
          <Text style={styles.productName}>{product.productName}</Text>

          {/* Price & Rating Row */}
          <View style={styles.priceRow}>
            <View style={styles.priceContainer}>
              <Text style={styles.mainPrice}>{formatVnd(product.currentPrice)}</Text>
              {product.finalPrice && product.finalPrice < product.currentPrice && (
                <Text style={styles.strikePrice}>{formatVnd(product.currentPrice)}</Text>
              )}
            </View>

            <View style={styles.ratingBox}>
              <Ionicons name="star" size={16} color={colors.star} />
              <Text style={styles.ratingVal}>
                {reviewsData?.summary?.avgRating ? reviewsData.summary.avgRating.toFixed(1) : '4.9'}
              </Text>
              <Text style={styles.ratingTotalText}>
                ({reviewsData?.summary?.total || 28} đánh giá)
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Size Selector */}
          {sizes.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Chọn kích cỡ (Size)</Text>
                <Text style={styles.sizeGuideText}>Bảng size chuẩn</Text>
              </View>
              <View style={styles.chipsWrap}>
                {sizes.map((s) => {
                  const active = selectedSize === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.sizeChip, active && styles.sizeChipActive]}
                      onPress={() => setSelectedSize(s)}
                    >
                      <Text style={[styles.sizeChipText, active && styles.sizeChipTextActive]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Color Selector */}
          {colorsList.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Chọn màu sắc: <Text style={styles.colorSelectedName}>{selectedColor}</Text>
              </Text>
              <View style={styles.colorSwatchesWrap}>
                {colorsList.map((c) => {
                  const active = selectedColor === c.name;
                  return (
                    <TouchableOpacity
                      key={c.name}
                      style={[styles.colorSwatchRing, active && styles.colorSwatchRingActive]}
                      onPress={() => setSelectedColor(c.name)}
                    >
                      <View
                        style={[
                          styles.colorSwatchInner,
                          { backgroundColor: c.hex || '#64748B' },
                        ]}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Quantity Stepper */}
          {!isOutOfStock && (
            <View style={styles.qtySection}>
              <Text style={styles.sectionTitle}>Số lượng mua</Text>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Ionicons
                    name="remove"
                    size={18}
                    color={quantity <= 1 ? colors.textMuted : colors.text}
                  />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                  disabled={quantity >= maxStock}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={quantity >= maxStock ? colors.textMuted : colors.text}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Description Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mô tả chi tiết sản phẩm</Text>
            <Text style={styles.descText} numberOfLines={descExpanded ? undefined : 4}>
              {product.description ||
                'Chưa có mô tả chi tiết cho sản phẩm này. Giày được thiết kế theo phong cách hiện đại, đệm êm ái, bám đường tốt, phù hợp cho vận động hàng ngày và thể thao.'}
            </Text>
            {product.description && product.description.length > 120 && (
              <TouchableOpacity
                onPress={() => setDescExpanded(!descExpanded)}
                style={styles.toggleDescBtn}
              >
                <Text style={styles.toggleDescText}>
                  {descExpanded ? 'Thu gọn' : 'Xem toàn bộ mô tả'}
                </Text>
                <Ionicons
                  name={descExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          {/* Reviews & Ratings Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Đánh giá & Bình luận</Text>
                <Text style={styles.sectionSubtitle}>
                  {reviewsData?.summary?.total
                    ? `${reviewsData.summary.total} nhận xét từ khách hàng đã mua`
                    : 'Chưa có nhận xét nào'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.writeReviewBtn}
                onPress={() =>
                  router.push({
                    pathname: '/reviews/write',
                    params: { productId: String(product.productId), name: product.productName },
                  })
                }
              >
                <Ionicons name="create-outline" size={14} color={colors.primary} />
                <Text style={styles.writeReviewText}>Viết đánh giá</Text>
              </TouchableOpacity>
            </View>

            {/* Scorecard Box */}
            <View style={styles.reviewScoreCard}>
              <View style={styles.scoreLeft}>
                <Text style={styles.scoreNumber}>
                  {reviewsData?.summary?.avgRating
                    ? reviewsData.summary.avgRating.toFixed(1)
                    : '5.0'}
                </Text>
                <StarRating
                  value={
                    reviewsData?.summary?.avgRating
                      ? Math.round(reviewsData.summary.avgRating)
                      : 5
                  }
                  size={16}
                />
                <Text style={styles.scoreSub}>
                  {reviewsData?.summary?.total || 0} lượt đánh giá
                </Text>
              </View>

              <View style={styles.scoreRight}>
                <Text style={styles.scoreTrustTitle}>Chất lượng đảm bảo</Text>
                <Text style={styles.scoreTrustSub}>
                  100% đánh giá từ khách hàng đã đặt hàng và trải nghiệm thực tế tại ShoeStore.
                </Text>
              </View>
            </View>

            {/* Comments List */}
            {reviewsData && reviewsData.items && reviewsData.items.length > 0 ? (
              <View style={styles.reviewsListWrap}>
                {reviewsData.items.slice(0, 3).map((rev) => (
                  <View key={rev.reviewId} style={styles.reviewItemCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewerAvatar}>
                        <Text style={styles.reviewerAvatarText}>
                          {rev.customerName?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewerName}>{rev.customerName}</Text>
                        <View style={styles.reviewStarDateRow}>
                          <View style={styles.reviewStarsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons
                                key={star}
                                name="star"
                                size={12}
                                color={star <= rev.rating ? colors.star : '#E5E7EB'}
                              />
                            ))}
                          </View>
                          {rev.createdAt && (
                            <Text style={styles.reviewDate}>
                              {formatDateTime(rev.createdAt).split(' ')[0]}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                    <Text style={styles.reviewComment}>{rev.comment}</Text>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.viewAllReviewsBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/reviews/[productId]',
                      params: {
                        productId: String(product.productId),
                        name: product.productName,
                      },
                    })
                  }
                >
                  <Text style={styles.viewAllReviewsText}>
                    Xem tất cả ({reviewsData.summary?.total || reviewsData.items.length}) đánh giá
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noReviewsBox}>
                <Ionicons name="chatbubbles-outline" size={32} color={colors.border} />
                <Text style={styles.noReviewsText}>
                  Hãy là người đầu tiên chia sẻ cảm nhận về đôi giày này!
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Add to cart button */}
        <TouchableOpacity
          style={[styles.addToCartBtn, isOutOfStock && styles.btnDisabled]}
          onPress={() => handleAddToCart(false)}
          disabled={isOutOfStock || adding}
          activeOpacity={0.8}
        >
          <Ionicons name="bag-handle-outline" size={20} color={colors.primary} />
          <Text style={styles.addToCartBtnText}>Thêm vào giỏ</Text>
        </TouchableOpacity>

        {/* Buy Now button */}
        <TouchableOpacity
          style={[styles.buyNowBtn, isOutOfStock && styles.btnDisabled]}
          onPress={() => handleAddToCart(true)}
          disabled={isOutOfStock || adding}
          activeOpacity={0.88}
        >
          {adding ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <View style={styles.buyNowContent}>
              <Ionicons name="flash" size={18} color={colors.white} />
              <Text style={styles.buyNowBtnText}>
                {isOutOfStock ? 'Hết hàng' : 'Mua ngay'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    zIndex: 10,
  },
  navCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  navActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  scrollContent: {
    paddingTop: 0,
  },
  galleryContainer: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: '#F8FAFC',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageSlider: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  slideImageWrapper: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  dotsWrapper: {
    position: 'absolute',
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    width: 16,
    backgroundColor: colors.primary,
  },
  imageCounterBadge: {
    position: 'absolute',
    top: 14,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stockStatusBadge: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    ...shadows.sm,
  },
  stockStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  thumbnailStrip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  thumbBox: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  thumbBoxActive: {
    borderColor: colors.primary,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  detailsCard: {
    padding: 20,
    gap: 16,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  brandBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  productName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 30,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  mainPrice: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  strikePrice: {
    fontSize: 15,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  ratingVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  ratingTotalText: {
    fontSize: 12,
    color: '#B45309',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  section: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sizeGuideText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sizeChip: {
    minWidth: 48,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  sizeChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#EEF2FF',
  },
  sizeChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  sizeChipTextActive: {
    color: colors.primary,
  },
  colorSelectedName: {
    fontWeight: '700',
    color: colors.primary,
  },
  colorSwatchesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorSwatchRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchRingActive: {
    borderColor: colors.primary,
  },
  colorSwatchInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  qtySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 3,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    minWidth: 36,
    textAlign: 'center',
  },
  descText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  toggleDescBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  toggleDescText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  writeReviewText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  reviewScoreCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scoreLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingRight: 16,
    gap: 4,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
  },
  scoreSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  scoreRight: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  scoreTrustTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  scoreTrustSub: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  reviewsListWrap: {
    gap: 12,
    marginTop: 6,
  },
  reviewItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.sm,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  reviewStarDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  reviewComment: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  viewAllReviewsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    marginTop: 4,
  },
  viewAllReviewsText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  noReviewsBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noReviewsText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    ...shadows.md,
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
  addToCartBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  buyNowBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  buyNowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buyNowBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
  btnDisabled: {
    opacity: 0.5,
    backgroundColor: '#94A3B8',
    borderColor: '#94A3B8',
  },
});
