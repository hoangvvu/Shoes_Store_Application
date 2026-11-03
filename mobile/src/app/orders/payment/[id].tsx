import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  METHOD_DISPLAY,
  PAYMENT_TX_COLOR,
  PAYMENT_TX_LABEL,
  REFUND_STATUS_COLOR,
  REFUND_STATUS_LABEL,
} from '@/constants/payment';
import { orderService } from '@/services/order.service';
import { paymentService } from '@/services/payment.service';
import { useCartStore } from '@/store/useCartStore';
import { colors, radius, shadows } from '@/theme';
import type { CreateOrderPayload } from '@/types/order';
import type { Payment, PaymentMethod, PaymentStatusResult, Refund } from '@/types/payment';
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

// ─── Simplified QR Payment Card (Chỉ hiển thị mã QR và số tiền chuyển khoản) ──

function QrPaymentCard({
  payment,
  orderId,
  onSimulate,
}: {
  payment: Payment;
  orderId: number | null;
  draftMode?: boolean;
  onSimulate: () => Promise<void>;
  onRetry: () => void;
}) {
  const [qrLoaded, setQrLoaded] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const bankId = payment.methodCode === 'MOMO' ? '970422' : '970403';
  const accountNo = '060279584557';
  const transferContent = orderId ? `SHOESTORE HD${orderId}` : 'SHOESTORE THANHTOAN';

  const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${payment.amount}&addInfo=${encodeURIComponent(
    transferContent,
  )}`;

  async function handleQrTap() {
    if (simulating) return;
    setSimulating(true);
    try {
      await onSimulate();
    } finally {
      setSimulating(false);
    }
  }

  return (
    <View style={styles.bankPortalCard}>
      {/* Mã QR */}
      <TouchableOpacity
        style={styles.qrImageContainer}
        activeOpacity={0.9}
        onPress={handleQrTap}
        disabled={simulating}
      >
        <View style={[styles.cornerGuide, styles.cornerTL]} />
        <View style={[styles.cornerGuide, styles.cornerTR]} />
        <View style={[styles.cornerGuide, styles.cornerBL]} />
        <View style={[styles.cornerGuide, styles.cornerBR]} />

        {(!qrLoaded || simulating) && (
          <View style={styles.qrLoadingBox}>
            <ActivityIndicator size="large" color="#003B70" />
            <Text style={styles.qrLoadingText}>
              {simulating ? 'Đang xử lý...' : 'Đang tạo mã QR...'}
            </Text>
          </View>
        )}

        <Image
          source={{ uri: qrUrl }}
          style={styles.qrImage}
          resizeMode="contain"
          onLoadEnd={() => setQrLoaded(true)}
        />
      </TouchableOpacity>

      {/* Số tiền chuyển khoản */}
      <View style={styles.amountBox}>
        <Text style={styles.amountSubLabel}>SỐ TIỀN CHUYỂN KHOẢN</Text>
        <Text style={styles.amountBigText}>{formatVnd(payment.amount)}</Text>
      </View>
    </View>
  );
}

function PaymentSuccessView({
  orderId,
  payment,
  onGoOrder,
  onGoHome,
}: {
  orderId: number;
  payment: Payment;
  onGoOrder: () => void;
  onGoHome: () => void;
}) {
  return (
    <View style={styles.successCard}>
      <View style={styles.successRingOuter}>
        <View style={styles.successRingMiddle}>
          <View style={styles.successRingInner}>
            <Ionicons name="checkmark" size={38} color={colors.white} />
          </View>
        </View>
      </View>

      <Text style={styles.successTitle}>Chuyển khoản thành công!</Text>
      <Text style={styles.successSub}>
        Giao dịch thanh toán đơn hàng #{orderId} đã được xác nhận hoàn tất. Cửa hàng sẽ chuẩn bị và giao sản phẩm đến bạn sớm nhất.
      </Text>

      <View style={styles.receiptCard}>
        <View style={styles.receiptTopRow}>
          <View style={styles.receiptPill}>
            <Ionicons name="receipt-outline" size={13} color="#003B70" />
            <Text style={styles.receiptPillText}>BIÊN LAI ĐIỆN TỬ</Text>
          </View>
          <View style={styles.receiptStatusPill}>
            <View style={styles.receiptStatusDot} />
            <Text style={styles.receiptStatusText}>THÀNH CÔNG</Text>
          </View>
        </View>

        <View style={styles.receiptAmountBox}>
          <Text style={styles.receiptAmountLabel}>Số tiền đã thanh toán</Text>
          <Text style={styles.receiptAmountVal}>{formatVnd(payment.amount)}</Text>
        </View>

        <View style={styles.receiptDividerDashed} />

        <View style={styles.receiptRowsWrap}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptRowLabel}>Mã đơn hàng</Text>
            <Text style={styles.receiptRowValueBold}>#{orderId}</Text>
          </View>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptRowLabel}>Phương thức thanh toán</Text>
            <Text style={styles.receiptRowValue}>{payment.methodName}</Text>
          </View>

          {!!payment.transactionCode && (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptRowLabel}>Mã giao dịch</Text>
              <Text style={styles.receiptRowValueCode}>{payment.transactionCode}</Text>
            </View>
          )}

          <View style={styles.receiptRow}>
            <Text style={styles.receiptRowLabel}>Thời gian thanh toán</Text>
            <Text style={styles.receiptRowValue}>
              {formatDateTime(payment.paidAt || payment.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.primarySuccessBtn} onPress={onGoOrder} activeOpacity={0.88}>
        <Ionicons name="document-text-outline" size={18} color={colors.white} />
        <Text style={styles.primarySuccessBtnText}>Xem chi tiết đơn hàng #{orderId}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.outlineSuccessBtn} onPress={onGoHome} activeOpacity={0.8}>
        <Ionicons name="home-outline" size={18} color={colors.primary} />
        <Text style={styles.outlineSuccessBtnText}>Tiếp tục mua sắm</Text>
      </TouchableOpacity>
    </View>
  );
}

function PaymentCard({ payment, onRetry }: { payment: Payment; onRetry: () => void }) {
  const isPending = payment.status === 'PENDING';
  const isFailed = payment.status === 'FAILED';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{payment.methodName}</Text>
          <Text style={styles.cardSub}>{METHOD_DISPLAY[payment.methodCode] ?? payment.methodCode}</Text>
        </View>
        <StatusPill status={payment.status} type="payment" />
      </View>

      <View style={[styles.row, { marginTop: 8 }]}>
        <Text style={styles.muted}>Số tiền</Text>
        <Text style={styles.amount}>{formatVnd(payment.amount)}</Text>
      </View>

      {!!payment.transactionCode && (
        <View style={styles.row}>
          <Text style={styles.muted}>Mã giao dịch</Text>
          <Text style={styles.bold}>{payment.transactionCode}</Text>
        </View>
      )}

      {!!payment.paidAt && (
        <View style={styles.row}>
          <Text style={styles.muted}>Thời gian thanh toán</Text>
          <Text style={styles.bold}>{formatDateTime(payment.paidAt)}</Text>
        </View>
      )}

      {!!payment.proofUrl && (
        <TouchableOpacity onPress={() => Linking.openURL(payment.proofUrl!)} style={styles.proofLink}>
          <Ionicons name="image-outline" size={16} color={colors.primary} />
          <Text style={styles.proofText}>Xem ảnh chứng từ</Text>
        </TouchableOpacity>
      )}

      {!!payment.note && (
        <View style={styles.noteBox}>
          <Text style={styles.muted}>Ghi chú: {payment.note}</Text>
        </View>
      )}

      <Text style={[styles.muted, { fontSize: 12, marginTop: 4 }]}>
        Tạo lúc: {formatDateTime(payment.createdAt)}
      </Text>

      {isFailed && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={16} color={colors.white} />
          <Text style={styles.retryText}>Thanh toán lại</Text>
        </TouchableOpacity>
      )}

      {isPending && (
        <View style={styles.pendingNote}>
          <Ionicons name="time-outline" size={14} color="#B26A00" />
          <Text style={styles.pendingText}>Đang chờ xác nhận thanh toán.</Text>
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
  const { id, addressId, methodCode, amount, voucherCode, note } = useLocalSearchParams<{
    id: string;
    addressId?: string;
    methodCode?: string;
    amount?: string;
    voucherCode?: string;
    note?: string;
  }>();
  const isDraft = id === 'draft';
  const orderId = Number(id);
  const router = useRouter();

  const [data, setData] = useState<PaymentStatusResult | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [error, setError] = useState('');
  const [draftCreatedAt, setDraftCreatedAt] = useState(() => new Date().toISOString());

  const draft = useMemo(() => {
    const parsedAddressId = Number(addressId);
    const parsedAmount = Number(amount);
    if (
      !isDraft
      || !Number.isSafeInteger(parsedAddressId)
      || parsedAddressId < 1
      || !methodCode
      || !Number.isFinite(parsedAmount)
      || parsedAmount <= 0
    ) {
      return null;
    }

    const payload: CreateOrderPayload = {
      addressId: parsedAddressId,
      methodCode,
      ...(voucherCode ? { voucherCode } : {}),
      ...(note ? { note } : {}),
    };
    return { payload, amount: parsedAmount };
  }, [addressId, amount, isDraft, methodCode, note, voucherCode]);

  const draftPayment = useMemo<Payment | null>(() => {
    if (!draft) return null;
    return {
      paymentId: 0,
      invoiceId: 0,
      methodCode: draft.payload.methodCode,
      methodName: METHOD_DISPLAY[draft.payload.methodCode] ?? draft.payload.methodCode,
      amount: draft.amount,
      status: 'PENDING',
      transactionCode: null,
      proofUrl: null,
      note: null,
      paidAt: null,
      createdAt: draftCreatedAt,
    };
  }, [draft, draftCreatedAt]);

  const load = useCallback(async () => {
    if (isDraft) return;
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
  }, [isDraft, orderId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Polling tự động mỗi 2.5s khi có giao dịch PENDING
  useEffect(() => {
    const hasPending = data?.payments.some((p) => p.status === 'PENDING');
    if (!hasPending) return;

    const interval = setInterval(async () => {
      try {
        const latest = await paymentService.getPaymentStatus(orderId);
        setData(latest);
        if (latest.payments.some((p) => p.status === 'SUCCESS')) {
          clearInterval(interval);
        }
      } catch {
        // Tạm thời bỏ qua nếu mất kết nối thoáng qua
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [orderId, data?.payments]);

  function handleRetry(failedPayment: Payment) {
    const choices = methods.map((m) => ({
      text: m.methodName,
      onPress: () => void doRetry(failedPayment, m.methodCode),
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
    try {
      const result = await paymentService.retryPay(orderId, methodCode);
      Alert.alert(
        'Tạo giao dịch thành công',
        `Giao dịch #${result.paymentId} đang chờ xác nhận.\nSố tiền: ${formatVnd(result.amount)}`,
        [{ text: 'OK', onPress: () => void load() }],
      );
    } catch (e) {
      Alert.alert('Lỗi', getErrorMessage(e));
    }
  }

  async function handleSimulate(paymentId: number, amount: number) {
    try {
      await paymentService.simulateSuccess(paymentId, amount);
      void load();
    } catch (e) {
      Alert.alert('Lỗi', getErrorMessage(e));
    }
  }

  async function handleDraftSimulate() {
    if (!draft) return;
    try {
      const latestPreview = await orderService.preview(draft.payload.voucherCode);
      if (!latestPreview.canPlaceOrder || latestPreview.amountPayable !== draft.amount) {
        Alert.alert(
          'Đơn hàng đã thay đổi',
          'Giá hoặc tình trạng sản phẩm đã thay đổi. Vui lòng kiểm tra lại đơn hàng trước khi thanh toán.',
          [{ text: 'Quay lại đặt hàng', onPress: () => router.back() }],
        );
        return;
      }

      const order = await orderService.create(draft.payload);
      useCartStore.getState().reset();
      const payment = order.payments.find(
        (item) => item.methodCode === draft.payload.methodCode && item.status === 'PENDING',
      );
      if (!payment) {
        router.replace(`/orders/${order.invoiceId}`);
        return;
      }

      try {
        await paymentService.simulateSuccess(payment.paymentId, payment.amount);
        router.replace(`/orders/payment/${order.invoiceId}`);
      } catch {
        router.replace(`/orders/payment/${order.invoiceId}`);
      }
    } catch (e) {
      Alert.alert('Không thể đặt hàng', getErrorMessage(e));
    }
  }

  function handleCancelOrder() {
    Alert.alert(
      'Hủy đơn hàng?',
      'Đơn hàng sẽ bị hủy và sản phẩm sẽ quay lại giỏ hàng của bạn.',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy đơn',
          style: 'destructive',
          onPress: async () => {
            try {
              await orderService.cancel(orderId);
              router.replace('/(tabs)/cart');
            } catch (e) {
              Alert.alert('Lỗi', getErrorMessage(e));
            }
          },
        },
      ],
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (isDraft) {
    if (!draft || !draftPayment) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>Thông tin thanh toán không hợp lệ. Vui lòng quay lại đặt hàng.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={18} color={colors.primary} />
            <Text style={styles.backText}>Quay lại đặt hàng</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
      >
        <QrPaymentCard
          key={draftCreatedAt}
          payment={draftPayment}
          orderId={null}
          draftMode
          onSimulate={handleDraftSimulate}
          onRetry={() => setDraftCreatedAt(new Date().toISOString())}
        />
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={18} color={colors.primary} />
          <Text style={styles.backText}>Quay lại đặt hàng</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

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

  const successPayment = data.payments.find((p) => p.status === 'SUCCESS');
  const pendingPayment = data.payments.find((p) => p.status === 'PENDING');
  const isPaid = !!successPayment;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      {isPaid && successPayment ? (
        <PaymentSuccessView
          orderId={orderId}
          payment={successPayment}
          onGoOrder={() => router.replace(`/orders/${orderId}`)}
          onGoHome={() => router.replace('/(tabs)')}
        />
      ) : pendingPayment ? (
        pendingPayment.methodCode === 'CASH' || pendingPayment.methodCode === 'COD' ? (
          <View style={styles.cashCard}>
            <View style={styles.cashIconOuter}>
              <Ionicons name="cash-outline" size={36} color="#B26A00" />
            </View>
            <Text style={styles.cashTitle}>Thanh toán tiền mặt khi nhận hàng (COD)</Text>
            <Text style={styles.cashSub}>
              Đơn hàng của bạn sẽ được thanh toán trực tiếp cho nhân viên giao hàng khi nhận sản phẩm.
            </Text>
            <View style={styles.cashAmountBox}>
              <Text style={styles.muted}>Số tiền cần thanh toán khi nhận:</Text>
              <Text style={styles.cashAmountText}>{formatVnd(pendingPayment.amount)}</Text>
            </View>
            <TouchableOpacity
              style={styles.cashPrimaryBtn}
              onPress={() => router.replace(`/orders/${orderId}`)}
            >
              <Ionicons name="receipt-outline" size={18} color={colors.white} />
              <Text style={styles.cashPrimaryBtnText}>Xem chi tiết đơn hàng #{orderId}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <QrPaymentCard
              payment={pendingPayment}
              orderId={orderId}
              onSimulate={() => handleSimulate(pendingPayment.paymentId, pendingPayment.amount)}
              onRetry={() => handleRetry(pendingPayment)}
            />
            <TouchableOpacity
              style={styles.cashPrimaryBtn}
              onPress={() => router.replace(`/orders/${orderId}`)}
            >
              <Ionicons name="receipt-outline" size={18} color={colors.white} />
              <Text style={styles.cashPrimaryBtnText}>Xem chi tiết đơn hàng #{orderId}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelOrderBtn} onPress={handleCancelOrder}>
              <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.cancelOrderText}>Hủy đơn và quay lại giỏ hàng</Text>
            </TouchableOpacity>
          </>
        )
      ) : (
        <View style={styles.headerBox}>
          <View style={styles.headerIcon}>
            <Ionicons
              name={pendingPayment ? 'time' : 'close-circle'}
              size={36}
              color={pendingPayment ? '#B26A00' : colors.danger}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Đơn #{orderId}</Text>
            <Text style={styles.headerSub}>
              {pendingPayment ? 'Đang chờ xác nhận thanh toán' : 'Chưa/không thanh toán được'}
            </Text>
          </View>
        </View>
      )}

      {/* Payment History List */}
      <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
      {data.payments.length > 0 ? (
        data.payments.map((p) => (
          <PaymentCard
            key={p.paymentId}
            payment={p}
            onRetry={() => handleRetry(p)}
          />
        ))
      ) : (
        <View style={styles.emptyBox}>
          <Ionicons name="wallet-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>Chưa có giao dịch thanh toán nào</Text>
        </View>
      )}

      {/* Refunds List */}
      {data.refunds.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Hoàn tiền</Text>
          {data.refunds.map((r) => (
            <RefundCard key={r.refundId} refund={r} />
          ))}
        </>
      )}

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
  container: { padding: 16, gap: 14, paddingBottom: 40 },
  errorText: { color: colors.danger, textAlign: 'center', marginTop: 12, fontSize: 15 },

  // Header Box
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
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: 14, color: colors.textMuted, marginTop: 2 },

  // ─── Simplified QR Portal Card ───
  bankPortalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
    ...shadows.md,
  },
  qrImageContainer: {
    width: '100%',
    maxWidth: 260,
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cornerGuide: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#003B70',
    borderWidth: 3,
  },
  cornerTL: {
    top: 8,
    left: 8,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 8,
    right: 8,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 8,
    left: 8,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 8,
    right: 8,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 6,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrLoadingBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
    width: '100%',
    height: '100%',
  },
  qrLoadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  amountBox: {
    width: '100%',
    backgroundColor: '#F0F7FF',
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    gap: 4,
  },
  amountSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  amountBigText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#003B70',
  },

  // Gorgeous Success Card & E-Receipt
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    ...shadows.md,
  },
  successRingOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successRingMiddle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successRingInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#15803D',
    textAlign: 'center',
  },
  successSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  receiptCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  receiptTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  receiptPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003B70',
  },
  receiptStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  receiptStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  receiptStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  receiptAmountBox: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  receiptAmountLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  receiptAmountVal: {
    fontSize: 26,
    fontWeight: '900',
    color: '#003B70',
  },
  receiptDividerDashed: {
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginVertical: 2,
  },
  receiptRowsWrap: {
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptRowLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  receiptRowValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  receiptRowValueBold: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '800',
  },
  receiptRowValueCode: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primarySuccessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    width: '100%',
    paddingVertical: 14,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  primarySuccessBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  outlineSuccessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    width: '100%',
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  outlineSuccessBtnText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
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
  pendingNote: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E8',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FFD84D',
  },
  pendingText: { color: '#B26A00', fontSize: 13, flex: 1 },

  // Retry button
  retryBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 8,
  },
  retryText: { color: colors.white, fontWeight: '700', fontSize: 15 },

  // Empty
  emptyBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: { color: colors.textMuted, fontSize: 15 },

  // Back
  backBtn: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '600' },

  // Cancel order button (online QR pending)
  cancelOrderBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFF0F0',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  cancelOrderText: { color: colors.danger, fontSize: 15, fontWeight: '700' },

  // Cash Card
  cashCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderColor: '#FFD84D',
  },
  cashIconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  cashSub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  cashAmountBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cashAmountText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryDark,
  },

  // Primary success button (cash card)
  cashPrimaryBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
  },
  cashPrimaryBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
