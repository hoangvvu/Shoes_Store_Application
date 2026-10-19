import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PAYMENT_METHODS } from '@/constants/order';
import {
  METHOD_DISPLAY,
  PAYMENT_TX_COLOR,
  PAYMENT_TX_LABEL,
  REFUND_STATUS_COLOR,
  REFUND_STATUS_LABEL,
} from '@/constants/payment';
import { paymentService } from '@/services/payment.service';
import { colors, radius } from '@/theme';
import type { Payment, PaymentMethod, PaymentStatus, PaymentStatusResult, Refund } from '@/types/payment';
import { formatDateTime } from '@/utils/datetime';
import { getErrorMessage } from '@/utils/error';
import { formatVnd } from '@/utils/format';

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status, type }: { status: string; type: 'payment' | 'refund' }) {
  const map = type === 'payment' ? PAYMENT_TX_COLOR : REFUND_STATUS_COLOR;
  const labelMap = type === 'payment' ? PAYMENT_TX_LABEL : REFUND_STATUS_LABEL;
  const color = (map as Record<string, { bg: string; fg: string }>)[status] ?? { bg: '#eee', fg: '#333' };
  return (
    <View style={[styles.pill, { backgroundColor: color.bg }]}>
      <Text style={[styles.pillText, { color: color.fg }]}>
        {(labelMap as Record<string, string>)[status] ?? status}
      </Text>
    </View>
  );
}

function PaymentCard({ payment, onRetry }: { payment: Payment; onRetry: () => void }) {
  const isPending = payment.status === 'PENDING';
  const isFailed = payment.status === 'FAILED';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{payment.methodName}</Text>
          <Text style={styles.cardSub}>{METHOD_DISPLAY[payment.methodCode] ?? payment.methodCode}</Text>
        </View>
        <StatusPill status={payment.status} type="payment" />
      </View>

      {/* Amount */}
      <View style={[styles.row, { marginTop: 8 }]}>
        <Text style={styles.muted}>Số tiền</Text>
        <Text style={styles.amount}>{formatVnd(payment.amount)}</Text>
      </View>

      {/* Transaction code */}
      {!!payment.transactionCode && (
        <View style={styles.row}>
          <Text style={styles.muted}>Mã giao dịch</Text>
          <Text style={styles.bold}>{payment.transactionCode}</Text>
        </View>
      )}

      {/* Paid at */}
      {!!payment.paidAt && (
        <View style={styles.row}>
          <Text style={styles.muted}>Thời gian thanh toán</Text>
          <Text style={styles.bold}>{formatDateTime(payment.paidAt)}</Text>
        </View>
      )}

      {/* Proof image link */}
      {!!payment.proofUrl && (
        <TouchableOpacity onPress={() => Linking.openURL(payment.proofUrl!)} style={styles.proofLink}>
          <Ionicons name="image-outline" size={16} color={colors.primary} />
          <Text style={styles.proofText}>Xem ảnh chứng từ</Text>
        </TouchableOpacity>
      )}

      {/* Note */}
      {!!payment.note && (
        <View style={styles.noteBox}>
          <Text style={styles.muted}>Ghi chú: {payment.note}</Text>
        </View>
      )}

      {/* Created at */}
      <Text style={[styles.muted, { fontSize: 12, marginTop: 4 }]}>
        Tạo lúc: {formatDateTime(payment.createdAt)}
      </Text>

      {/* Retry button */}
      {isFailed && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={16} color={colors.white} />
          <Text style={styles.retryText}>Thanh toán lại</Text>
        </TouchableOpacity>
      )}

      {isPending && (
        <View style={styles.pendingNote}>
          <Ionicons name="time-outline" size={14} color="#B26A00" />
          <Text style={styles.pendingText}>Đang chờ xác nhận. Giao dịch sẽ hết hạn sau 30 phút.</Text>
        </View>
      )}
    </View>
  );
}

function RefundCard({ refund }: { refund: Refund }) {
  return (
    <View style={[styles.card, styles.refundCard]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Hoàn tiền #{refund.refundId}</Text>
        </View>
        <StatusPill status={refund.status} type="refund" />
      </View>
      <View style={[styles.row, { marginTop: 8 }]}>
        <Text style={styles.muted}>Số tiền hoàn</Text>
        <Text style={[styles.amount, { color: '#168A4F' }]}>{formatVnd(refund.amount)}</Text>
      </View>
      <Text style={styles.muted} numberOfLines={3}>Lý do: {refund.reason}</Text>
      {!!refund.transactionCode && (
        <View style={styles.row}>
          <Text style={styles.muted}>Mã hoàn</Text>
          <Text style={styles.bold}>{refund.transactionCode}</Text>
        </View>
      )}
      {!!refund.processedAt && (
        <Text style={[styles.muted, { fontSize: 12 }]}>
          Xử lý: {formatDateTime(refund.processedAt)}
        </Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PaymentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const router = useRouter();

  const [data, setData] = useState<PaymentStatusResult | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [status, methodList] = await Promise.all([
        paymentService.getPaymentStatus(orderId),
        paymentService.listMethods(),
      ]);
      setData(status);
      setMethods(methodList);
      setError('');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function handleRetry(failedPayment: Payment) {
    // Chọn phương thức thanh toán
    const choices = methods.map((m) => ({
      text: m.methodName,
      onPress: () => doRetry(failedPayment, m.methodCode),
    }));

    Alert.alert(
      'Chọn phương thức thanh toán',
      `Thanh toán lại cho đơn #${orderId}`,
      [
        ...choices,
        { text: 'Hủy', style: 'cancel' },
      ],
    );
  }

  async function doRetry(failedPayment: Payment, methodCode: string) {
    setBusy(true);
    try {
      const result = await paymentService.retryPay(orderId, methodCode);
      Alert.alert(
        'Tạo giao dịch thành công',
        `Giao dịch #${result.paymentId} đang chờ xác nhận.\nSố tiền: ${formatVnd(result.amount)}`,
        [{ text: 'OK', onPress: () => void load() }],
      );
    } catch (e) {
      Alert.alert('Lỗi', getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
          <Ionicons name="refresh-outline" size={16} color={colors.white} />
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.muted, { marginTop: 12 }]}>Đang tải thông tin thanh toán...</Text>
      </View>
    );
  }

  const hasPending = data.payments.some((p) => p.status === 'PENDING');
  const isPaid = data.payments.some((p) => p.status === 'SUCCESS');

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      {/* Header */}
      <View style={styles.headerBox}>
        <View style={styles.headerIcon}>
          <Ionicons
            name={isPaid ? 'checkmark-circle' : hasPending ? 'time' : 'close-circle'}
            size={36}
            color={isPaid ? '#168A4F' : hasPending ? '#B26A00' : colors.danger}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Đơn #{orderId}</Text>
          <Text style={styles.headerSub}>
            {isPaid
              ? 'Đã thanh toán'
              : hasPending
              ? 'Đang chờ xác nhận'
              : 'Chưa/không thanh toán được'}
          </Text>
        </View>
      </View>

      {/* Payments */}
      {data.payments.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Giao dịch thanh toán</Text>
          {data.payments.map((p) => (
            <PaymentCard
              key={p.paymentId}
              payment={p}
              onRetry={() => handleRetry(p)}
            />
          ))}
        </>
      ) : (
        <View style={styles.emptyBox}>
          <Ionicons name="wallet-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>Chưa có giao dịch thanh toán nào</Text>
        </View>
      )}

      {/* Refunds */}
      {data.refunds.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Hoàn tiền</Text>
          {data.refunds.map((r) => (
            <RefundCard key={r.refundId} refund={r} />
          ))}
        </>
      )}

      {/* Info box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
        <Text style={styles.infoText}>
          Nếu gặp vấn đề về thanh toán, vui lòng liên hệ cửa hàng để được hỗ trợ.
        </Text>
      </View>

      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={18} color={colors.primary} />
        <Text style={styles.backText}>Quay lại đơn hàng</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  errorText: { color: colors.danger, textAlign: 'center', marginTop: 12, fontSize: 15 },

  // Header
  headerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: 14, color: colors.textMuted, marginTop: 2 },

  // Section
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 4 },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  refundCard: { borderColor: '#A0D8B3', backgroundColor: '#F4FBF7' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  // Content
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  muted: { color: colors.textMuted, fontSize: 14, flex: 1, flexWrap: 'wrap' },
  bold: { color: colors.text, fontWeight: '600', fontSize: 14 },
  amount: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },

  // Pill
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  pillText: { fontSize: 12, fontWeight: '700' },

  // Proof
  proofLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  proofText: { color: colors.primary, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },

  // Note
  noteBox: { backgroundColor: colors.background, borderRadius: 6, padding: 10, borderWidth: 1, borderColor: colors.border },

  // Pending notice
  pendingNote: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: '#FFF8E8', borderRadius: 8, padding: 10, marginTop: 6, borderWidth: 1, borderColor: '#FFD84D' },
  pendingText: { color: '#B26A00', fontSize: 13, flex: 1 },

  // Retry button
  retryBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDark, borderRadius: radius.md, padding: 12, marginTop: 8 },
  retryText: { color: colors.white, fontWeight: '700', fontSize: 15 },

  // Empty
  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 32, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  emptyText: { color: colors.textMuted, fontSize: 15 },

  // Info
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#EBF8F8', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: 'flex-start' },
  infoText: { color: colors.primaryDark, fontSize: 13, flex: 1 },

  // Back
  backBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
});
