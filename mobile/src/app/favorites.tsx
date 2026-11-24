import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FavoriteButton } from '@/components/FavoriteButton';
import { favoriteService } from '@/services/favorite.service';
import { colors, radius } from '@/theme';
import type { FavoriteItem } from '@/types/review';
import { getErrorMessage } from '@/utils/error';
import { formatVnd } from '@/utils/format';

const SIZE = 20;

export default function FavoritesScreen() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (p: number, append: boolean) => {
    const my = ++requestId.current;
    try {
      const res = await favoriteService.list(p, SIZE);
      if (my !== requestId.current) return;
      setItems((cur) => (append ? [...cur, ...res.items] : res.items));
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch (e) {
      if (my === requestId.current) Alert.alert('Lỗi', getErrorMessage(e));
    } finally {
      if (my === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(1, false);
    }, [load]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: true, title: 'Sản phẩm yêu thích', headerStyle: { backgroundColor: colors.primary }, headerTintColor: colors.white, headerTitleStyle: { fontWeight: '700' }, headerBackTitle: 'Tài khoản' }} />
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.productId)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => load(1, false)} />}
        onEndReached={() => {
          if (loadingMore || loading || page >= totalPages) return;
          setLoadingMore(true);
          void load(page + 1, true);
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
            <View style={styles.empty}>
              <Ionicons name="heart-outline" size={64} color={colors.border} />
              <Text style={styles.emptyText}>Bạn chưa có sản phẩm yêu thích nào</Text>
            </View>
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} /> : undefined}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.img} />
            ) : (
              <View style={[styles.img, styles.imgPlaceholder]}><Ionicons name="footsteps" size={28} color={colors.primaryLight} /></View>
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.name} numberOfLines={2}>{item.productName}</Text>
              <Text style={styles.price}>{formatVnd(item.currentPrice)}</Text>
            </View>
            {/* bỏ thích: dùng chung store; danh sách này tải lại khi quay lại màn hình */}
            <FavoriteButton productId={item.productId} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyText: { color: colors.textMuted, fontSize: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  img: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.border },
  imgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  price: { color: colors.primaryDark, fontWeight: '800' },
});
