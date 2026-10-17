import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function ReviewsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Quay lại',
      }}
    >
      <Stack.Screen name="[productId]" options={{ title: 'Đánh giá sản phẩm' }} />
      <Stack.Screen name="write" options={{ title: 'Viết đánh giá' }} />
    </Stack>
  );
}
