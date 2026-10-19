import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppTextInput } from '@/components/AppTextInput';
import { AuthLayout } from '@/components/AuthLayout';
import { DatePickerField } from '@/components/DatePickerField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme';
import { getErrorMessage } from '@/utils/error';
import { dmyToYmd, firstError, optionalValidators, validators as v } from '@/utils/validation';

type Gender = 'MALE' | 'FEMALE' | 'OTHER';

const GENDERS: { value: Gender; text: string }[] = [
  { value: 'MALE', text: 'Nam' },
  { value: 'FEMALE', text: 'Nữ' },
  { value: 'OTHER', text: 'Khác' },
];

export default function RegisterScreen() {
  const setSession = useAuthStore((s) => s.setSession);
  const [f, setF] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    email: '',
    dob: '',
    username: '',
    password: '',
    confirm: '',
  });
  const [gender, setGender] = useState<Gender | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f) => (val: string) => setF((p) => ({ ...p, [k]: val }));

  async function onSubmit() {
    setServerError('');
    const e = {
      lastName: v.lastName(f.lastName),
      firstName: v.firstName(f.firstName),
      phone: v.phone(f.phone),
      email: optionalValidators.email(f.email),
      dob: optionalValidators.birthDate(f.dob),
      username: v.username(f.username),
      password: v.password(f.password),
      confirm: v.confirm(f.confirm, f.password),
    };
    setErrors(e);
    if (firstError(...Object.values(e))) return;

    setLoading(true);
    try {
      // Giới tính, ngày sinh, email không bắt buộc: chỉ gửi khi khách có nhập
      const payload = {
        lastName: f.lastName.trim(),
        firstName: f.firstName.trim(),
        phone: f.phone.trim(),
        username: f.username.trim(),
        password: f.password,
        ...(gender ? { gender } : {}),
        ...(f.dob.trim() ? { dateOfBirth: dmyToYmd(f.dob) as string } : {}),
        ...(f.email.trim() ? { email: f.email.trim() } : {}),
      };
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

      <AppTextInput icon="person-circle-outline" placeholder="Họ và tên đệm (vd: Nguyễn Văn)" value={f.lastName} onChangeText={set('lastName')} autoCapitalize="words" error={errors.lastName} />
      <AppTextInput icon="person-circle-outline" placeholder="Tên (vd: An)" value={f.firstName} onChangeText={set('firstName')} autoCapitalize="words" error={errors.firstName} />
      <AppTextInput icon="call-outline" placeholder="Số điện thoại" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={errors.phone} />
      <AppTextInput icon="mail-outline" placeholder="Email (không bắt buộc)" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoComplete="email" error={errors.email} />
      <DatePickerField value={f.dob} onChange={set('dob')} placeholder="Ngày sinh (không bắt buộc)" error={errors.dob} />

      <View style={{ gap: 6 }}>
        <Text style={styles.label}>Giới tính (không bắt buộc)</Text>
        <View style={styles.genderRow}>
          {GENDERS.map(({ value, text }) => (
            <Pressable
              key={value}
              onPress={() => setGender(gender === value ? null : value)}
              style={[styles.genderChip, gender === value && styles.genderChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: gender === value }}
            >
              <Text style={[styles.genderText, gender === value && styles.genderTextActive]}>{text}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <AppTextInput icon="person-outline" placeholder="Tên đăng nhập (4–50 ký tự)" value={f.username} onChangeText={set('username')} error={errors.username} />
      <AppTextInput icon="lock-closed-outline" placeholder="Mật khẩu (8+ ký tự, hoa-thường-số)" value={f.password} onChangeText={set('password')} secure error={errors.password} />
      <AppTextInput icon="lock-closed-outline" placeholder="Nhập lại mật khẩu" value={f.confirm} onChangeText={set('confirm')} secure error={errors.confirm} />

      <Text style={styles.hint}>Tên đăng nhập: chữ cái, số, dấu _ hoặc -, không khoảng trắng. Mật khẩu: tối thiểu 8 ký tự gồm chữ hoa, chữ thường và số. Email, ngày sinh và giới tính có thể bỏ trống, chạm lại giới tính đã chọn để bỏ chọn.</Text>
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
  label: { color: colors.textMuted, fontSize: 13, marginLeft: 4 },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderChip: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  genderChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderText: { color: colors.text, fontWeight: '600' },
  genderTextActive: { color: colors.white },
});
