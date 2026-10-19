import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Alert, Pressable } from 'react-native';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { colors } from '@/theme';
import { getErrorMessage } from '@/utils/error';

/** Nút trái tim thích / bỏ thích. Màn chi tiết sản phẩm (M4) chỉ cần: <FavoriteButton productId={id} /> */
export function FavoriteButton({ productId, size = 26 }: { productId: number; size?: number }) {
  const liked = useFavoriteStore((s) => s.ids.includes(productId));
  const ensureLoaded = useFavoriteStore((s) => s.ensureLoaded);
  const toggle = useFavoriteStore((s) => s.toggle);

  useEffect(() => {
    ensureLoaded().catch(() => undefined);
  }, [ensureLoaded]);

  return (
    <Pressable
      hitSlop={10}
      accessibilityLabel={liked ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
      onPress={() => toggle(productId).catch((e) => Alert.alert('Lỗi', getErrorMessage(e)))}
    >
      <Ionicons name={liked ? 'heart' : 'heart-outline'} size={size} color={liked ? colors.danger : colors.textMuted} />
    </Pressable>
  );
}
