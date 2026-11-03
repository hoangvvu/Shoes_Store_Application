import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { resolveProductImage } from '@/components/ProductDetailModal';
import { StatusBadge } from '@/components/StatusBadge';
import { PAYMENT_STATUS_LABEL, STATUS_FILTERS } from '@/constants/order';
import { orderService } from '@/services/order.service';
import { colors, radius } from '@/theme';
import type { OrderListItem, OrderStatus } from '@/types/order';
import { formatDateTime } from '@/utils/datetime';
import { getErrorMessage } from '@/utils/error';
import { formatVnd } from '@/utils/format';

const SIZE = 10;
const MAX_LINES = 2;

export default function OrderListScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async (st: OrderStatus | undefined, p: number, append: boolean) => {
    const my = ++requestId.current;
    try {
      const res = await orderService.listMine({ status: st, page: p, size: SIZE });
      if (my !== requestId.current) return;
      setItems((cur) => (append ? [...cur, ...res.items] : res.items));
      setPage(res.page);
      setTotalPages(res.totalPages);
      setError('');
    } catch (e) {
      if (my === requestId.current) setError(getErrorMessage(e));
    } finally {
      if (my === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load(status, 1, false);
    }, [load, status]),
  );

  function pick(st: OrderStatus | undefined) {
    if (st === status) return;
    setStatus(st);
  }

  function loadMore() {
    if (loadingMore || loading || page >= totalPages) return;
    setLoadingMore(true);
    void load(status, page + 1, true);
  }

  return (
    <View style={styles.container}>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {STATUS_FILTERS.map((f) => (
            <Pressable key={f.text} onPress={() => pick(f.value)} style={[styles.chip, status === f.value && styles.chipActive]}>
              <Text style={[styles.chipText, status === f.value && styles.chipTextActive]}>{f.text}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={items}
        keyExtractor={(o) => String(o.invoiceId)}
        contentContainerStyle={{ gap: 12, padding: 16 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => load(status, 1, false)} />}
        ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : <Text style={styles.empty}>Chưa có đơn hàng nào</Text>}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} /> : undefined}
        renderItem={({ item: o }) => {
          const lines = o.items ?? [];
          const shown = lines.slice(0, MAX_LINES);
          const more = lines.length - shown.length;
          return (
            <Pressable style={styles.card} onPress={() => router.push({ pathname: '/orders/[id]', params: { id: String(o.invoiceId) } })}>
              <View style={styles.row}>
                <Text style={styles.id}>Đơn #{o.invoiceId}</Text>
                <StatusBadge status={o.orderStatus} />
              </View>
              <Text style={styles.muted}>{formatDateTime(o.invoiceDate)}</Text>

              {shown.map((l) => {
                const uri = resolveProductImage(l.imageUrl);
                return (
                  <View key={l.variantId} style={styles.line}>
                    {uri ? (
                      <Image source={{ uri }} style={styles.img} resizeMode="cover" />
                    ) : (
                      <View style={[styles.img, styles.imgPlaceholder]}>
                        <Ionicons name="footsteps" size={22} color={colors.primaryLight} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={2}>{l.productName}</Text>
                      <Text style={styles.muted}>Size {l.sizeLabel} · {l.colorName} · x{l.quantity}</Text>
                    </View>
                  </View>
                );
              })}
              {more > 0 && <Text style={styles.more}>+ {more} sản phẩm khác</Text>}

              <View style={styles.row}>
                <Text style={styles.muted}>{PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus}</Text>
                <Text style={styles.amount}>{formatVnd(o.amountPayable)}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  error: { color: colors.danger, textAlign: 'center' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 60 },
  card: { padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  id: { fontWeight: '800', color: colors.text, fontSize: 16 },
  muted: { color: colors.textMuted, fontSize: 14 },
  amount: { color: colors.primaryDark, fontWeight: '800', fontSize: 16 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  img: { width: 60, height: 60, borderRadius: 10, backgroundColor: colors.border },
  imgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontWeight: '700', fontSize: 14 },
  more: { color: colors.primary, fontWeight: '600', fontSize: 13 },
});