import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { labelText } from '@/constants/address';
import { addressService } from '@/services/address.service';
import { colors, radius } from '@/theme';
import type { Address } from '@/types/address';
import { getErrorMessage } from '@/utils/error';

export default function AddressListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Address[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setItems(await addressService.list());
    } catch (e) {
      setError(getErrorMessage(e));
      setItems([]);
    }
  }, []);

  // tải lại mỗi khi quay về từ màn hình thêm/sửa
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function makeDefault(a: Address) {
    try {
      await addressService.setDefault(a.addressId);
      await load();
    } catch (e) {
      Alert.alert('Lỗi', getErrorMessage(e));
    }
  }

  function confirmDelete(a: Address) {
    Alert.alert('Xóa địa chỉ', `Bạn muốn xóa địa chỉ của ${a.receiverName}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await addressService.remove(a.addressId);
            await load();
          } catch (e) {
            Alert.alert('Lỗi', getErrorMessage(e));
          }
        },
      },
    ]);
  }

  if (!items) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={items}
        keyExtractor={(a) => String(a.addressId)}
        contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>Bạn chưa có địa chỉ giao hàng nào.</Text>}
        renderItem={({ item: a }) => (
          <View style={[styles.card, a.isDefault && styles.cardDefault]}>
            <View style={styles.row}>
              <Text style={styles.chip}>{labelText(a.label)}</Text>
              {a.isDefault && <Text style={[styles.chip, styles.chipDefault]}>Mặc định</Text>}
            </View>
            <Text style={styles.name}>{a.receiverName} · {a.receiverPhone}</Text>
            <Text style={styles.addr}>{[a.streetDetail, a.ward, a.district, a.province].join(', ')}</Text>
            <View style={styles.actions}>
              {!a.isDefault && (
                <Pressable onPress={() => makeDefault(a)} style={styles.action}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.actionText}>Đặt mặc định</Text>
                </Pressable>
              )}
              <Pressable onPress={() => router.push({ pathname: '/addresses/form', params: { id: String(a.addressId) } })} style={styles.action}>
                <Ionicons name="create-outline" size={18} color={colors.primary} />
                <Text style={styles.actionText}>Sửa</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(a)} style={styles.action}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text style={[styles.actionText, { color: colors.danger }]}>Xóa</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
      <PrimaryButton title="Thêm địa chỉ mới" onPress={() => router.push('/addresses/form')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, textAlign: 'center' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  card: { padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 6 },
  cardDefault: { borderColor: colors.primary },
  row: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.border, color: colors.text, fontSize: 12, fontWeight: '700', overflow: 'hidden' },
  chipDefault: { backgroundColor: colors.primary, color: colors.white },
  name: { fontWeight: '700', color: colors.text, fontSize: 15 },
  addr: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 6, flexWrap: 'wrap' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
});
