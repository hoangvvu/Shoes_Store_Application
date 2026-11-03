import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, radius } from '@/theme';
import { formatVnd } from '@/utils/format';

export default function DeliveryScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchShippingOrders = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      // Thêm _t: Date.now() để chống cache GET request, đảm bảo nhận dữ liệu real-time mới nhất
      const res = await api.get('/delivery/orders', {
        params: { _t: Date.now() },
      });
      setOrders([...(res.data.items || [])]);
    } catch (err: any) {
      if (!isBackground) {
        Alert.alert(
          'Lỗi',
          err.response?.data?.message ||
            'Không thể tải danh sách đơn hàng cần giao.'
        );
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Tải lại danh sách mỗi khi màn hình được focus và duy trì polling real-time ngầm mỗi 4 giây
  useFocusEffect(
    useCallback(() => {
      fetchShippingOrders(false);

      const interval = setInterval(() => {
        fetchShippingOrders(true);
      }, 4000);

      return () => clearInterval(interval);
    }, [])
  );

  const openOrderDetail = (invoiceId: number | string) => {
    router.push({ pathname: '/delivery/[id]', params: { id: String(invoiceId) } } as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.roleBadge}>NHÂN VIÊN GIAO HÀNG</Text>
          <Text style={styles.headerTitle}>
            Xin chào, {user?.username || 'bạn'}
          </Text>
        </View>
      </View>

      <Text style={styles.subTitle}>
        Đơn hàng đang chờ giao ({orders.length})
      </Text>

      {loading && orders.length === 0 ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.invoiceId)}
          refreshing={loading}
          onRefresh={() => fetchShippingOrders(false)}
          contentContainerStyle={{ gap: 12, paddingBottom: 24, flexGrow: 1 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>
                  Đơn hàng #{item.invoiceId}
                </Text>
                <Text style={styles.amount}>
                  {formatVnd(item.amountPayable)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color={colors.textMuted} />
                <Text style={styles.infoText}>
                  {item.receiverName || 'Chưa có tên người nhận'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.infoText, { color: colors.primary, fontWeight: '700' }]}>
                  {item.receiverPhone || 'Chưa có số điện thoại'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                <Text style={styles.infoText}>
                  {item.shippingAddress || 'Chưa có địa chỉ giao hàng'}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.detailButton,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => openOrderDetail(item.invoiceId)}
                >
                  <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                  <Text style={styles.detailButtonText}>Chi tiết</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyBox}>
                <Ionicons name="cube-outline" size={48} color={colors.border} />
                <Text style={styles.emptyText}>
                  Hiện không có đơn hàng nào đang chờ giao.
                </Text>
              </View>
            ) : undefined
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
  orderId: { fontSize: 16, fontWeight: '800', color: colors.primary },
  amount: { fontSize: 16, fontWeight: '800', color: colors.text },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, color: colors.text, flex: 1 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  detailButton: { flex: 1, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.surface },
  detailButtonText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
});