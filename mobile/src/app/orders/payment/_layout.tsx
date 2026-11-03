import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { colors } from '@/theme';

export default function PaymentLayout() {
  const router = useRouter();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Quay lại',
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/orders'))}
            style={{ paddingRight: 12, paddingVertical: 4 }}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{ title: 'Thanh toán đơn hàng' }}
      />
    </Stack>
  );
}
