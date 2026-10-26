import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTextInput } from '@/components/AppTextInput';
import { DatePickerField } from '@/components/DatePickerField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { authService } from '@/services/auth.service';
import { orderService } from '@/services/order.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { colors, radius, shadows } from '@/theme';
import { getErrorMessage } from '@/utils/error';
import { dmyToYmd, optionalValidators, validators as v, ymdToDmy } from '@/utils/validation';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clear, setUserName } = useAuthStore.getState();

  // Profile data
  const [profile, setProfile] = useState<{
    fullName: string;
    lastName: string;
    firstName: string;
    phone: string;
    email: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
    dateOfBirth: string | null;
  } | null>(null);

  // Form states for Edit Profile Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | null>(null);
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Form states for Change Password Modal
  const [showPwModal, setShowPwModal] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  // Order status counts
  const [orderCounts, setOrderCounts] = useState<{
    pending: number;
    shipping: number;
    delivered: number;
    cancelled: number;
  }>({ pending: 0, shipping: 0, delivered: 0, cancelled: 0 });

  function loadProfile() {
    authService
      .getMe()
      .then((me) => {
        setProfile({
          fullName: me.profile.fullName,
          lastName: me.profile.lastName,
          firstName: me.profile.firstName,
          phone: me.profile.phone ?? '',
          email: me.profile.email ?? '',
          gender: me.profile.gender,
          dateOfBirth: me.profile.dateOfBirth,
        });
        setLastName(me.profile.lastName);
        setFirstName(me.profile.firstName);
        setPhone(me.profile.phone ?? '');
        setGender(me.profile.gender);
        setDob(ymdToDmy(me.profile.dateOfBirth));
        setEmail(me.profile.email ?? '');
      })
      .catch((e) => Alert.alert('Lỗi', getErrorMessage(e)));
  }

  useEffect(() => {
    loadProfile();
    // Fetch quick order status count
    orderService
      .listMine({ page: 1, size: 50 })
      .then((res) => {
        let p = 0,
          s = 0,
          d = 0,
          c = 0;
        for (const item of res.items) {
          if (item.orderStatus === 'PENDING' || item.orderStatus === 'CONFIRMED') p++;
          else if (item.orderStatus === 'SHIPPING') s++;
          else if (item.orderStatus === 'DELIVERED') d++;
          else if (item.orderStatus === 'CANCELLED') c++;
        }
        setOrderCounts({ pending: p, shipping: s, delivered: d, cancelled: c });
      })
      .catch(() => {});
  }, []);

  async function saveProfile() {
    const msg =
      v.lastName(lastName) ||
      v.firstName(firstName) ||
      v.phone(phone) ||
      optionalValidators.birthDate(dob) ||
      optionalValidators.email(email);
    if (msg) return Alert.alert('Chưa hợp lệ', msg);
    setSavingProfile(true);
    try {
      const me = await authService.updateMe({
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        phone: phone.trim(),
        gender,
        dateOfBirth: dob.trim() ? dmyToYmd(dob) : null,
        email: email.trim() || null,
      });
      setUserName(me.profile.fullName);
      setProfile({
        fullName: me.profile.fullName,
        lastName: me.profile.lastName,
        firstName: me.profile.firstName,
        phone: me.profile.phone ?? '',
        email: me.profile.email ?? '',
        gender: me.profile.gender,
        dateOfBirth: me.profile.dateOfBirth,
      });
      setShowEditModal(false);
      Alert.alert('Thành công', 'Đã lưu thông tin hồ sơ');
    } catch (e) {
      Alert.alert('Lỗi', getErrorMessage(e));
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    const msg =
      (oldPw ? '' : 'Vui lòng nhập mật khẩu cũ') ||
      v.password(newPw) ||
      v.confirm(confirmPw, newPw);
    if (msg) return Alert.alert('Chưa hợp lệ', msg);
    setSavingPw(true);
    try {
      await authService.changePassword(oldPw, newPw);
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
      setShowPwModal(false);
      Alert.alert('Thành công', 'Đổi mật khẩu tài khoản thành công');
    } catch (e) {
      Alert.alert('Lỗi', getErrorMessage(e));
    } finally {
      setSavingPw(false);
    }
  }

  function handleLogout() {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          useCartStore.getState().reset();
          useFavoriteStore.getState().reset();
          await clear();
        },
      },
    ]);
  }

  const userInitial = profile?.firstName?.charAt(0).toUpperCase() || 'U';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tài khoản</Text>
      </View>

      {/* User Info Hero Card */}
      <View style={styles.userCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userInitial}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark" size={12} color={colors.white} />
          </View>
        </View>

        <Text style={styles.userName}>{profile?.fullName || 'Đang tải...'}</Text>
        <Text style={styles.userPhone}>{profile?.phone || profile?.email || 'Khách hàng thân thiết'}</Text>

        <View style={styles.membershipBadge}>
          <Ionicons name="shield-checkmark" size={14} color={colors.primaryDark} />
          <Text style={styles.membershipText}>Thành viên Bạc · Khách hàng VIP</Text>
        </View>
      </View>

      {/* Order Status Tracker */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Đơn hàng của tôi</Text>
          <TouchableOpacity onPress={() => router.push('/orders')}>
            <Text style={styles.sectionLink}>Xem lịch sử &gt;</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.orderStatusGrid}>
          <TouchableOpacity
            style={styles.statusItem}
            onPress={() => router.push('/orders')}
          >
            <View style={[styles.statusIconBox, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="time-outline" size={24} color="#EA580C" />
              {orderCounts.pending > 0 && (
                <View style={styles.counterBadge}>
                  <Text style={styles.counterBadgeText}>{orderCounts.pending}</Text>
                </View>
              )}
            </View>
            <Text style={styles.statusLabel}>Chờ xử lý</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statusItem}
            onPress={() => router.push('/orders')}
          >
            <View style={[styles.statusIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="car-outline" size={24} color="#2563EB" />
              {orderCounts.shipping > 0 && (
                <View style={styles.counterBadge}>
                  <Text style={styles.counterBadgeText}>{orderCounts.shipping}</Text>
                </View>
              )}
            </View>
            <Text style={styles.statusLabel}>Đang giao</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statusItem}
            onPress={() => router.push('/orders')}
          >
            <View style={[styles.statusIconBox, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="checkmark-done-circle-outline" size={24} color={colors.primaryDark} />
              {orderCounts.delivered > 0 && (
                <View style={[styles.counterBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.counterBadgeText}>{orderCounts.delivered}</Text>
                </View>
              )}
            </View>
            <Text style={styles.statusLabel}>Đã giao</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statusItem}
            onPress={() => router.push('/orders')}
          >
            <View style={[styles.statusIconBox, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="close-circle-outline" size={24} color={colors.danger} />
              {orderCounts.cancelled > 0 && (
                <View style={[styles.counterBadge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.counterBadgeText}>{orderCounts.cancelled}</Text>
                </View>
              )}
            </View>
            <Text style={styles.statusLabel}>Đã hủy</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Action Items */}
      <View style={styles.menuCard}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push('/favorites')}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="heart-outline" size={20} color={colors.danger} />
          </View>
          <Text style={styles.menuText}>Sản phẩm yêu thích</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push('/addresses')}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.menuText}>Sổ địa chỉ nhận hàng</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => setShowEditModal(true)}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#F8FAFC' }]}>
            <Ionicons name="person-outline" size={20} color={colors.text} />
          </View>
          <Text style={styles.menuText}>Cập nhật thông tin cá nhân</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => setShowPwModal(true)}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#F8FAFC' }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.text} />
          </View>
          <Text style={styles.menuText}>Đổi mật khẩu tài khoản</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() =>
            Alert.alert(
              'Ứng dụng Sneaker Store',
              'Phiên bản 1.0.0 (Build 2026)\nỨng dụng mua sắm giày thời trang trực tuyến.',
            )
          }
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#F8FAFC' }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          </View>
          <Text style={styles.menuText}>Thông tin & Cài đặt ứng dụng</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Logout button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
      </TouchableOpacity>

      {/* Modal Cập nhật hồ sơ */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật thông tin</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <AppTextInput
                icon="person-circle-outline"
                placeholder="Họ và tên đệm"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
              <AppTextInput
                icon="person-circle-outline"
                placeholder="Tên"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
              <AppTextInput
                icon="call-outline"
                placeholder="Số điện thoại"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <AppTextInput
                icon="mail-outline"
                placeholder="Email (không bắt buộc)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
              <DatePickerField value={dob} onChange={setDob} placeholder="Ngày sinh (không bắt buộc)" />

              <View style={styles.genderRow}>
                {([['MALE', 'Nam'], ['FEMALE', 'Nữ'], ['OTHER', 'Khác']] as const).map(
                  ([value, text]) => (
                    <Pressable
                      key={value}
                      onPress={() => setGender(gender === value ? null : value)}
                      style={[styles.genderChip, gender === value && styles.genderChipActive]}
                    >
                      <Text style={[styles.genderText, gender === value && styles.genderTextActive]}>
                        {text}
                      </Text>
                    </Pressable>
                  ),
                )}
              </View>

              <PrimaryButton title="Lưu thông tin" onPress={saveProfile} loading={savingProfile} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Đổi mật khẩu */}
      <Modal
        visible={showPwModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPwModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
              <TouchableOpacity onPress={() => setShowPwModal(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <AppTextInput
                icon="lock-closed-outline"
                placeholder="Mật khẩu hiện tại"
                value={oldPw}
                onChangeText={setOldPw}
                secure
              />
              <AppTextInput
                icon="lock-closed-outline"
                placeholder="Mật khẩu mới (8+ ký tự, hoa-thường-số)"
                value={newPw}
                onChangeText={setNewPw}
                secure
              />
              <AppTextInput
                icon="lock-closed-outline"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPw}
                onChangeText={setConfirmPw}
                secure
              />

              <PrimaryButton title="Xác nhận đổi mật khẩu" onPress={changePassword} loading={savingPw} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { paddingHorizontal: 16, gap: 16 },
  header: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...shadows.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...shadows.sm,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 10,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  membershipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  orderStatusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statusIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  counterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EA580C',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  counterBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...shadows.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingVertical: 14,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger,
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalScroll: {
    padding: 20,
    gap: 12,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  genderChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  genderTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
});
