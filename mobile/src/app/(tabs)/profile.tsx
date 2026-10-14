import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTextInput } from '@/components/AppTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { colors } from '@/theme';
import { getErrorMessage } from '@/utils/error';
import { validators as v } from '@/utils/validation';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clear, setUserName } = useAuthStore.getState();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    authService
      .getMe()
      .then((me) => {
        setFullName(me.profile.fullName);
        setPhone(me.profile.phone ?? '');
      })
      .catch((e) => Alert.alert('Lỗi', getErrorMessage(e)));
  }, []);

  async function saveProfile() {
    const msg = v.fullName(fullName) || v.phone(phone);
    if (msg) return Alert.alert('Chưa hợp lệ', msg);
    setSavingProfile(true);
    try {
      const me = await authService.updateMe({ fullName: fullName.trim(), phone: phone.trim() });
      setUserName(me.profile.fullName);
      Alert.alert('Đã lưu', 'Cập nhật hồ sơ thành công');
    } catch (e) {
      Alert.alert('Lỗi', getErrorMessage(e));
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    const msg = (oldPw ? '' : 'Vui lòng nhập mật khẩu cũ') || v.password(newPw) || v.confirm(confirmPw, newPw);
    if (msg) return Alert.alert('Chưa hợp lệ', msg);
    setSavingPw(true);
    try {
      await authService.changePassword(oldPw, newPw);
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
      Alert.alert('Thành công', 'Đổi mật khẩu thành công');
    } catch (e) {
      Alert.alert('Lỗi', getErrorMessage(e));
    } finally {
      setSavingPw(false);
    }
  }

  async function logout() {
    await authService.logout();
    useCartStore.getState().reset(); // không để giỏ của tài khoản này lọt sang tài khoản khác
    await clear(); // AuthGate đưa về màn hình chào
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.h1}>Tài khoản</Text>

      <Text style={styles.h2}>Hồ sơ</Text>
      <AppTextInput icon="person-circle-outline" placeholder="Họ và tên" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
      <AppTextInput icon="call-outline" placeholder="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <PrimaryButton title="Lưu hồ sơ" onPress={saveProfile} loading={savingProfile} />

      <Pressable style={styles.linkRow} onPress={() => router.push('/orders')}>
        <Ionicons name="receipt-outline" size={22} color={colors.primary} />
        <Text style={styles.linkText}>Đơn hàng của tôi</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>

      <Pressable style={styles.linkRow} onPress={() => router.push('/addresses')}>
        <Ionicons name="location-outline" size={22} color={colors.primary} />
        <Text style={styles.linkText}>Địa chỉ giao hàng</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>

      <Text style={[styles.h2, { marginTop: 16 }]}>Đổi mật khẩu</Text>
      <AppTextInput icon="lock-closed-outline" placeholder="Mật khẩu cũ" value={oldPw} onChangeText={setOldPw} secure />
      <AppTextInput icon="lock-closed-outline" placeholder="Mật khẩu mới (8+ ký tự, hoa-thường-số)" value={newPw} onChangeText={setNewPw} secure />
      <AppTextInput icon="lock-closed-outline" placeholder="Nhập lại mật khẩu mới" value={confirmPw} onChangeText={setConfirmPw} secure />
      <PrimaryButton title="Đổi mật khẩu" onPress={changePassword} loading={savingPw} />

      <View style={{ marginTop: 16 }}>
        <Text style={styles.logout} onPress={logout}>Đăng xuất</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingBottom: 40, gap: 12 },
  h1: { fontSize: 28, fontWeight: '800', color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  linkText: { flex: 1, color: colors.text, fontWeight: '600', fontSize: 16 },
  logout: { color: colors.danger, fontWeight: '700', fontSize: 16, textAlign: 'center', padding: 12 },
});
