import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, radius } from '@/theme';
import { formatVnd } from '@/utils/format';

export default function DeliveryProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/me');
      setProfileData(res.data);
      setLastName(res.data.lastName || res.data.last_name || '');
      setFirstName(res.data.firstName || res.data.first_name || '');
      setEmail(res.data.email || '');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải thông tin hồ sơ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/me', {
        lastName,
        firstName,
        email,
      });
      Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân.');
      fetchProfile();
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể cập nhật thông tin.');
    } finally {
      setSaving(false);
    }
  }

  const handleLogout = async () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/welcome');
            } catch (e) {
              router.replace('/(auth)/welcome');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header Thẻ thông tin nhanh */}
      <View style={styles.headerCard}>
        <View style={styles.avatarBox}>
          <Ionicons name="person" size={32} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{lastName} {firstName}</Text>
          <Text style={styles.userRole}>
            @{profileData?.username || user?.username} ·{' '}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {profileData?.roleName || user?.roleName || 'NV Giao hàng'}
            </Text>
          </Text>
        </View>
      </View>

      {/* Thông tin nhân viên (Hiển thị chi tiết cố định) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin nhân viên</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Mã nhân viên:</Text>
          <Text style={styles.infoValue}>#{profileData?.employeeId || profileData?.employee_id || 'N/A'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Số điện thoại:</Text>
          <Text style={styles.infoValue}>{profileData?.phone || 'Chưa cập nhật'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Giới tính:</Text>
          <Text style={styles.infoValue}>
            {profileData?.gender === 'MALE' ? 'Nam' : profileData?.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Ngày vào làm:</Text>
          <Text style={styles.infoValue}>
            {profileData?.hireDate || profileData?.hire_date
              ? new Date(profileData.hireDate || profileData.hire_date).toLocaleDateString('vi-VN')
              : 'Chưa cập nhật'}
          </Text>
        </View>
        {profileData?.baseSalary !== undefined && profileData?.baseSalary !== null && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Lương cơ bản:</Text>
            <Text style={[styles.infoValue, { color: colors.primaryDark, fontWeight: '800' }]}>
              {formatVnd(profileData.baseSalary)}
            </Text>
          </View>
        )}
      </View>

      {/* Form chỉnh sửa thông tin liên hệ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chỉnh sửa thông tin liên hệ</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Họ và tên đệm</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Nhập họ"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Tên</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Nhập tên"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Nhập email"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.saveText}>Lưu thay đổi</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Nút Đăng xuất hoạt động chính xác */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  container: { padding: 16, paddingTop: 50, backgroundColor: colors.background, flexGrow: 1, gap: 16, paddingBottom: 40 },
  headerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  avatarBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EDFDF5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#B7EBCE' },
  userName: { fontSize: 18, fontWeight: '800', color: colors.text },
  userRole: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 4 },
  infoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.background },
  infoLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  infoValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  logoutBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
});