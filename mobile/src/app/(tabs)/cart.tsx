import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cartService } from '@/services/cart.service';
import { useCartStore } from '@/store/useCartStore';
import { colors, radius, shadows } from '@/theme';
import type { CartItem } from '@/types/cart';
import { getErrorMessage } from '@/utils/error';
import { formatVnd } from '@/utils/format';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cart, loading, refresh, setQuantity, remove, clear } = useCartStore();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  // Sync cart with backend every time user opens this tab
  useFocusEffect(
    useCallback(() => {
      refresh().catch((e) => Alert.alert('Lỗi', getErrorMessage(e)));
    }, [refresh]),
  );

  async function changeQty(item: CartItem, next: number) {
    if (next < 1) return confirmRemove(item);
    setBusyId(item.variantId);
    try {
      const warning = await setQuantity(item.variantId, next);
      if (warning) Alert.alert('Lưu ý', `${warning}. Sản phẩm vẫn được giữ trong giỏ.`);
    } catch (e) {
      Alert.alert('Lỗi', getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  function confirmRemove(item: CartItem) {
    Alert.alert('Xóa sản phẩm', `Bạn có chắc muốn xóa "${item.productName}" khỏi giỏ hàng?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => remove(item.variantId).catch((e) => Alert.alert('Lỗi', getErrorMessage(e))),
      },
    ]);
  }

  function confirmClear() {
    Alert.alert('Xóa giỏ hàng', 'Bạn có chắc chắn muốn xóa toàn bộ sản phẩm trong giỏ?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa hết',
        style: 'destructive',
        onPress: () => clear().catch((e) => Alert.alert('Lỗi', getErrorMessage(e))),
      },
    ]);
  }

  async function checkout() {
    setChecking(true);
    try {
      const result = await cartService.validate(false);
      if (result.valid) {
        return router.push('/checkout');
      }
      const text = result.issues.map((i) => `• ${i.productName}: ${i.message}`).join('\n');
      const hasUnavailable = result.issues.some((i) => i.availability === 'UNAVAILABLE');
      Alert.alert('Giỏ hàng cần cập nhật', text, [
        { text: 'Đóng', style: 'cancel' },
        ...(hasUnavailable
          ? [
              {
                text: 'Xóa sản phẩm ngừng bán',
                onPress: async () => {
                  await cartService.validate(true);
                  await refresh();
                },
              },
            ]
          : []),
      ]);
    } catch (e) {
      Alert.alert('Lỗi', getErrorMessage(e));
    } finally {
      setChecking(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Giỏ hàng</Text>
          <Text style={styles.subtitle}>
            {cart.lineCount > 0 ? `${cart.lineCount} mẫu giày đã chọn` : 'Chưa có sản phẩm'}
          </Text>
        </View>

        {cart.lineCount > 0 && (
          <TouchableOpacity onPress={confirmClear} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.clearText}>Xóa hết</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cart Items List */}
      <FlatList
        data={cart.items}
        keyExtractor={(i) => String(i.variantId)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading && cart.items.length > 0} onRefresh={() => refresh()} />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="bag-handle-outline" size={48} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Giỏ hàng của bạn đang trống</Text>
              <Text style={styles.emptySub}>
                Hãy tìm kiếm và chọn những đôi giày ưng ý nhất để bắt đầu mua sắm ngay hôm nay!
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => router.push('/(tabs)/catalog')}
              >
                <Text style={styles.exploreBtnText}>Khám phá bộ sưu tập</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => {
          const bad = item.availability !== 'OK';
          const disabled = busyId === item.variantId;

          return (
            <View style={[styles.card, bad && styles.cardBad]}>
              {/* Product Thumbnail */}
              <View style={styles.imgWrapper}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.img} resizeMode="contain" />
                ) : (
                  <View style={styles.imgPlaceholder}>
                    <Text style={{ fontSize: 28 }}>👟</Text>
                  </View>
                )}
              </View>

              {/* Product Info */}
              <View style={styles.info}>
                <View style={styles.infoTopRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <TouchableOpacity
                    onPress={() => confirmRemove(item)}
                    hitSlop={8}
                    style={styles.deleteIconBtn}
                  >
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Variant Chips */}
                <View style={styles.variantChip}>
                  <Text style={styles.variantText}>
                    Size {item.sizeLabel} · {item.colorName}
                  </Text>
                </View>

                {!!item.message && <Text style={styles.warn}>{item.message}</Text>}

                {/* Price and Stepper Row */}
                <View style={styles.bottomRow}>
                  <Text style={styles.price}>{formatVnd(item.unitPrice)}</Text>

                  <View style={styles.stepper}>
                    <TouchableOpacity
                      disabled={disabled}
                      onPress={() => changeQty(item, item.quantity - 1)}
                      style={styles.stepBtn}
                    >
                      <Ionicons name="remove" size={16} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.qty}>{item.quantity}</Text>
                    <TouchableOpacity
                      disabled={disabled || item.quantity >= 99}
                      onPress={() => changeQty(item, item.quantity + 1)}
                      style={styles.stepBtn}
                    >
                      <Ionicons name="add" size={16} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Fixed Bottom Checkout Card */}
      {cart.lineCount > 0 && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Subtotal summary */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tạm tính ({cart.lineCount} sản phẩm)</Text>
              <Text style={styles.summaryVal}>{formatVnd(cart.subtotal)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phí vận chuyển ước tính</Text>
              <Text style={styles.freeShipText}>Miễn phí</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalValue}>{formatVnd(cart.subtotal)}</Text>
            </View>
          </View>

          {/* Checkout CTA Button */}
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={checkout}
            disabled={checking}
            activeOpacity={0.85}
          >
            {checking ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <View style={styles.checkoutBtnInner}>
                <Text style={styles.checkoutBtnText}>Tiến hành thanh toán</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.white} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#FEF2F2',
  },
  clearText: { color: colors.danger, fontWeight: '700', fontSize: 12 },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
    ...shadows.sm,
  },
  cardBad: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  imgWrapper: {
    width: 90,
    height: 90,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  img: {
    width: '100%',
    height: '100%',
  },
  imgPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  infoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 6,
  },
  deleteIconBtn: {
    padding: 2,
  },
  variantChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginVertical: 4,
  },
  variantText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  warn: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '600',
    marginVertical: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: radius.pill,
    paddingHorizontal: 4,
  },
  stepBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: {
    minWidth: 26,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 13,
    color: colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  exploreBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.pill,
    ...shadows.sm,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    ...shadows.lg,
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: 12,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  freeShipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  checkoutBtn: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  checkoutBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
