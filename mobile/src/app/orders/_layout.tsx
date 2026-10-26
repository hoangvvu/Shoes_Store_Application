import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function OrdersLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Đơn hàng của tôi' }} />
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết đơn hàng' }} />
      <Stack.Screen name="payment" options={{ headerShown: false }} />
    </Stack>
  );
}
