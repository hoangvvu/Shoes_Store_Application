import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '@/config/env';
import { productService } from '@/services/product.service';
import { reviewService } from '@/services/review.service';
import { useCartStore } from '@/store/useCartStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { colors, radius, shadows } from '@/theme';
import type { ProductDetail, ProductVariant } from '@/types/product';
import type { ProductReviews } from '@/types/review';
import { getErrorMessage } from '@/utils/error';
import { formatVnd } from '@/utils/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  productId: number | null;
  visible: boolean;
  onClose: () => void;
}

export function resolveProductImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = API_URL.replace(/\/api\/v1\/?$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function ProductDetailModal({ productId, visible, onClose }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addToCart = useCartStore((s) => s.add);
  const { ids: favoriteIds, toggle: toggleFavorite } = useFavoriteStore();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [reviewsData, setReviewsData] = useState<ProductReviews | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const isFavorite = productId ? favoriteIds.includes(productId) : false;

  useEffect(() => {
    if (!visible || !productId) {
      setProduct(null);
      setReviewsData(null);
      setSelectedSize(null);
      setSelectedColor(null);
      setQuantity(1);
      setDescExpanded(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    Promise.all([
      productService.getDetail(productId),
      reviewService.listForProduct(productId, { page: 1, size: 3 }).catch(() => null),
    ])
      .then(([detail, revs]) => {
        if (!isMounted) return;
        setProduct(detail);
        setReviewsData(revs);
        if (detail.variants && detail.variants.length > 0) {
          const firstInStock = detail.variants.find((v) => v.stockQuantity > 0) || detail.variants[0];
          setSelectedSize(firstInStock.sizeLabel);
          setSelectedColor(firstInStock.colorName);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        Alert.alert('Lỗi tải sản phẩm', getErrorMessage(err));
        onClose();
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible, productId, onClose]);

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
        onClose();
        router.push('/checkout');
        return;
      }
      Alert.alert(
        'Thành công',
        warning ? `Đã thêm vào giỏ hàng. ${warning}` : 'Đã thêm sản phẩm vào giỏ hàng!',
        [
          { text: 'Tiếp tục xem', style: 'cancel', onPress: onClose },
          {
            text: 'Đến giỏ hàng',
            onPress: () => {
              onClose();
              router.push('/(tabs)/cart');
            },
          },
        ],
      );
    } catch (err) {
      Alert.alert('Không thể thêm vào giỏ', getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  const imageUri = resolveProductImage(product?.imageUrl);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalContent}>
          {/* Top Bar Floating Over Header */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.circleBtn} onPress={onClose} hitSlop={12}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>

            <Text style={styles.headerTitle} numberOfLines={1}>
              {product?.brandName || 'Chi tiết giày'}
            </Text>

            <TouchableOpacity
              style={styles.circleBtn}
              hitSlop={12}
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
          </View>

          {loading || !product ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
              >
                {/* Product Hero Image Container */}
                <View style={styles.heroContainer}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.heroPlaceholder}>
                      <Text style={{ fontSize: 80 }}>👟</Text>
                    </View>
                  )}

                  {/* Stock pill */}
                  <View style={styles.stockBadge}>
                    <View
                      style={[
                        styles.stockDot,
                        { backgroundColor: maxStock > 0 ? colors.success : colors.danger },
                      ]}
                    />
                    <Text style={styles.stockBadgeText}>
                      {maxStock > 0 ? `Còn ${maxStock} đôi trong kho` : 'Tạm hết hàng'}
                    </Text>
                  </View>
                </View>

                {/* Main Product Info */}
                <View style={styles.detailsContainer}>
                  <View style={styles.tagRow}>
                    <Text style={styles.brandTag}>{product.brandName || 'SNEAKER'}</Text>
                    {product.categoryName && (
                      <Text style={styles.categoryTag}>{product.categoryName}</Text>
                    )}
                  </View>

                  <View style={styles.namePriceRow}>
                    <Text style={styles.productName}>{product.productName}</Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.mainPrice}>{formatVnd(product.currentPrice)}</Text>
                      {product.finalPrice && product.finalPrice < product.currentPrice && (
                        <Text style={styles.strikePrice}>{formatVnd(product.currentPrice)}</Text>
                      )}
                    </View>
                  </View>

                  {/* Rating & Reviews row */}
                  <View style={styles.reviewRow}>
                    <View style={styles.starsBox}>
                      <Ionicons name="star" size={16} color={colors.star} />
                      <Text style={styles.starsVal}>
                        {reviewsData?.summary?.avgRating ? reviewsData.summary.avgRating.toFixed(1) : '4.9'}
                      </Text>
                    </View>
                    <Text style={styles.reviewsCount}>
                      ({reviewsData?.summary?.total || 28} đánh giá)
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        router.push(`/reviews/${product.productId}`);
                      }}
                    >
                      <Text style={styles.viewReviewsLink}>Xem tất cả</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Size Selector */}
                  {sizes.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Chọn kích cỡ (Size)</Text>
                        <Text style={styles.sizeGuideText}>Bảng size chuẩn</Text>
                      </View>
                      <View style={styles.sizeChipsWrap}>
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
                      <Text style={styles.sectionTitle}>Số lượng</Text>
                      <View style={styles.stepperContainer}>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                        >
                          <Ionicons name="remove" size={18} color={quantity <= 1 ? colors.textMuted : colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{quantity}</Text>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                          disabled={quantity >= maxStock}
                        >
                          <Ionicons name="add" size={18} color={quantity >= maxStock ? colors.textMuted : colors.text} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Description */}
                  {product.description ? (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Mô tả sản phẩm</Text>
                      <Text
                        style={styles.descText}
                        numberOfLines={descExpanded ? undefined : 3}
                      >
                        {product.description}
                      </Text>
                      {product.description.length > 120 && (
                        <TouchableOpacity
                          onPress={() => setDescExpanded(!descExpanded)}
                          style={{ marginTop: 4 }}
                        >
                          <Text style={styles.toggleDesc}>
                            {descExpanded ? 'Thu gọn' : 'Xem thêm'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : null}

                  {/* Customer Reviews Section Preview */}
                  {reviewsData && reviewsData.items && reviewsData.items.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Đánh giá từ khách hàng</Text>
                        <TouchableOpacity
                          onPress={() => {
                            onClose();
                            router.push(`/reviews/${product.productId}`);
                          }}
                        >
                          <Text style={styles.viewReviewsLink}>
                            Xem tất cả ({reviewsData.summary?.total || reviewsData.items.length})
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {reviewsData.items.slice(0, 2).map((rev) => (
                        <View key={rev.reviewId} style={styles.reviewItemCard}>
                          <View style={styles.reviewHeader}>
                            <View style={styles.reviewerAvatar}>
                              <Text style={styles.reviewerAvatarText}>
                                {rev.customerName?.charAt(0).toUpperCase() || 'U'}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.reviewerName}>{rev.customerName}</Text>
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
                            </View>
                          </View>
                          <Text style={styles.reviewComment}>{rev.comment}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Sticky Bottom Actions Bar */}
              <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                {/* Add to cart icon button */}
                <TouchableOpacity
                  style={[styles.addToCartBtn, isOutOfStock && styles.btnDisabled]}
                  onPress={() => handleAddToCart(false)}
                  disabled={isOutOfStock || adding}
                >
                  <Ionicons name="bag-handle-outline" size={22} color={colors.primary} />
                  <Text style={styles.addToCartBtnText}>Thêm vào giỏ</Text>
                </TouchableOpacity>

                {/* Buy Now button */}
                <TouchableOpacity
                  style={[styles.buyNowBtn, isOutOfStock && styles.btnDisabled]}
                  onPress={() => handleAddToCart(true)}
                  disabled={isOutOfStock || adding}
                >
                  {adding ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.buyNowBtnText}>
                      {isOutOfStock ? 'Hết hàng' : 'Mua ngay'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    height: '92%',
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 10,
  },
  heroContainer: {
    width: '100%',
    height: 260,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 20,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBadge: {
    position: 'absolute',
    bottom: 12,
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
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  detailsContainer: {
    padding: 20,
    gap: 18,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTag: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  categoryTag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  namePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  productName: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 28,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  mainPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  strikePrice: {
    fontSize: 14,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  starsVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  reviewsCount: {
    fontSize: 13,
    color: colors.textMuted,
  },
  viewReviewsLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 6,
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
  sizeGuideText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  sizeChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sizeChip: {
    minWidth: 48,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sizeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sizeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  colorSelectedName: {
    fontWeight: '600',
    color: colors.primaryDark,
  },
  colorSwatchesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorSwatchRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchRingActive: {
    borderColor: colors.primary,
  },
  colorSwatchInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  qtySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: 4,
  },
  stepBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  descText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  toggleDesc: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  reviewItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: 12,
    gap: 6,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  reviewComment: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 12,
    ...shadows.lg,
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  addToCartBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  buyNowBtn: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  buyNowBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    backgroundColor: '#CBD5E1',
    borderColor: '#CBD5E1',
  },
});
