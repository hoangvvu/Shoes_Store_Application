import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTextInput } from '@/components/AppTextInput';
import { AuthLayout } from '@/components/AuthLayout';
import { PrimaryButton } from '@/components/PrimaryButton';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, radius } from '@/theme';
import { getErrorMessage } from '@/utils/error';

export default function LoginScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError('');
    if (!username.trim() || !password) return setError('Vui lòng nhập tên đăng nhập và mật khẩu');
    setLoading(true);
    try {
      const res = await authService.login({ username: username.trim(), password });
      await setSession(res, remember); // AuthGate tự chuyển sang (tabs)
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout headline={'Đăng nhập để tiếp tục\nmua sắm cùng OURAN'}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Đăng nhập</Text>
        <Text style={styles.muted}>
          Chưa có tài khoản?{' '}
          <Link href="/(auth)/register" style={styles.link}>Đăng ký</Link>
        </Text>
      </View>

      <AppTextInput
        icon="person-outline"
        placeholder="Tên đăng nhập"
        value={username}
        onChangeText={setUsername}
        textContentType="username"
      />
      <AppTextInput
        icon="lock-closed-outline"
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secure
        textContentType="password"
      />

      <View style={styles.row}>
        <Pressable style={styles.remember} onPress={() => setRemember((r) => !r)}>
          <Ionicons name={remember ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
          <Text style={styles.muted}>Ghi nhớ đăng nhập</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
          <Text style={styles.link}>Quên mật khẩu?</Text>
        </Pressable>
      </View>

      {/* Quick Fill Test Accounts */}
      <View style={styles.quickFillWrap}>
        <Text style={styles.quickFillLabel}>Tài khoản mẫu để thử nghiệm nhanh:</Text>
        <View style={styles.quickFillButtons}>
          <TouchableOpacity
            style={styles.quickChip}
            onPress={() => {
              setUsername('khach01');
              setPassword('Khach@12345');
              setError('');
            }}
          >
            <Ionicons name="person-circle-outline" size={14} color={colors.primary} />
            <Text style={styles.quickChipText}>khach01 (Khách hàng)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickChip}
            onPress={() => {
              setUsername('admin');
              setPassword('Admin@12345');
              setError('');
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
            <Text style={styles.quickChipText}>admin (Quản trị)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton title="Đăng nhập" onPress={onSubmit} loading={loading} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  titleRow: { gap: 4 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  remember: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  quickFillWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginTop: 4,
  },
  quickFillLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  quickFillButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
});
