import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FavoriteButton } from '@/components/FavoriteButton';
import { resolveProductImage } from '@/components/ProductDetailModal';
import { favoriteService } from '@/services/favorite.service';
import { colors, radius } from '@/theme';
import type { FavoriteItem } from '@/types/review';
import { getErrorMessage } from '@/utils/error';
import { formatVnd } from '@/utils/format';

const SIZE = 20;

export default function FavoritesScreen() {
  const router = useRouter();
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
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Sản phẩm yêu thích',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800', fontSize: 18 },
          headerShadowVisible: false,
          headerBackTitle: 'Tài khoản',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
              style={{ paddingRight: 12, paddingVertical: 4 }}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
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
        renderItem={({ item }) => {
          const imgUri = resolveProductImage(item.imageUrl);
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push(`/products/${item.productId}`)}
            >
              {imgUri ? (
                <Image source={{ uri: imgUri }} style={styles.img} resizeMode="contain" />
              ) : (
                <View style={[styles.img, styles.imgPlaceholder]}>
                  <Ionicons name="image-outline" size={28} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.name} numberOfLines={2}>{item.productName}</Text>
                <Text style={styles.price}>{formatVnd(item.currentPrice)}</Text>
              </View>
              <FavoriteButton productId={item.productId} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyText: { color: colors.textMuted, fontSize: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  img: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#F8FAFC' },
  imgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  price: { color: colors.primaryDark, fontWeight: '800' },
});
