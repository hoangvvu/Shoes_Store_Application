import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, radius } from '@/theme';
import { formatVnd } from '@/utils/format';

export default function DeliveryScreen() {
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchShippingOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/delivery/orders');
      setOrders(res.data.items || []);
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể tải danh sách đơn hàng cần giao.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShippingOrders();
  }, []);

  const handleConfirmDelivered = async (invoiceId: number) => {
    Alert.alert(
      'Xác nhận hoàn tất giao hàng',
      `Xác nhận đơn hàng #${invoiceId} đã được giao thành công cho khách?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đã giao thành công',
          onPress: async () => {
            try {
              await api.post(`/delivery/orders/${invoiceId}/deliver`);
              Alert.alert('Thành công', 'Đã cập nhật trạng thái đơn hàng!');
              fetchShippingOrders();
            } catch (err: any) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể cập nhật trạng thái.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.roleBadge}>NV GIAO HÀNG / SALES</Text>
          <Text style={styles.headerTitle}>Xin chào, {user?.username}</Text>
        </View>
      </View>

      <Text style={styles.subTitle}>Đơn hàng đang chờ giao ({orders.length})</Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.invoiceId)}
          refreshing={loading}
          onRefresh={fetchShippingOrders}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>Đơn hàng #{item.invoiceId}</Text>
                <Text style={styles.amount}>{formatVnd(item.amountPayable)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color={colors.textMuted} />
                <Text style={styles.infoText}>{item.receiverName}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.infoText, { color: colors.primary, fontWeight: '700' }]}>
                  {item.receiverPhone}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                <Text style={styles.infoText}>{item.shippingAddress}</Text>
              </View>

              <TouchableOpacity
                style={styles.deliverButton}
                onPress={() => handleConfirmDelivered(item.invoiceId)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Xác nhận đã giao</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="cube-outline" size={48} color={colors.border} />
              <Text style={styles.emptyText}>Hiện không có đơn hàng nào đang chờ giao.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  roleBadge: { fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  subTitle: { fontSize: 15, fontWeight: '700', color: colors.textMuted, marginBottom: 12 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderId: { fontSize: 16, fontWeight: '800', color: colors.primary },
  amount: { fontSize: 16, fontWeight: '800', color: colors.text },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, color: colors.text, flex: 1 },
  deliverButton: { backgroundColor: '#059669', borderRadius: radius.md, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 15 },
});
