import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusBadge } from '@/components/StatusBadge';
import { PAYMENT_STATUS_LABEL, STATUS_LABEL } from '@/constants/order';
import { orderService } from '@/services/order.service';
import { useCartStore } from '@/store/useCartStore';
import { colors, radius } from '@/theme';
import type { OrderDetail } from '@/types/order';
import { formatDateTime } from '@/utils/datetime';
import { getErrorMessage } from '@/utils/error';
import { formatVnd } from '@/utils/format';

const PAY_TX: Record<string, string> = { PENDING: 'Chờ thanh toán', SUCCESS: 'Thành công', FAILED: 'Không thành công' };

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrder(await orderService.get(orderId));
      setError('');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function confirmCancel() {
    Alert.alert('Hủy đơn hàng', `Bạn chắc chắn muốn hủy đơn #${orderId}?`, [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Hủy đơn',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            setOrder(await orderService.cancel(orderId));
          } catch (e) {
            Alert.alert('Không thể hủy', getErrorMessage(e));
            void load(); // trạng thái có thể vừa đổi (cửa hàng đã xác nhận)
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function reorder() {
    setBusy(true);
    try {
      const res = await orderService.reorder(orderId);
      await useCartStore.getState().refresh();
      const lines = [
        ...res.added.map((a) => `• ${a.productName}: ${a.quantity}${a.quantity < a.requested ? ` (chỉ còn ${a.quantity}/${a.requested})` : ''}`),
        ...res.skipped.map((s) => `• ${s.productName}: bỏ qua (${s.reason})`),
      ];
      Alert.alert(res.added.length ? 'Đã thêm vào giỏ' : 'Không thể mua lại', lines.join('\n'), [
        { text: 'Đóng', style: 'cancel' },
        ...(res.added.length ? [{ text: 'Xem giỏ hàng', onPress: () => router.push('/(tabs)/cart') }] : []),
      ]);
    } catch (e) {
      Alert.alert('Lỗi', getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (error && !order) return <Text style={styles.error}>{error}</Text>;
  if (!order) return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;

  const inProgress = order.orderStatus === 'CONFIRMED' || order.orderStatus === 'SHIPPING';
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title}>Đơn #{order.invoiceId}</Text>
        <StatusBadge status={order.orderStatus} />
      </View>
      <Text style={styles.muted}>{formatDateTime(order.invoiceDate)} · {PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</Text>

      <Text style={styles.h2}>Giao hàng</Text>
      <View style={styles.box}>
        <Text style={styles.bold}>{order.receiverName} · {order.receiverPhone}</Text>
        <Text style={styles.muted}>{order.shippingAddress}</Text>
        {!!order.note && <Text style={styles.muted}>Ghi chú: {order.note}</Text>}
      </View>

      <Text style={styles.h2}>Sản phẩm</Text>
      <View style={styles.box}>
        {order.items.map((i) => (
          <View key={i.variantId} style={styles.lineRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bold} numberOfLines={2}>{i.productName}</Text>
              <Text style={styles.muted}>Size {i.sizeLabel} · {i.colorName} · {i.quantity} × {formatVnd(i.salePrice)}</Text>
              {i.discountAmount > 0 && <Text style={styles.ok}>Giảm {formatVnd(i.discountAmount)}</Text>}
            </View>
            <Text style={styles.bold}>{formatVnd(i.lineTotal)}</Text>
          </View>
        ))}
        <View style={styles.row}><Text style={styles.muted}>Tổng tiền hàng</Text><Text style={styles.bold}>{formatVnd(order.totalAmount)}</Text></View>
        <View style={styles.row}><Text style={styles.muted}>Giảm giá hóa đơn{order.voucherCode ? ` (${order.voucherCode})` : ''}</Text><Text style={styles.bold}>-{formatVnd(order.discountAmount)}</Text></View>
        <View style={styles.row}><Text style={styles.total}>Phải trả</Text><Text style={styles.total}>{formatVnd(order.amountPayable)}</Text></View>
      </View>

      {order.payments.length > 0 && (
        <>
          <Text style={styles.h2}>Thanh toán</Text>
          <View style={styles.box}>
            {order.payments.map((p) => (
              <View key={p.paymentId} style={styles.row}>
                <Text style={styles.bold}>{p.methodName}</Text>
                <Text style={styles.muted}>{formatVnd(p.amount)} · {PAY_TX[p.status]}</Text>
              </View>
            ))}
            {/* M9: nút xem chi tiết thanh toán */}
            <TouchableOpacity
              style={styles.paymentLink}
              onPress={() => router.push(`/orders/payment/${orderId}`)}
            >
              <Text style={styles.paymentLinkText}>Xem chi tiết thanh toán →</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Text style={styles.h2}>Lịch sử đơn hàng</Text>
      <View style={styles.box}>
        {[...order.history].reverse().map((h) => (
          <View key={h.historyId} style={styles.timelineItem}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bold}>{STATUS_LABEL[h.newStatus]}</Text>
              <Text style={styles.muted}>{formatDateTime(h.changedAt)}{h.changedByName ? ` · ${h.changedByName}` : ''}</Text>
              {!!h.note && <Text style={styles.muted}>{h.note}</Text>}
            </View>
          </View>
        ))}
      </View>

      {order.canCancel && <PrimaryButton title="Hủy đơn hàng" onPress={confirmCancel} loading={busy} />}
      {inProgress && <Text style={styles.muted}>Đơn đã được cửa hàng xử lý. Nếu cần hủy, vui lòng liên hệ cửa hàng.</Text>}
      <PrimaryButton title="Mua lại" onPress={reorder} loading={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 10, paddingBottom: 32 },
  error: { color: colors.danger, textAlign: 'center', marginTop: 40, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  h2: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 8 },
  bold: { color: colors.text, fontWeight: '700', fontSize: 15 },
  muted: { color: colors.textMuted, fontSize: 14 },
  ok: { color: '#168A4F', fontSize: 13, fontWeight: '600' },
  box: { padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 8 },
  lineRow: { flexDirection: 'row', gap: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  total: { color: colors.primaryDark, fontSize: 18, fontWeight: '800' },
  timelineItem: { flexDirection: 'row', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 5 },
  paymentLink: { paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 },
  paymentLinkText: { color: colors.primary, fontWeight: '700', fontSize: 14, textAlign: 'center' },
});
