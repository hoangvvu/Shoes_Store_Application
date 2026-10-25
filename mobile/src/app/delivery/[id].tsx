import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { colors, radius } from '@/theme';
import { formatVnd } from '@/utils/format';

const PAY_TX: Record<string, string> = { PENDING: 'Chờ thanh toán', SUCCESS: 'Thành công', FAILED: 'Không thành công' };
const PAY_TX_COLOR: Record<string, { bg: string; fg: string }> = {
  PENDING: { bg: '#FFF4E0', fg: '#B26A00' },
  SUCCESS: { bg: '#E3F7EC', fg: '#168A4F' },
  FAILED: { bg: '#FDE8E8', fg: '#C23030' },
};

const isCash = (code: string) => code === 'CASH' || code === 'COD';

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

export default function DeliveryOrderDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  // useLocalSearchParams có thể trả về string | string[] -> chuẩn hóa về string
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);

  const fetchOrderDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/delivery/orders/${id}`);
      setOrder(res.data);
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể lấy thông tin chi tiết đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOrder(null);
    setShowQr(false);
    if (id) fetchOrderDetail();
    else setLoading(false);
  }, [id]);

  const goToList = () => router.replace('/delivery' as any);

  const handleConfirmDelivered = async () => {
    Alert.alert(
      'Xác nhận hoàn tất giao hàng',
      `Xác nhận đơn hàng #${id} đã giao thành công và thu đủ tiền cho khách?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận đã giao',
          onPress: async () => {
            try {
              await api.post(`/delivery/orders/${id}/deliver`);
              Alert.alert('Thành công', 'Đã cập nhật trạng thái đơn hàng thành công!');
              goToList();
            } catch (err: any) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể cập nhật trạng thái.');
            }
          },
        },
      ]
    );
  };

  const breadcrumb = (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.crumbRow}>
        <Pressable hitSlop={8} onPress={() => (router.canGoBack() ? router.back() : goToList())} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.white} />
        </Pressable>
        <View style={styles.crumbs}>
          <Pressable hitSlop={6} onPress={goToList}>
            <Text style={styles.crumbLink}>Giao hàng</Text>
          </Pressable>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.crumbCurrent} numberOfLines={1}>Chi tiết đơn #{id}</Text>
        </View>
      </View>
      <Text style={styles.pageTitle}>Thông tin chi tiết đơn hàng</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {breadcrumb}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {breadcrumb}
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>Không tìm thấy thông tin đơn hàng.</Text>
        </View>
      </View>
    );
  }

  const qrUrl = `https://img.vietqr.io/image/970422-0000123456789-compact2.png?amount=${order.amountPayable}&addInfo=THANHTOAN_DON_${order.invoiceId}`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {breadcrumb}
      <ScrollView contentContainerStyle={styles.container}>
        {/* Thẻ người nhận & địa chỉ giao hàng */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin giao hàng</Text>
          <View style={styles.row}>
            <Ionicons name="person-outline" size={18} color={colors.primary} />
            <Text style={styles.rowText}>{order.receiverName}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="call-outline" size={18} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.primary, fontWeight: '700' }]}>{order.receiverPhone}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Text style={styles.rowText}>{order.shippingAddress}</Text>
          </View>
        </View>

        {/* Danh sách sản phẩm trong đơn */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Danh sách sản phẩm</Text>
          {order.items?.map((item: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemSub}>
                  Size {item.sizeLabel} · {item.colorName} · SL: x{item.quantity}
                </Text>
              </View>
              <Text style={styles.itemPrice}>{formatVnd(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        {/* Giao dịch thanh toán & Xác nhận bằng tiền mặt hay quét QR */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Giao dịch thanh toán</Text>
          {(!order.payments || order.payments.length === 0) && (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Chưa có giao dịch thanh toán được ghi nhận.</Text>
          )}
          {order.payments?.map((p: any) => {
            const k = confirmKind(p.methodCode || p.paymentMethodCode || '', p.status);
            const c = PAY_TX_COLOR[p.status] ?? PAY_TX_COLOR.PENDING;
            return (
              <View key={p.paymentId || p.id} style={styles.payItem}>
                <View style={styles.payIcon}>
                  <Ionicons name={k.icon} size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.boldText}>{k.label}</Text>
                  <Text style={styles.mutedText}>{p.methodName || 'Phương thức thanh toán'} · {formatVnd(p.amount || order.amountPayable)}</Text>
                  <Text style={styles.confirmText}>{k.confirm}</Text>
                </View>
                <Text style={[styles.payBadge, { backgroundColor: c.bg, color: c.fg }]}>{PAY_TX[p.status] ?? p.status}</Text>
              </View>
            );
          })}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tổng tiền phải thu:</Text>
            <Text style={styles.summaryValue}>{formatVnd(order.amountPayable)}</Text>
          </View>

          <TouchableOpacity style={styles.qrBtn} onPress={() => setShowQr(!showQr)}>
            <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
            <Text style={styles.qrBtnText}>{showQr ? 'Ẩn mã QR' : 'Hiện mã QR thanh toán'}</Text>
          </TouchableOpacity>

          {showQr && (
            <View style={styles.qrBox}>
              <Image source={{ uri: qrUrl }} style={{ width: 200, height: 200 }} />
              <Text style={styles.qrHint}>Khách quét mã chuyển khoản nhanh</Text>
            </View>
          )}
        </View>

        {/* Nút xác nhận đã giao */}
        <TouchableOpacity style={styles.deliverBtn} onPress={handleConfirmDelivered} activeOpacity={0.8}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
          <Text style={styles.deliverBtnText}>Xác nhận đã giao hàng thành công</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 14, gap: 6 },
  crumbRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  crumbs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  crumbLink: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  crumbCurrent: { color: colors.white, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  pageTitle: { color: colors.white, fontSize: 20, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 14, color: colors.text, flex: 1 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.background },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: colors.text },
  payItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.background },
  payIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EDFDF5', alignItems: 'center', justifyContent: 'center' },
  boldText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  mutedText: { color: colors.textMuted, fontSize: 13 },
  confirmText: { color: colors.primaryDark, fontSize: 13, fontWeight: '700' },
  payBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, fontSize: 12, fontWeight: '700', overflow: 'hidden' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  summaryLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
  qrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, marginTop: 4 },
  qrBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  qrBox: { alignItems: 'center', justifyContent: 'center', marginTop: 8, gap: 8 },
  qrHint: { fontSize: 12, color: colors.textMuted },
  deliverBtn: { backgroundColor: '#059669', borderRadius: radius.md, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  deliverBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});