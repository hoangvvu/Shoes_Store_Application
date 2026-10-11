import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PAYMENT_METHODS } from '@/constants/order';
import { addressService } from '@/services/address.service';
import { orderService } from '@/services/order.service';
import { useCartStore } from '@/store/useCartStore';
import { colors, radius } from '@/theme';
import type { Address } from '@/types/address';
import type { OrderPreview } from '@/types/order';
import { getErrorMessage } from '@/utils/error';
import { formatVnd } from '@/utils/format';

export default function CheckoutScreen() {
  const router = useRouter();
  const [preview, setPreview] = useState<OrderPreview | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [method, setMethod] = useState<string>('CASH');
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [placing, setPlacing] = useState(false);

  const loadPreview = useCallback(async (voucher: string) => {
    setPreview(await orderService.preview(voucher));
  }, []);

  // tải lại mỗi khi quay về từ màn hình thêm địa chỉ
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const [p, list] = await Promise.all([orderService.preview(appliedVoucher), addressService.list()]);
          if (!active) return;
          setPreview(p);
          setAddresses(list);
          setAddressId((cur) => (cur && list.some((a) => a.addressId === cur) ? cur : (list.find((a) => a.isDefault) ?? list[0])?.addressId ?? null));
        } catch (e) {
          if (active) Alert.alert('Lỗi', getErrorMessage(e));
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  async function applyVoucher() {
    const code = voucherInput.trim();
    setApplying(true);
    try {
      setAppliedVoucher(code);
      await loadPreview(code);
    } catch (e) {
      Alert.alert('Lỗi', getErrorMessage(e));
    } finally {
      setApplying(false);
    }
  }

  const voucherBad = preview?.voucher && (preview.voucher.status === 'NOT_FOUND' || preview.voucher.status === 'EXHAUSTED');
  const canPlace = !!preview?.canPlaceOrder && !!addressId && !voucherBad;

  async function placeOrder() {
    if (!addressId) return Alert.alert('Thiếu địa chỉ', 'Vui lòng chọn địa chỉ giao hàng');
    setPlacing(true);
    try {
      const order = await orderService.create({
        addressId,
        methodCode: method,
        voucherCode: appliedVoucher || undefined,
        note: note.trim() || undefined,
      });
      useCartStore.getState().reset(); // giỏ đã được đóng ở server
      Alert.alert('Đặt hàng thành công', `Mã đơn #${order.invoiceId}. Cửa hàng sẽ sớm xác nhận đơn của bạn.`);
      router.replace({ pathname: '/orders/[id]', params: { id: String(order.invoiceId) } });
    } catch (e) {
      Alert.alert('Không thể đặt hàng', getErrorMessage(e));
      void useCartStore.getState().refresh().catch(() => undefined);
    } finally {
      setPlacing(false);
    }
  }

  if (loading || !preview) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={headerOptions} />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const warnings = preview.issues.filter((i) => i.availability !== 'UNAVAILABLE');
  const dropped = preview.issues.filter((i) => i.availability === 'UNAVAILABLE');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={headerOptions} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {preview.items.length === 0 && <Text style={styles.error}>Giỏ hàng không có sản phẩm hợp lệ.</Text>}
        {warnings.map((i) => (
          <Text key={i.variantId} style={styles.error}>• {i.productName}: {i.message}</Text>
        ))}
        {dropped.length > 0 && <Text style={styles.muted}>{dropped.length} sản phẩm ngừng kinh doanh sẽ được bỏ khỏi đơn.</Text>}

        <Text style={styles.h2}>Địa chỉ giao hàng</Text>
        {addresses.length === 0 ? (
          <Pressable style={styles.addBox} onPress={() => router.push('/addresses/form')}>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.link}>Thêm địa chỉ giao hàng</Text>
          </Pressable>
        ) : (
          <>
            {addresses.map((a) => (
              <Pressable key={a.addressId} style={[styles.option, addressId === a.addressId && styles.optionActive]} onPress={() => setAddressId(a.addressId)}>
                <Ionicons name={addressId === a.addressId ? 'radio-button-on' : 'radio-button-off'} size={22} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bold}>{a.receiverName} · {a.receiverPhone}</Text>
                  <Text style={styles.muted}>{[a.streetDetail, a.ward, a.district, a.province].join(', ')}</Text>
                </View>
              </Pressable>
            ))}
            <Pressable onPress={() => router.push('/addresses')}><Text style={styles.link}>Quản lý địa chỉ</Text></Pressable>
          </>
        )}

        <Text style={styles.h2}>Phương thức thanh toán</Text>
        {PAYMENT_METHODS.map((m) => (
          <Pressable key={m.code} style={[styles.option, method === m.code && styles.optionActive]} onPress={() => setMethod(m.code)}>
            <Ionicons name={method === m.code ? 'radio-button-on' : 'radio-button-off'} size={22} color={colors.primary} />
            <Ionicons name={m.icon} size={20} color={colors.textMuted} />
            <Text style={[styles.bold, { flex: 1 }]}>{m.text}</Text>
          </Pressable>
        ))}

        <Text style={styles.h2}>Mã giảm giá</Text>
        <View style={styles.voucherRow}>
          <TextInput style={styles.input} placeholder="Nhập mã voucher" placeholderTextColor={colors.textMuted} autoCapitalize="characters" value={voucherInput} onChangeText={setVoucherInput} />
          <Pressable style={styles.applyBtn} onPress={applyVoucher} disabled={applying}>
            {applying ? <ActivityIndicator color={colors.white} /> : <Text style={styles.applyText}>Áp dụng</Text>}
          </Pressable>
        </View>
        {!!preview.voucher && preview.voucher.status !== 'NONE' && (
          <Text style={voucherBad ? styles.error : styles.ok}>{preview.voucher.message}</Text>
        )}

        <Text style={styles.h2}>Ghi chú</Text>
        <TextInput style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} placeholder="Ghi chú cho cửa hàng (không bắt buộc)" placeholderTextColor={colors.textMuted} value={note} onChangeText={setNote} multiline maxLength={500} />

        <Text style={styles.h2}>Đơn hàng ({preview.items.length} sản phẩm)</Text>
        {preview.items.map((i) => (
          <View key={i.variantId} style={styles.lineRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bold} numberOfLines={2}>{i.productName}</Text>
              <Text style={styles.muted}>Size {i.sizeLabel} · {i.colorName} · SL {i.quantity}</Text>
              {i.discountPercent > 0 && <Text style={styles.ok}>Giảm {i.discountPercent}%</Text>}
            </View>
            <Text style={styles.bold}>{formatVnd(i.lineTotal)}</Text>
          </View>
        ))}
        <View style={styles.totals}>
          <Row label="Tổng tiền hàng" value={formatVnd(preview.totalAmount)} />
          <Row label={`Giảm giá hóa đơn${preview.invoiceDiscountPercent ? ` (${preview.invoiceDiscountPercent}%)` : ''}`} value={`-${formatVnd(preview.discountAmount)}`} />
          <Row label="Phải trả" value={formatVnd(preview.amountPayable)} big />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title={`Đặt hàng · ${formatVnd(preview.amountPayable)}`} onPress={placeOrder} loading={placing} disabled={!canPlace} />
      </View>
    </View>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.muted, big && styles.bigLabel]}>{label}</Text>
      <Text style={[styles.bold, big && styles.bigValue]}>{value}</Text>
    </View>
  );
}

const headerOptions = {
  headerShown: true,
  title: 'Đặt hàng',
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '700' as const },
  headerBackTitle: 'Giỏ hàng',
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 10, paddingBottom: 24 },
  h2: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 10 },
  bold: { color: colors.text, fontWeight: '700', fontSize: 15 },
  muted: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  ok: { color: '#168A4F', fontSize: 13, fontWeight: '600' },
  link: { color: colors.primary, fontWeight: '700' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  optionActive: { borderColor: colors.primary },
  addBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary },
  voucherRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 12, color: colors.text, fontSize: 15 },
  applyBtn: { paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: colors.primary, justifyContent: 'center', minWidth: 90, alignItems: 'center' },
  applyText: { color: colors.white, fontWeight: '700' },
  lineRow: { flexDirection: 'row', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  totals: { gap: 6, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bigLabel: { color: colors.text, fontSize: 17, fontWeight: '800' },
  bigValue: { color: colors.primaryDark, fontSize: 20, fontWeight: '800' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
});
