import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/components/Logo';
import { useAuthUser } from '@/hooks/useAuth';
import { colors } from '@/theme';

// Màn hình tạm sau đăng nhập; các module sản phẩm / giỏ hàng / đơn hàng sẽ thay thế.
export default function HomeScreen() {
  const user = useAuthUser();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <Logo />
      <Text style={styles.hello}>Xin chào, {user?.fullName} 👋</Text>
      <Text style={styles.muted}>Danh sách sản phẩm sẽ hiển thị tại đây ở các module tiếp theo.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, gap: 12, backgroundColor: colors.background },
  hello: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 12 },
  muted: { color: colors.textMuted, fontSize: 15 },
});
