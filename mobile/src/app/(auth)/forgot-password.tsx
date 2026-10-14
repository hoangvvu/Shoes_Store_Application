import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppTextInput } from '@/components/AppTextInput';
import { AuthLayout } from '@/components/AuthLayout';
import { PrimaryButton } from '@/components/PrimaryButton';
import { OTP_LENGTH } from '@/constants/app';
import { authService } from '@/services/auth.service';
import { colors } from '@/theme';
import { getErrorMessage } from '@/utils/error';
import { validators as v } from '@/utils/validation';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    setError('');
    if (!username.trim()) return setError('Vui lòng nhập tên đăng nhập');
    setLoading(true);
    try {
      setInfo(await authService.forgot(username.trim()));
      setStep(2);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setError('');
    const msg = (new RegExp(`^\\d{${OTP_LENGTH}}$`).test(otp) ? '' : `Mã OTP gồm ${OTP_LENGTH} chữ số`) || v.password(password) || v.confirm(confirm, password);
    if (msg) return setError(msg);
    setLoading(true);
    try {
      await authService.reset(username.trim(), otp, password);
      Alert.alert('Thành công', 'Đặt lại mật khẩu thành công. Hãy đăng nhập lại.', [
        { text: 'Đăng nhập', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout headline={'Quên mật khẩu?\nĐừng lo, OURAN giúp bạn'}>
      <Text style={styles.title}>{step === 1 ? 'Xác minh tài khoản' : 'Đặt mật khẩu mới'}</Text>

      {step === 1 ? (
        <>
          <Text style={styles.muted}>Nhập tên đăng nhập, mã xác nhận sẽ được gửi tới số điện thoại đã đăng ký.</Text>
          <AppTextInput icon="person-outline" placeholder="Tên đăng nhập" value={username} onChangeText={setUsername} />
        </>
      ) : (
        <>
          {!!info && <Text style={styles.muted}>{info}</Text>}
          <AppTextInput icon="keypad-outline" placeholder={`Mã OTP ${OTP_LENGTH} số`} value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={OTP_LENGTH} />
          <AppTextInput icon="lock-closed-outline" placeholder="Mật khẩu mới (8+ ký tự, hoa-thường-số)" value={password} onChangeText={setPassword} secure />
          <AppTextInput icon="lock-closed-outline" placeholder="Nhập lại mật khẩu mới" value={confirm} onChangeText={setConfirm} secure />
        </>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton title={step === 1 ? 'Gửi mã xác nhận' : 'Đặt lại mật khẩu'} onPress={step === 1 ? sendOtp : resetPassword} loading={loading} />
      <View style={{ alignItems: 'center' }}>
        <Pressable onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.link}>Quay lại đăng nhập</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
});
