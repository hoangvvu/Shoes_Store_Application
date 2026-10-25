import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStatus } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme';

function AuthGate() {
  const status = useAuthStatus();
  const segments = useSegments();
  const router = useRouter();
  const navReady = !!useRootNavigationState()?.key;
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (status === 'loading' || !navReady) return;
    const inAuth = segments[0] === '(auth)';

    if (status === 'signedOut' && !inAuth) {
      router.replace('/(auth)/welcome');
    } else if (status === 'signedIn' && inAuth) {
      // Phân luồng điều hướng dựa theo vai trò tài khoản:
      if (user?.userType === 'EMPLOYEE') {
        router.replace('/delivery'); // Tài khoản Sales / Nhân viên -> Trang giao hàng
      } else {
        router.replace('/(tabs)');   // Tài khoản Khách hàng -> Trang mua sắm
      }
    }
  }, [status, segments, navReady, router, user]);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AuthGate />
    </SafeAreaProvider>
  );
}
