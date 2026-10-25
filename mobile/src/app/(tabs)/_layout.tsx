import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { colors } from '@/theme';

export default function TabsLayout() {
  const lineCount = useCartStore((s) => s.cart.lineCount);
  const refresh = useCartStore((s) => s.refresh);
  // mở app / đăng nhập xong: tải giỏ từ server (nguồn dữ liệu duy nhất)
  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Trang chủ', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={String(color)} size={size} /> }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Giỏ hàng',
          tabBarBadge: lineCount > 0 ? lineCount : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" color={String(color)} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Tài khoản', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={String(color)} size={size} /> }}
      />
    </Tabs>
  );
}
