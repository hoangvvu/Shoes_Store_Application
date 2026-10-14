import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppTextInput } from '@/components/AppTextInput';
import { AuthLayout } from '@/components/AuthLayout';
import { PrimaryButton } from '@/components/PrimaryButton';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme';
import { getErrorMessage } from '@/utils/error';
import { firstError, validators as v } from '@/utils/validation';

export default function RegisterScreen() {
  const setSession = useAuthStore((s) => s.setSession);
  const [f, setF] = useState({ fullName: '', phone: '', username: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f) => (val: string) => setF((p) => ({ ...p, [k]: val }));

  async function onSubmit() {
    setServerError('');
    const e = {
      fullName: v.fullName(f.fullName),
      phone: v.phone(f.phone),
      username: v.username(f.username),
      password: v.password(f.password),
      confirm: v.confirm(f.confirm, f.password),
    };
    setErrors(e);
    if (firstError(...Object.values(e))) return;

    setLoading(true);
    try {
      const payload = { fullName: f.fullName.trim(), phone: f.phone.trim(), username: f.username.trim(), password: f.password };
      await authService.register(payload);
      // /auth/register không trả token -> đăng nhập luôn bằng thông tin vừa tạo
      const res = await authService.login({ username: payload.username, password: payload.password });
      await setSession(res, true);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout headline={'Tạo tài khoản và\nbắt đầu mua sắm'}>
      <View style={{ gap: 4 }}>
        <Text style={styles.title}>Đăng ký</Text>
        <Text style={styles.muted}>
          Đã có tài khoản? <Link href="/(auth)/login" style={styles.link}>Đăng nhập</Link>
        </Text>
      </View>

      <AppTextInput icon="person-circle-outline" placeholder="Họ và tên" value={f.fullName} onChangeText={set('fullName')} autoCapitalize="words" error={errors.fullName} />
      <AppTextInput icon="call-outline" placeholder="Số điện thoại" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={errors.phone} />
      <AppTextInput icon="person-outline" placeholder="Tên đăng nhập (4–50 ký tự)" value={f.username} onChangeText={set('username')} error={errors.username} />
      <AppTextInput icon="lock-closed-outline" placeholder="Mật khẩu (8+ ký tự, hoa-thường-số)" value={f.password} onChangeText={set('password')} secure error={errors.password} />
      <AppTextInput icon="lock-closed-outline" placeholder="Nhập lại mật khẩu" value={f.confirm} onChangeText={set('confirm')} secure error={errors.confirm} />

      <Text style={styles.hint}>Tên đăng nhập: chữ cái, số, dấu _ hoặc -, không khoảng trắng. Mật khẩu: tối thiểu 8 ký tự gồm chữ hoa, chữ thường và số.</Text>
      {!!serverError && <Text style={styles.error}>{serverError}</Text>}
      <PrimaryButton title="Đăng ký" onPress={onSubmit} loading={loading} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
});
