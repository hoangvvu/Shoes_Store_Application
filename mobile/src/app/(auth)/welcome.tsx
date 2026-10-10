import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { AuthLayout } from '@/components/AuthLayout';
import { Logo } from '@/components/Logo';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <AuthLayout headline="" hero>
      <Logo size={40} />
      <Text style={styles.title}>Sải bước tự tin, chọn giày chuẩn phong cách</Text>
      <Text style={styles.sub}>
        Khám phá bộ sưu tập giày mới nhất, đặt hàng nhanh chóng và theo dõi đơn hàng ngay trên điện thoại.
      </Text>
      <PrimaryButton title="Bắt đầu" onPress={() => router.push('/(auth)/login')} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  sub: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
});
