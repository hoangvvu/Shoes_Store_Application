import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function AddressesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Quay lại',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Địa chỉ giao hàng' }} />
      <Stack.Screen name="form" options={{ title: 'Địa chỉ' }} />
    </Stack>
  );
}
