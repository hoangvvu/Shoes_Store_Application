import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTextInput } from '@/components/AppTextInput';
import { DatePickerField } from '@/components/DatePickerField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { colors } from '@/theme';
import { getErrorMessage } from '@/utils/error';
import { dmyToYmd, optionalValidators, validators as v, ymdToDmy } from '@/utils/validation';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clear, setUserName } = useAuthStore.getState();

  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | null>(null);
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    authService
      .getMe()
      .then((me) => {
        setLastName(me.profile.lastName);
        setFirstName(me.profile.firstName);
        setPhone(me.profile.phone ?? '');
        setGender(me.profile.gender);
        setDob(ymdToDmy(me.profile.dateOfBirth));
        setEmail(me.profile.email ?? '');
      })
      .catch((e) => Alert.alert('Lỗi', getErrorMessage(e)));
  }, []);

  async function saveProfile() {
    const msg = v.lastName(lastName) || v.firstName(firstName) || v.phone(phone) || optionalValidators.birthDate(dob) || optionalValidators.email(email);
    if (msg) return Alert.alert('Chưa hợp lệ', msg);
    setSavingProfile(true);
    try {
      // Giới tính, ngày sinh, email không bắt buộc: để trống = xóa (null)
      const me = await authService.updateMe({
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        phone: phone.trim(),
        gender,
        dateOfBirth: dob.trim() ? dmyToYmd(dob) : null,
        email: email.trim() || null,
      });
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
    useFavoriteStore.getState().reset(); // tương tự với danh sách yêu thích
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
      <AppTextInput icon="person-circle-outline" placeholder="Họ và tên đệm" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
      <AppTextInput icon="person-circle-outline" placeholder="Tên" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
      <AppTextInput icon="call-outline" placeholder="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <AppTextInput icon="mail-outline" placeholder="Email (không bắt buộc)" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <DatePickerField value={dob} onChange={setDob} placeholder="Ngày sinh (không bắt buộc)" />
      <View style={styles.genderRow}>
        {([['MALE', 'Nam'], ['FEMALE', 'Nữ'], ['OTHER', 'Khác']] as const).map(([value, text]) => (
          <Pressable key={value} onPress={() => setGender(gender === value ? null : value)} style={[styles.genderChip, gender === value && styles.genderChipActive]}>
            <Text style={[styles.genderText, gender === value && styles.genderTextActive]}>{text}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.optional}>Giới tính, ngày sinh và email không bắt buộc; chạm lại giới tính đã chọn để bỏ chọn, bấm dấu × để xóa ngày sinh.</Text>
      <PrimaryButton title="Lưu hồ sơ" onPress={saveProfile} loading={savingProfile} />

      <Pressable style={styles.linkRow} onPress={() => router.push('/favorites')}>
        <Ionicons name="heart-outline" size={22} color={colors.primary} />
        <Text style={styles.linkText}>Sản phẩm yêu thích</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>

      <Pressable style={styles.linkRow} onPress={() => router.push('/orders')}>
        <Ionicons name="receipt-outline" size={22} color={colors.primary} />
        <Text style={styles.linkText}>Đơn hàng của tôi</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>

      <Pressable style={styles.linkRow} onPress={() => router.push('/notifications')}>
        <Ionicons name="notifications-outline" size={22} color={colors.primary} />
        <Text style={styles.linkText}>Thông báo của tôi</Text>
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
  genderRow: { flexDirection: 'row', gap: 8 },
  genderChip: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  genderChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderText: { color: colors.text, fontWeight: '600' },
  genderTextActive: { color: colors.white },
  optional: { color: colors.textMuted, fontSize: 12 },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  linkText: { flex: 1, color: colors.text, fontWeight: '600', fontSize: 16 },
  logout: { color: colors.danger, fontWeight: '700', fontSize: 16, textAlign: 'center', padding: 12 },
});
