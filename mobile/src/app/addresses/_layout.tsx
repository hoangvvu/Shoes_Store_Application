import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { colors } from '@/theme';

export default function AddressesLayout() {
  const router = useRouter();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
        headerBackTitle: 'Quay lại',
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
            style={{ paddingRight: 12, paddingVertical: 4 }}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Địa chỉ giao hàng' }} />
      <Stack.Screen name="form" options={{ title: 'Địa chỉ' }} />
    </Stack>
  );
}
