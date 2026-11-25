import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useCartStore } from '@/store/useCartStore';
import { colors, shadows } from '@/theme';

export default function TabsLayout() {
  const lineCount = useCartStore((s) => s.cart.lineCount);
  const refresh = useCartStore((s) => s.refresh);

  // Mở app / đăng nhập xong: tải giỏ từ server
  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    height: 62,
    paddingTop: 6,
    paddingBottom: 8,
    ...shadows.md,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: -2,
  },
  tabBarItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 28,
  },
  activeDot: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  badgeStyle: {
    backgroundColor: colors.primary,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    lineHeight: 18,
  },
});

