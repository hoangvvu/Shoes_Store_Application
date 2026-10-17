import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppTextInput } from '@/components/AppTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StarRating } from '@/components/StarRating';
import { reviewService } from '@/services/review.service';
import { colors, radius } from '@/theme';
import type { MyReview } from '@/types/review';
import { getErrorMessage } from '@/utils/error';

const COMMENT_MAX = 1000;
const LABELS = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Tuyệt vời'];

/**
 * Viết hoặc sửa đánh giá. Nếu khách đã có đánh giá cho sản phẩm này thì tự chuyển sang chế độ sửa.
 * Có `invoiceId` (mở từ đơn đã giao) thì đánh giá được gắn nhãn "Đã mua hàng" (CSDL kiểm tra lại).
 */
export default function WriteReviewScreen() {
  const router = useRouter();
  const { productId, name, invoiceId } = useLocalSearchParams<{ productId: string; name?: string; invoiceId?: string }>();
  const pid = Number(productId);

  const [existing, setExisting] = useState<MyReview | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    reviewService
      .listForProduct(pid, { page: 1, size: 1 })
      .then((res) => {
        if (res.mine) {
          setExisting(res.mine);
          setRating(res.mine.rating);
          setComment(res.mine.comment ?? '');
          setImageUrl(res.mine.imageUrl ?? '');
        }
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [pid]);

  async function submit() {
    setError('');
    if (rating < 1) return setError('Vui lòng chọn số sao');
    const url = imageUrl.trim();
    if (url && !/^https?:\/\/\S+$/i.test(url)) return setError('Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://');

    setSaving(true);
    try {
      if (existing) {
        await reviewService.update(existing.reviewId, { rating, comment: comment.trim(), imageUrl: url || null });
      } else {
        await reviewService.create(pid, {
          rating,
          ...(comment.trim() && { comment: comment.trim() }),
          ...(url && { imageUrl: url }),
          ...(invoiceId && { invoiceId: Number(invoiceId) }),
        });
      }
      Alert.alert('Cảm ơn bạn', existing ? 'Đã cập nhật đánh giá.' : 'Đánh giá của bạn đã được gửi.');
      router.back();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: existing ? 'Sửa đánh giá' : 'Viết đánh giá' }} />
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {!!name && <Text style={styles.product}>{name}</Text>}
        {existing && <Text style={styles.muted}>Bạn đã đánh giá sản phẩm này, bạn có thể chỉnh sửa bên dưới.</Text>}

        <View style={styles.stars}>
          <StarRating value={rating} size={38} onChange={setRating} />
          <Text style={styles.starLabel}>{LABELS[rating] || 'Chạm để chọn số sao'}</Text>
        </View>

        <TextInput
          style={styles.comment}
          placeholder="Chia sẻ cảm nhận của bạn về sản phẩm (không bắt buộc)"
          placeholderTextColor={colors.textMuted}
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={COMMENT_MAX}
        />
        <Text style={styles.counter}>{comment.length}/{COMMENT_MAX}</Text>

        <AppTextInput icon="image-outline" placeholder="Link ảnh (không bắt buộc)" value={imageUrl} onChangeText={setImageUrl} keyboardType="url" />
        {!existing && !!invoiceId && <Text style={styles.muted}>Đánh giá sẽ có nhãn "Đã mua hàng".</Text>}

        {!!error && <Text style={styles.error}>{error}</Text>}
        <PrimaryButton title={existing ? 'Lưu thay đổi' : 'Gửi đánh giá'} onPress={submit} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 12 },
  product: { fontSize: 18, fontWeight: '800', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 13 },
  stars: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  starLabel: { color: colors.text, fontWeight: '700' },
  comment: { minHeight: 120, textAlignVertical: 'top', padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.text, fontSize: 15 },
  counter: { alignSelf: 'flex-end', color: colors.textMuted, fontSize: 12, marginTop: -6 },
  error: { color: colors.danger, textAlign: 'center' },
});
