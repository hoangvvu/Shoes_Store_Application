import { Stack } from 'expo-router';

export default function PaymentLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{ title: 'Thanh toán', headerBackTitle: 'Đơn hàng' }}
      />
    </Stack>
  );
}
