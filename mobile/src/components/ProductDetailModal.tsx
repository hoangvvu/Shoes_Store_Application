import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { API_URL } from '@/config/env';
import { productService } from '@/services/product.service';
import { useCartStore } from '@/store/useCartStore';
import { colors, radius } from '@/theme';
import type { ProductDetail, ProductVariant } from '@/types/product';
import { getErrorMessage } from '@/utils/error';
import { formatVnd } from '@/utils/format';

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
  const addToCart = useCartStore((s) => s.add);

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!visible || !productId) {
      setProduct(null);
      setSelectedSize(null);
      setSelectedColor(null);
      setQuantity(1);
      return;
    }

    let isMounted = true;
    setLoading(true);

    productService
      .getDetail(productId)
      .then((data) => {
        if (!isMounted) return;
        setProduct(data);
        if (data.variants && data.variants.length > 0) {
          // Pre-select first available variant
          const firstInStock = data.variants.find((v) => v.stockQuantity > 0) || data.variants[0];
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

  async function handleAddToCart() {
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Chi tiết sản phẩm
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading || !product ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
              {/* Product Image */}
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderEmoji}>👟</Text>
                </View>
              )}

              {/* Badges */}
              <View style={styles.badgeRow}>
                {product.categoryName && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{product.categoryName}</Text>
                  </View>
                )}
                {product.brandName && (
                  <View style={[styles.badge, styles.brandBadge]}>
                    <Text style={[styles.badgeText, styles.brandBadgeText]}>{product.brandName}</Text>
                  </View>
                )}
              </View>

              {/* Title & Price */}
              <Text style={styles.productName}>{product.productName}</Text>

              <View style={styles.priceRow}>
                {product.finalPrice && product.finalPrice < product.currentPrice ? (
                  <>
                    <Text style={styles.finalPrice}>{formatVnd(product.finalPrice)}</Text>
                    <Text style={styles.strikePrice}>{formatVnd(product.currentPrice)}</Text>
                  </>
                ) : (
                  <Text style={styles.finalPrice}>{formatVnd(product.currentPrice)}</Text>
                )}
                <Text style={styles.unitText}>/ {product.unit}</Text>
              </View>

              {/* Description */}
              {product.description ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Mô tả sản phẩm</Text>
                  <Text style={styles.description}>{product.description}</Text>
                </View>
              ) : null}

              {/* Size Selector */}
              {sizes.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Chọn kích cỡ (Size)</Text>
                  <View style={styles.chipRow}>
                    {sizes.map((s) => {
                      const active = selectedSize === s;
                      return (
                        <TouchableOpacity
                          key={s}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => setSelectedSize(s)}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            Size {s}
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
                  <Text style={styles.sectionTitle}>Chọn màu sắc</Text>
                  <View style={styles.chipRow}>
                    {colorsList.map((c) => {
                      const active = selectedColor === c.name;
                      return (
                        <TouchableOpacity
                          key={c.name}
                          style={[styles.colorChip, active && styles.chipActive]}
                          onPress={() => setSelectedColor(c.name)}
                        >
                          {c.hex && (
                            <View style={[styles.colorDot, { backgroundColor: c.hex }]} />
                          )}
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Stock info for selected variant */}
              {currentVariant && (
                <View style={styles.variantInfo}>
                  <Text style={styles.variantSku}>Mã SKU: {currentVariant.sku}</Text>
                  <Text style={maxStock > 0 ? styles.stockIn : styles.stockOut}>
                    {maxStock > 0 ? `Tồn kho: ${maxStock} đôi` : 'Tạm hết hàng phiên bản này'}
                  </Text>
                </View>
              )}

              {/* Quantity Stepper */}
              {!isOutOfStock && (
                <View style={styles.qtyRow}>
                  <Text style={styles.sectionTitle}>Số lượng</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                    >
                      <Text style={styles.stepBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyVal}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                      disabled={quantity >= maxStock}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Add to Cart button */}
              <TouchableOpacity
                style={[styles.addBtn, isOutOfStock && styles.addBtnDisabled]}
                onPress={handleAddToCart}
                disabled={isOutOfStock || adding}
              >
                {adding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.addBtnText}>
                    {isOutOfStock ? 'Hết hàng' : `Thêm vào giỏ hàng · ${formatVnd((product.finalPrice || product.currentPrice) * quantity)}`}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '700',
  },
  center: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: 20,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
  },
  imagePlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#e6fffa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },
  brandBadge: {
    backgroundColor: '#f1f5f9',
  },
  brandBadgeText: {
    color: '#475569',
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  finalPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  strikePrice: {
    fontSize: 15,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  unitText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: '#e6fffa',
  },
  chipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  variantInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginBottom: 16,
  },
  variantSku: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  stockIn: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
  },
  stockOut: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  qtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '600',
  },
  qtyVal: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
