import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { paymentService } from '@/services/payment.service';
import { colors, radius } from '@/theme';
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

// ─── Interactive Dynamic QR Payment Card ───────────────────────────────────────

function QrPaymentCard({
  payment,
  orderId,
  onSimulate,
  onRetry,
}: {
  payment: Payment;
  orderId: number;
  onSimulate: () => Promise<void>;
  onRetry: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const created = new Date(payment.createdAt).getTime();
    const expiry = created + 15 * 60 * 1000;
    return Math.max(0, Math.floor((expiry - Date.now()) / 1000));
  });
  const [channel, setChannel] = useState<'vietqr' | 'momo'>(
    payment.methodCode === 'MOMO' ? 'momo' : 'vietqr',
  );
  const [qrLoaded, setQrLoaded] = useState(false);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const created = new Date(payment.createdAt).getTime();
      const expiry = created + 15 * 60 * 1000;
      const rem = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [payment.createdAt]);

  const isExpired = timeLeft <= 0;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Chuẩn VietQR Napas247 qua ngân hàng Sacombank (BIN: 970403)
  const bankName = 'Sacombank (Ngân hàng Sài Gòn Thương Tín)';
  const bankId = '970403'; // BIN chính thức Napas của Sacombank (STB)
  const accountNo = '060279584557';
  const accountName = 'CUA HANG SHOESTORE';
  const transferContent = `SHOESTORE HD${orderId}`;

  const vietQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${payment.amount}&addInfo=${encodeURIComponent(
    transferContent,
  )}`;

  // Link mã MoMo QR (chuẩn VietQR quét được trên cả MoMo và ngân hàng)
  const momoQrUrl = `https://img.vietqr.io/image/970422-${accountNo}-compact2.png?amount=${payment.amount}&addInfo=${encodeURIComponent(
    transferContent,
  )}`;

  const activeQrUrl = channel === 'momo' ? momoQrUrl : vietQrUrl;

  async function handleSimulatePress() {
    setSimulating(true);
    try {
      await onSimulate();
    } finally {
      setSimulating(false);
    }
  }

  function handleOpenMomo() {
    Linking.openURL('momo://app').catch(() => {
      Alert.alert(
        'Mở ví MoMo',
        'Vui lòng mở ứng dụng MoMo trên máy và dùng tính năng Quét mã để quét mã QR trên màn hình.',
      );
    });
  }

  return (
    <View style={styles.qrCard}>
      {/* Timer Header */}
      <View style={[styles.timerBanner, isExpired && styles.timerBannerExpired]}>
        <Ionicons
          name={isExpired ? 'alert-circle' : 'time-outline'}
          size={18}
          color={isExpired ? colors.danger : '#B26A00'}
        />
        <Text style={[styles.timerText, isExpired && { color: colors.danger }]}>
          {isExpired
            ? 'Mã thanh toán đã hết hạn'
            : `Mã có hiệu lực trong: ${timeFormatted}`}
        </Text>
      </View>

      {/* Channel Switch (VietQR vs MoMo) */}
      <View style={styles.channelRow}>
        <TouchableOpacity
          style={[styles.channelTab, channel === 'vietqr' && styles.channelTabActive]}
          onPress={() => setChannel('vietqr')}
        >
          <Ionicons
            name="qr-code-outline"
            size={16}
            color={channel === 'vietqr' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.channelTabText,
              channel === 'vietqr' && styles.channelTabTextActive,
            ]}
          >
            Quét VietQR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.channelTab, channel === 'momo' && styles.channelTabActive]}
          onPress={() => setChannel('momo')}
        >
          <Ionicons
            name="wallet-outline"
            size={16}
            color={channel === 'momo' ? '#A50064' : colors.textMuted}
          />
          <Text
            style={[
              styles.channelTabText,
              channel === 'momo' && { color: '#A50064', fontWeight: '700' },
            ]}
          >
            Ví MoMo
          </Text>
        </TouchableOpacity>
      </View>

      {/* QR Code Container */}
      <View style={styles.qrContainer}>
        {!qrLoaded && !isExpired && (
          <View style={styles.qrLoadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.qrLoadingText}>Đang tạo mã QR thanh toán...</Text>
          </View>
        )}

        <Image
          source={{ uri: activeQrUrl }}
          style={[styles.qrImage, isExpired && styles.qrImageExpired]}
          resizeMode="contain"
          onLoadEnd={() => setQrLoaded(true)}
        />

        {isExpired && (
          <View style={styles.expiredOverlay}>
            <Ionicons name="lock-closed" size={32} color={colors.danger} />
            <Text style={styles.expiredTitle}>Mã QR đã hết hạn</Text>
            <TouchableOpacity style={styles.expiredRetryBtn} onPress={onRetry}>
              <Ionicons name="refresh-outline" size={16} color={colors.white} />
              <Text style={styles.expiredRetryText}>Tạo mã mới</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Scan guide badge */}
      <View style={styles.scanBadge}>
        <Ionicons name="scan-outline" size={16} color={colors.primaryDark} />
        <Text style={styles.scanBadgeText}>
          Quét tự động điền đúng số tiền và nội dung đơn #{orderId}
        </Text>
      </View>

      {/* Transfer Information Breakdown */}
      <View style={styles.bankInfoBox}>
        <View style={styles.bankInfoRow}>
          <Text style={styles.infoLabel}>Số tiền cần trả:</Text>
          <Text style={styles.infoAmount}>{formatVnd(payment.amount)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.bankInfoRow}>
          <Text style={styles.infoLabel}>Nội dung CK:</Text>
          <View style={styles.contentPill}>
            <Text style={styles.contentPillText}>{transferContent}</Text>
          </View>
        </View>

        <View style={styles.bankInfoRow}>
          <Text style={styles.infoLabel}>Ngân hàng:</Text>
          <Text style={styles.infoVal}>{channel === 'momo' ? 'Ví điện tử MoMo' : bankName}</Text>
        </View>

        <View style={styles.bankInfoRow}>
          <Text style={styles.infoLabel}>Số tài khoản:</Text>
          <Text style={[styles.infoVal, { fontWeight: '700' }]}>{accountNo}</Text>
        </View>

        <View style={styles.bankInfoRow}>
          <Text style={styles.infoLabel}>Chủ tài khoản:</Text>
          <Text style={styles.infoVal}>{accountName}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {channel === 'momo' && (
          <TouchableOpacity style={styles.momoAppBtn} onPress={handleOpenMomo}>
            <Ionicons name="open-outline" size={16} color={colors.white} />
            <Text style={styles.momoAppBtnText}>Mở App MoMo</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.simulateBtn}
          onPress={handleSimulatePress}
          disabled={simulating || isExpired}
        >
          {simulating ? (
            <ActivityIndicator size="small" color="#168A4F" />
          ) : (
            <Ionicons name="flash" size={16} color="#168A4F" />
          )}
          <Text style={styles.simulateBtnText}>
            {simulating ? 'Đang xác nhận...' : '⚡ Giả lập thanh toán thành công (Test)'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.autoDetectNote}>
        Hệ thống tự động phát hiện khi bạn chuyển khoản thành công và chuyển màn hình sau 2-3 giây.
      </Text>
    </View>
  );
}

// ─── Payment Success View ──────────────────────────────────────────────────────

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
      <View style={styles.successIconOuter}>
        <View style={styles.successIconInner}>
          <Ionicons name="checkmark" size={44} color={colors.white} />
        </View>
      </View>

      <Text style={styles.successTitle}>Thanh toán thành công!</Text>
      <Text style={styles.successSub}>
        Đơn hàng #{orderId} đã được thanh toán hoàn tất. Cửa hàng sẽ chuẩn bị và giao sản phẩm đến bạn sớm nhất.
      </Text>

      <View style={styles.successSummaryBox}>
        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Số tiền thanh toán</Text>
          <Text style={styles.summaryAmount}>{formatVnd(payment.amount)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Phương thức</Text>
          <Text style={styles.bold}>{payment.methodName}</Text>
        </View>
        {!!payment.transactionCode && (
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Mã giao dịch</Text>
            <Text style={styles.bold}>{payment.transactionCode}</Text>
          </View>
        )}
        {!!payment.paidAt && (
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Thời gian thanh toán</Text>
            <Text style={styles.bold}>{formatDateTime(payment.paidAt)}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.primarySuccessBtn} onPress={onGoOrder}>
        <Ionicons name="receipt-outline" size={18} color={colors.white} />
        <Text style={styles.primarySuccessBtnText}>Xem chi tiết đơn hàng #{orderId}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.outlineSuccessBtn} onPress={onGoHome}>
        <Ionicons name="home-outline" size={18} color={colors.primary} />
        <Text style={styles.outlineSuccessBtnText}>Tiếp tục mua sắm</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Transaction Detail Card ───────────────────────────────────────────────────

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const router = useRouter();

  const [data, setData] = useState<PaymentStatusResult | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [error, setError] = useState('');

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
      Alert.alert(
        'Thanh toán thành công!',
        'Đã ghi nhận chuyển khoản từ ngân hàng/ví điện tử.',
      );
      void load();
    } catch (e) {
      Alert.alert('Lỗi giả lập', getErrorMessage(e));
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

  const successPayment = data.payments.find((p) => p.status === 'SUCCESS');
  const pendingPayment = data.payments.find((p) => p.status === 'PENDING');
  const isPaid = !!successPayment;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      {/* SUCCESS BANNER VIEW */}
      {isPaid && successPayment ? (
        <PaymentSuccessView
          orderId={orderId}
          payment={successPayment}
          onGoOrder={() => router.replace({ pathname: '/orders/[id]', params: { id: String(orderId) } })}
          onGoHome={() => router.replace('/(tabs)')}
        />
      ) : pendingPayment ? (
        /* DYNAMIC QR PAYMENT VIEW HIỂN THỊ CHO TẤT CẢ ĐƠN CHỜ THANH TOÁN */
        <QrPaymentCard
          payment={pendingPayment}
          orderId={orderId}
          onSimulate={() => handleSimulate(pendingPayment.paymentId, pendingPayment.amount)}
          onRetry={() => handleRetry(pendingPayment)}
        />
      ) : (
        /* Normal Header Status */
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

  // Dynamic QR Card
  qrCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8E8',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD84D',
  },
  timerBannerExpired: {
    backgroundColor: '#FDECEC',
    borderColor: '#F8B4B4',
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B26A00',
  },
  channelRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: 4,
    width: '100%',
    gap: 6,
  },
  channelTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  channelTabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  channelTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  channelTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  qrContainer: {
    width: 250,
    height: 250,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrImageExpired: {
    opacity: 0.15,
  },
  qrLoadingBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrLoadingText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  expiredOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  expiredTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger,
  },
  expiredRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  expiredRetryText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF8F8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scanBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  bankInfoBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bankInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  infoVal: {
    fontSize: 13,
    color: colors.text,
  },
  infoAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  contentPill: {
    backgroundColor: '#FFEAD4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contentPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B26A00',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  actionRow: {
    width: '100%',
    gap: 8,
  },
  momoAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#A50064',
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  momoAppBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EDFDF5',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#168A4F',
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  simulateBtnText: {
    color: '#168A4F',
    fontWeight: '700',
    fontSize: 13,
  },
  autoDetectNote: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 12,
  },

  // Success Card
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    borderWidth: 2,
    borderColor: '#168A4F',
    shadowColor: '#168A4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  successIconOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#168A4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#168A4F',
  },
  successSub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  successSummaryBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#168A4F',
  },
  primarySuccessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#168A4F',
    width: '100%',
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  primarySuccessBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  outlineSuccessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    width: '100%',
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  outlineSuccessBtnText: {
    color: colors.primary,
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
});
