import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { colors, radius } from '@/theme';
import { formatVnd } from '@/utils/format';

export default function DeliveryOrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
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
    if (id) fetchOrderDetail();
  }, [id]);

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
              router.back();
            } catch (err: any) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể cập nhật trạng thái.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Không tìm thấy thông tin đơn hàng.</Text>
      </View>
    );
  }

  const qrUrl = `https://img.vietqr.io/image/970422-0000123456789-compact2.png?amount=${order.amountPayable}&addInfo=THANHTOAN_DON_${order.invoiceId}`;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Chi tiết đơn hàng #{order.invoiceId}</Text>
      </View>

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

      {/* Tổng thanh toán & Phương thức QR */}
      <View style={styles.card}>
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
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  container: { padding: 16, paddingTop: 50, backgroundColor: colors.background, gap: 12, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  backBtn: { padding: 8, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  topTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 14, color: colors.text, flex: 1 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.background },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: colors.text },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
  qrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, marginTop: 8 },
  qrBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  qrBox: { alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 8 },
  qrHint: { fontSize: 12, color: colors.textMuted },
  deliverBtn: { backgroundColor: '#059669', borderRadius: radius.md, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  deliverBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
