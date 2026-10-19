import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/components/Logo';
import { useAuthUser } from '@/hooks/useAuth';
import { colors } from '@/theme';

export default function HomeScreen() {
  const user = useAuthUser();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <Logo />
      <Text style={styles.hello}>Xin chào, {user?.fullName || 'Khách hàng'} 👋</Text>
      <Text style={styles.muted}>Chào mừng bạn đến với Shoes Store!</Text>

      <View style={styles.cardContainer}>
        <Text style={styles.sectionTitle}>Lối tắt kiểm tra chức năng</Text>

        <Pressable style={styles.card} onPress={() => router.push('/(tabs)/cart')}>
          <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="cart" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Giỏ hàng có sẵn (M7 / M8)</Text>
            <Text style={styles.cardDesc}>Tài khoản khach01 / khach02 đã có sẵn sản phẩm mẫu để bấm Đặt hàng (Checkout).</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        <Pressable style={styles.card} onPress={() => router.push('/orders')}>
          <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="receipt" size={24} color="#16A34A" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Đơn hàng của tôi (M8 / M9)</Text>
            <Text style={styles.cardDesc}>Xem các đơn mẫu đã seed, bấm "Xem chi tiết thanh toán →" để test màn hình M9.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, gap: 10, backgroundColor: colors.background },
  hello: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 12 },
  muted: { color: colors.textMuted, fontSize: 14 },
  cardContainer: { marginTop: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
});
