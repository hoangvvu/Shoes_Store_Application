import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function OrdersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Quay lại',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Đơn hàng của tôi' }} />
      {/* Trang chi tiết là giao diện riêng, tự vẽ breadcrumb */}
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
      <Stack.Screen name="payment" options={{ headerShown: false }} />
    </Stack>
  );
}