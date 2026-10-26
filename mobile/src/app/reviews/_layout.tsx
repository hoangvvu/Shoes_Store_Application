import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function ReviewsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
        headerBackTitle: 'Quay lại',
      }}
    >
      <Stack.Screen name="[productId]" options={{ title: 'Đánh giá sản phẩm' }} />
      <Stack.Screen name="write" options={{ title: 'Viết đánh giá' }} />
    </Stack>
  );
}
