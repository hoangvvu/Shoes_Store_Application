import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function AddressesLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Địa chỉ giao hàng' }} />
      <Stack.Screen name="form" options={{ title: 'Địa chỉ' }} />
    </Stack>
  );
}
