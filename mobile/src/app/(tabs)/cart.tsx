import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/PrimaryButton';
import { cartService } from '@/services/cart.service';
import { useCartStore } from '@/store/useCartStore';
import { colors, radius } from '@/theme';
import type { CartItem } from '@/types/cart';
import { getErrorMessage } from '@/utils/error';
import { formatVnd } from '@/utils/format';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cart, loading, refresh, setQuantity, remove, clear } = useCartStore();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  // tải lại giỏ từ server mỗi khi mở tab (giữ đồng bộ web ↔ mobile)
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
    Alert.alert('Xóa sản phẩm', `Xóa "${item.productName}" khỏi giỏ hàng?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => remove(item.variantId).catch((e) => Alert.alert('Lỗi', getErrorMessage(e))) },
    ]);
  }

  function confirmClear() {
    Alert.alert('Xóa giỏ hàng', 'Xóa toàn bộ sản phẩm trong giỏ?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa hết', style: 'destructive', onPress: () => clear().catch((e) => Alert.alert('Lỗi', getErrorMessage(e))) },
    ]);
  }

  async function checkout() {
    setChecking(true);
    try {
      const result = await cartService.validate(false);
      if (result.valid) {
        return router.push('/checkout'); // giỏ hợp lệ: sang màn hình đặt hàng
      }
      const text = result.issues.map((i) => `• ${i.productName}: ${i.message}`).join('\n');
      const hasUnavailable = result.issues.some((i) => i.availability === 'UNAVAILABLE');
      Alert.alert('Giỏ hàng cần chỉnh sửa', text, [
        { text: 'Đóng', style: 'cancel' },
        ...(hasUnavailable
          ? [{
              text: 'Xóa sản phẩm ngừng bán',
              onPress: async () => {
                await cartService.validate(true);
                await refresh();
              },
            }]
          : []),
      ]);
    } catch (e) {
      Alert.alert('Lỗi', getErrorMessage(e));
    } finally {
      setChecking(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Giỏ hàng</Text>
        {cart.lineCount > 0 && (
          <Pressable onPress={confirmClear}>
            <Text style={styles.clear}>Xóa hết</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={cart.items}
        keyExtractor={(i) => String(i.variantId)}
        contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
        refreshControl={<RefreshControl refreshing={loading && cart.items.length > 0} onRefresh={() => refresh()} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="cart-outline" size={64} color={colors.border} />
              <Text style={styles.emptyText}>Giỏ hàng của bạn đang trống</Text>
              <Pressable
                style={{ marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}
                onPress={async () => {
                  try {
                    await cartService.addItem(56, 1);
                    await refresh();
                  } catch (e) {
                    await refresh().catch(() => undefined);
                  }
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>+ Nạp sản phẩm mẫu vào giỏ</Text>
              </Pressable>
            </View>
          )
        }
        renderItem={({ item }) => {
          const bad = item.availability !== 'OK';
          const disabled = busyId === item.variantId;
          return (
            <View style={[styles.card, bad && styles.cardBad]}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.img} />
              ) : (
                <View style={[styles.img, styles.imgPlaceholder]}>
                  <Ionicons name="footsteps" size={28} color={colors.primaryLight} />
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>{item.productName}</Text>
                <Text style={styles.variant}>Size {item.sizeLabel} · {item.colorName}</Text>
                <Text style={styles.price}>{formatVnd(item.unitPrice)}</Text>
                {!!item.message && <Text style={styles.warn}>{item.message}</Text>}
                <View style={styles.qtyRow}>
                  <View style={styles.stepper}>
                    <Pressable disabled={disabled} onPress={() => changeQty(item, item.quantity - 1)} style={styles.stepBtn}>
                      <Ionicons name="remove" size={18} color={colors.text} />
                    </Pressable>
                    <Text style={styles.qty}>{item.quantity}</Text>
                    <Pressable disabled={disabled || item.quantity >= 99} onPress={() => changeQty(item, item.quantity + 1)} style={styles.stepBtn}>
                      <Ionicons name="add" size={18} color={colors.text} />
                    </Pressable>
                  </View>
                  <Pressable onPress={() => confirmRemove(item)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={22} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />

      {cart.lineCount > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tạm tính</Text>
            <Text style={styles.totalValue}>{formatVnd(cart.subtotal)}</Text>
          </View>
          <PrimaryButton title="Kiểm tra & đặt hàng" onPress={checkout} loading={checking} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  clear: { color: colors.danger, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyText: { color: colors.textMuted, fontSize: 16 },
  card: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  cardBad: { borderColor: colors.danger, backgroundColor: '#FFF6F6' },
  img: { width: 84, height: 84, borderRadius: 12, backgroundColor: colors.border },
  imgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  name: { fontWeight: '700', color: colors.text, fontSize: 15 },
  variant: { color: colors.textMuted, fontSize: 13 },
  price: { color: colors.primaryDark, fontWeight: '700', marginTop: 2 },
  warn: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, backgroundColor: colors.white },
  stepBtn: { padding: 8 },
  qty: { minWidth: 28, textAlign: 'center', fontWeight: '700', color: colors.text },
  footer: { paddingTop: 10, paddingBottom: 12, gap: 10, borderTopWidth: 1, borderTopColor: colors.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: colors.textMuted, fontSize: 16 },
  totalValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
});
