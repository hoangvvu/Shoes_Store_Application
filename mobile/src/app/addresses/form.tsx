import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppTextInput } from '@/components/AppTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ADDRESS_LABELS } from '@/constants/address';
import { addressService } from '@/services/address.service';
import { colors, radius } from '@/theme';
import type { AddressInput, AddressLabel } from '@/types/address';
import { getErrorMessage } from '@/utils/error';
import { validators as v } from '@/utils/validation';

const EMPTY: AddressInput = {
  label: 'HOME',
  receiverName: '',
  receiverPhone: '',
  province: '',
  district: '',
  ward: '',
  streetDetail: '',
};

export default function AddressFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;

  const [f, setF] = useState<AddressInput>(EMPTY);
  const [loading, setLoading] = useState(!!editingId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof AddressInput>(k: K) => (val: AddressInput[K]) => setF((p) => ({ ...p, [k]: val }));

  useEffect(() => {
    if (!editingId) return;
    addressService
      .list()
      .then((list) => {
        const a = list.find((x) => x.addressId === editingId);
        if (a) setF({ label: a.label, receiverName: a.receiverName, receiverPhone: a.receiverPhone, province: a.province, district: a.district, ward: a.ward, streetDetail: a.streetDetail });
        else setError('Không tìm thấy địa chỉ');
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [editingId]);

  async function onSave() {
    setError('');
    const required = (label: string, val: string) => (val.trim() ? '' : `Vui lòng nhập ${label}`);
    const msg =
      required('tên người nhận', f.receiverName) ||
      v.phone(f.receiverPhone) ||
      required('tỉnh/thành phố', f.province) ||
      required('quận/huyện', f.district) ||
      required('phường/xã', f.ward) ||
      required('địa chỉ chi tiết', f.streetDetail);
    if (msg) return setError(msg);

    const payload: AddressInput = Object.fromEntries(Object.entries(f).map(([k, val]) => [k, String(val).trim()])) as unknown as AddressInput;
    setSaving(true);
    try {
      if (editingId) await addressService.update(editingId, payload);
      else await addressService.create(payload);
      router.back();
    } catch (e) {
      Alert.alert('Lỗi', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: editingId ? 'Sửa địa chỉ' : 'Thêm địa chỉ' }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Loại địa chỉ</Text>
        <View style={styles.labels}>
          {ADDRESS_LABELS.map((l) => (
            <Pressable key={l.value} onPress={() => set('label')(l.value as AddressLabel)} style={[styles.pill, f.label === l.value && styles.pillActive]}>
              <Text style={[styles.pillText, f.label === l.value && styles.pillTextActive]}>{l.text}</Text>
            </Pressable>
          ))}
        </View>

        <AppTextInput icon="person-outline" placeholder="Tên người nhận" value={f.receiverName} onChangeText={set('receiverName')} autoCapitalize="words" />
        <AppTextInput icon="call-outline" placeholder="Số điện thoại người nhận" value={f.receiverPhone} onChangeText={set('receiverPhone')} keyboardType="phone-pad" />
        <AppTextInput icon="map-outline" placeholder="Tỉnh / Thành phố" value={f.province} onChangeText={set('province')} autoCapitalize="words" />
        <AppTextInput icon="location-outline" placeholder="Quận / Huyện" value={f.district} onChangeText={set('district')} autoCapitalize="words" />
        <AppTextInput icon="navigate-outline" placeholder="Phường / Xã" value={f.ward} onChangeText={set('ward')} autoCapitalize="words" />
        <AppTextInput icon="home-outline" placeholder="Số nhà, tên đường…" value={f.streetDetail} onChangeText={set('streetDetail')} autoCapitalize="sentences" />

        {!editingId && <Text style={styles.hint}>Địa chỉ đầu tiên sẽ tự động là địa chỉ mặc định.</Text>}
        {!!error && <Text style={styles.error}>{error}</Text>}
        <PrimaryButton title={editingId ? 'Lưu thay đổi' : 'Lưu địa chỉ'} onPress={onSave} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { fontWeight: '700', color: colors.text, fontSize: 15 },
  labels: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.text, fontWeight: '600' },
  pillTextActive: { color: colors.white },
  hint: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.danger, textAlign: 'center' },
});
