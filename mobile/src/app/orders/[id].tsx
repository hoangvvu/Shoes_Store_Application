import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/PrimaryButton';
import { QrPaymentCard } from '@/components/QrPaymentCard';
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
const PAY_TX_COLOR: Record<string, { bg: string; fg: string }> = {
  PENDING: { bg: '#FFF4E0', fg: '#B26A00' },
  SUCCESS: { bg: '#E3F7EC', fg: '#168A4F' },
  FAILED: { bg: '#FDE8E8', fg: '#C23030' },
};

const isCash = (code: string) => code === 'CASH' || code === 'COD';

/** Giao dịch thanh toán: xác nhận bằng tiền mặt hay quét QR. */
function confirmKind(code: string, status: string) {
  if (isCash(code)) {
    return {
      icon: 'cash-outline' as const,
      label: 'Tiền mặt',
      confirm: status === 'SUCCESS' ? 'Đã xác nhận thu tiền mặt' : 'Xác nhận bằng tiền mặt khi nhận hàng',
    };
  }
  return {
    icon: 'qr-code-outline' as const,
    label: 'Quét mã QR',
    confirm: status === 'SUCCESS' ? 'Đã xác nhận qua quét QR' : 'Xác nhận bằng quét mã QR',
  };
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
            void load();
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

  const breadcrumb = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.crumbRow}>
        <Pressable hitSlop={8} onPress={() => (router.canGoBack() ? router.back() : router.replace('/orders'))} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <View style={styles.crumbs}>
          <Pressable hitSlop={6} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.crumbLink}>Tài khoản</Text>
          </Pressable>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
          <Pressable hitSlop={6} onPress={() => router.push('/orders')}>
            <Text style={styles.crumbLink}>Đơn hàng</Text>
          </Pressable>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.crumbCurrent} numberOfLines={1}>Đơn #{orderId}</Text>
        </View>
      </View>
      <Text style={styles.pageTitle}>Chi tiết đơn hàng</Text>
    </View>
  );

  if (error && !order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {breadcrumb}
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {breadcrumb}
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      </View>
    );
  }

  const inProgress = order.orderStatus === 'CONFIRMED' || order.orderStatus === 'SHIPPING';
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {breadcrumb}
      <ScrollView contentContainerStyle={styles.container}>
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
                {order.orderStatus === 'DELIVERED' && (
                  <Text
                    style={styles.reviewLink}
                    onPress={() => router.push({ pathname: '/reviews/write', params: { productId: String(i.productId), name: i.productName, invoiceId: String(order.invoiceId) } })}
                  >
                    Đánh giá sản phẩm
                  </Text>
                )}
              </View>
              <Text style={styles.bold}>{formatVnd(i.lineTotal)}</Text>
            </View>
          ))}
          <View style={styles.row}><Text style={styles.muted}>Tổng tiền hàng</Text><Text style={styles.bold}>{formatVnd(order.totalAmount)}</Text></View>
          <View style={styles.row}><Text style={styles.muted}>Giảm giá hóa đơn{order.voucherCode ? ` (${order.voucherCode})` : ''}</Text><Text style={styles.bold}>-{formatVnd(order.discountAmount)}</Text></View>
          <View style={styles.row}><Text style={styles.total}>Phải trả</Text><Text style={styles.total}>{formatVnd(order.amountPayable)}</Text></View>
        </View>

        <Text style={styles.h2}>Giao dịch thanh toán</Text>
        <View style={styles.box}>
          {order.payments.length === 0 && <Text style={styles.muted}>Chưa có giao dịch thanh toán.</Text>}
          {order.payments.map((p) => {
            const k = confirmKind(p.methodCode, p.status);
            const c = PAY_TX_COLOR[p.status] ?? PAY_TX_COLOR.PENDING;
            return (
              <View key={p.paymentId} style={styles.payItem}>
                <View style={styles.payIcon}>
                  <Ionicons name={k.icon} size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.bold}>{k.label}</Text>
                  <Text style={styles.muted}>{p.methodName} · {formatVnd(p.amount)}</Text>
                  <Text style={styles.confirmText}>{k.confirm}</Text>
                </View>
                <Text style={[styles.payBadge, { backgroundColor: c.bg, color: c.fg }]}>{PAY_TX[p.status] ?? p.status}</Text>
              </View>
            );
          })}

          {(() => {
            const pendingOnline = order.payments.find((p) => p.status === 'PENDING' && !isCash(p.methodCode));
            if (!pendingOnline) return null;
            return (
              <QrPaymentCard
                orderId={orderId}
                paymentId={pendingOnline.paymentId}
                amount={pendingOnline.amount}
                createdAt={order.invoiceDate}
                onSuccess={() => void load()}
              />
            );
          })()}

          {order.payments.some((p) => !isCash(p.methodCode)) && (
            <TouchableOpacity style={styles.paymentLink} onPress={() => router.push(`/orders/payment/${orderId}`)}>
              <Text style={styles.paymentLinkText}>Xem lịch sử & đối soát thanh toán →</Text>
            </TouchableOpacity>
          )}
        </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  crumbRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  crumbs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  crumbLink: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  crumbCurrent: { color: colors.white, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  pageTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 10, paddingBottom: 32 },
  error: { color: colors.danger, textAlign: 'center', marginTop: 40, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  h2: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 8 },
  bold: { color: colors.text, fontWeight: '700', fontSize: 15 },
  muted: { color: colors.textMuted, fontSize: 14 },
  ok: { color: '#168A4F', fontSize: 13, fontWeight: '600' },
  reviewLink: { color: colors.primary, fontSize: 14, fontWeight: '700', marginTop: 2 },
  box: { padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 8 },
  lineRow: { flexDirection: 'row', gap: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  total: { color: colors.primaryDark, fontSize: 18, fontWeight: '800' },
  payItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  payIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EDFDF5', alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: colors.primaryDark, fontSize: 13, fontWeight: '700' },
  payBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, fontSize: 12, fontWeight: '700', overflow: 'hidden' },
  timelineItem: { flexDirection: 'row', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 5 },
  paymentLink: { paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 },
  paymentLinkText: { color: colors.primary, fontWeight: '700', fontSize: 14, textAlign: 'center' },
});