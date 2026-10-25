import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StarRating } from '@/components/StarRating';
import { reviewService } from '@/services/review.service';
import { colors, radius } from '@/theme';
import type { MyReview, ProductReviews, PublicReview } from '@/types/review';
import { formatDateTime } from '@/utils/datetime';
import { getErrorMessage } from '@/utils/error';

const SIZE = 10;
const MINE_STATUS: Record<string, string> = {
  PENDING: 'Đánh giá của bạn đang chờ duyệt',
  HIDDEN: 'Đánh giá của bạn đã bị ẩn',
};

/** Danh sách đánh giá của một sản phẩm. Màn chi tiết sản phẩm (M4) mở bằng /reviews/<productId>?name=<tên>. */
export default function ProductReviewsScreen() {
  const router = useRouter();
  const { productId, name } = useLocalSearchParams<{ productId: string; name?: string }>();
  const pid = Number(productId);

  const [rating, setRating] = useState<number | undefined>(undefined);
  const [summary, setSummary] = useState<ProductReviews['summary'] | null>(null);
  const [mine, setMine] = useState<MyReview | null>(null);
  const [items, setItems] = useState<PublicReview[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async (star: number | undefined, p: number, append: boolean) => {
    const my = ++requestId.current;
    try {
      const res = await reviewService.listForProduct(pid, { rating: star, page: p, size: SIZE });
      if (my !== requestId.current) return;
      setSummary(res.summary);
      setMine(res.mine);
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
  }, [pid]);

  // tải lại khi quay về từ màn viết đánh giá hoặc khi đổi bộ lọc sao
  useFocusEffect(
    useCallback(() => {
      void load(rating, 1, false);
    }, [load, rating]),
  );

  function loadMore() {
    if (loadingMore || loading || page >= totalPages) return;
    setLoadingMore(true);
    void load(rating, page + 1, true);
  }

  const goWrite = () => router.push({ pathname: '/reviews/write', params: { productId: String(pid), ...(name ? { name } : {}) } });

  function confirmDelete() {
    if (!mine) return;
    Alert.alert('Xóa đánh giá', 'Bạn chắc chắn muốn xóa đánh giá của mình?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await reviewService.remove(mine.reviewId);
            await load(rating, 1, false);
          } catch (e) {
            Alert.alert('Lỗi', getErrorMessage(e));
          }
        },
      },
    ]);
  }

  const header = summary && (
    <View style={styles.headerWrap}>
      {!!name && <Text style={styles.product}>{name}</Text>}
      <View style={styles.summary}>
        <View style={styles.avgBox}>
          <Text style={styles.avg}>{summary.avgRating.toFixed(1)}</Text>
          <StarRating value={summary.avgRating} size={16} />
          <Text style={styles.muted}>{summary.total} đánh giá</Text>
        </View>
        <View style={styles.bars}>
          {([5, 4, 3, 2, 1] as const).map((n) => {
            const count = summary.distribution[n];
            const pct = summary.total ? (count / summary.total) * 100 : 0;
            return (
              <Pressable key={n} style={styles.barRow} onPress={() => setRating(rating === n ? undefined : n)}>
                <Text style={[styles.barLabel, rating === n && styles.barLabelActive]}>{n}★</Text>
                <View style={styles.track}><View style={[styles.fill, { width: `${pct}%` }]} /></View>
                <Text style={styles.barCount}>{count}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {rating !== undefined && <Text style={styles.muted}>Đang lọc {rating} sao · chạm lại để bỏ lọc</Text>}

      {mine ? (
        <View style={styles.mine}>
          <View style={styles.rowBetween}>
            <Text style={styles.bold}>Đánh giá của bạn</Text>
            <StarRating value={mine.rating} size={16} />
          </View>
          {!!MINE_STATUS[mine.status] && <Text style={styles.warn}>{MINE_STATUS[mine.status]}</Text>}
          {!!mine.comment && <Text style={styles.comment}>{mine.comment}</Text>}
          <View style={styles.rowActions}>
            <Pressable onPress={goWrite}><Text style={styles.link}>Sửa</Text></Pressable>
            <Pressable onPress={confirmDelete}><Text style={[styles.link, { color: colors.danger }]}>Xóa</Text></Pressable>
          </View>
        </View>
      ) : (
        <PrimaryButton title="Viết đánh giá" onPress={goWrite} />
      )}
    </View>
  );

  if (loading && !summary) return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (error && !summary) return <Text style={styles.error}>{error}</Text>;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={items}
      keyExtractor={(r) => String(r.reviewId)}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={header || undefined}
      ListEmptyComponent={<Text style={styles.empty}>Chưa có đánh giá nào{rating ? ` ${rating} sao` : ''}.</Text>}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} /> : undefined}
      renderItem={({ item: r }) => (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.bold}>{r.customerName}</Text>
            <StarRating value={r.rating} size={14} />
          </View>
          <Text style={styles.muted}>
            {formatDateTime(r.createdAt)}{r.updatedAt ? ' (đã sửa)' : ''}
            {r.verifiedPurchase ? ' · Đã mua hàng' : ''}
          </Text>
          {!!r.comment && <Text style={styles.comment}>{r.comment}</Text>}
          {!!r.imageUrl && <Image source={{ uri: r.imageUrl }} style={styles.image} />}
          {r.replies.map((p) => (
            <View key={p.replyId} style={styles.reply}>
              <Text style={styles.replyTitle}>Phản hồi từ cửa hàng</Text>
              <Text style={styles.comment}>{p.content}</Text>
            </View>
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, textAlign: 'center', marginTop: 40, padding: 16 },
  headerWrap: { gap: 12, marginBottom: 4 },
  product: { fontSize: 18, fontWeight: '800', color: colors.text },
  summary: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  avgBox: { alignItems: 'center', gap: 4, minWidth: 96 },
  avg: { fontSize: 40, fontWeight: '800', color: colors.text },
  bars: { flex: 1, gap: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { width: 26, color: colors.textMuted, fontSize: 13 },
  barLabelActive: { color: colors.primary, fontWeight: '800' },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: '#F5A623' },
  barCount: { width: 28, textAlign: 'right', color: colors.textMuted, fontSize: 13 },
  mine: { padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowActions: { flexDirection: 'row', gap: 20 },
  bold: { color: colors.text, fontWeight: '700', fontSize: 15 },
  muted: { color: colors.textMuted, fontSize: 13 },
  warn: { color: '#B26A00', fontSize: 13, fontWeight: '600' },
  link: { color: colors.primary, fontWeight: '700' },
  comment: { color: colors.text, fontSize: 15, lineHeight: 21 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 30 },
  card: { padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 6 },
  image: { width: 120, height: 120, borderRadius: 10, backgroundColor: colors.border },
  reply: { marginTop: 4, padding: 10, borderRadius: 10, backgroundColor: colors.white, borderLeftWidth: 3, borderLeftColor: colors.primary, gap: 2 },
  replyTitle: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
});
