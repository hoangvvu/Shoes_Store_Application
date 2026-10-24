import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function PaymentLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Quay lại',
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{ title: 'Thanh toán đơn hàng' }}
      />
    </Stack>
  );
}
