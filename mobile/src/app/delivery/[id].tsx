import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Pressable,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deliveryService, type DeliveryMethodCode } from '@/services/delivery.service';
import { colors, radius } from '@/theme';
import { formatVnd } from '@/utils/format';

const PAY_TX: Record<string, string> = { PENDING: 'Chờ thanh toán', SUCCESS: 'Thành công', FAILED: 'Không thành công' };
const PAY_TX_COLOR: Record<string, { bg: string; fg: string }> = {
  PENDING: { bg: '#FFF4E0', fg: '#B26A00' },
  SUCCESS: { bg: '#E3F7EC', fg: '#168A4F' },
  FAILED: { bg: '#FDE8E8', fg: '#C23030' },
};

// Hàm phân biệt chính xác giữa Tiền mặt và Chuyển khoản QR dựa trên mã/tên phương thức
const getPaymentInfo = (payment: any) => {
  const raw = `${payment?.methodCode || ''} ${payment?.methodName || ''} ${payment?.method || ''} ${payment?.type || ''}`.toUpperCase();
  const isQr =
    raw.includes('QR') ||
    raw.includes('VIETQR') ||
    raw.includes('MOMO') ||
    raw.includes('BANK') ||
    raw.includes('CHUYỂN KHOẢN') ||
    raw.includes('TRANSFER');

  if (isQr) {
    return {
      isQr: true,
      icon: 'qr-code-outline' as const,
      label: 'Chuyển khoản QR',
      successLabel: 'Chuyển khoản QR thành công',
      confirmText: payment?.status === 'SUCCESS' ? 'Đã xác nhận qua quét QR' : 'Chờ khách quét mã QR thanh toán',
    };
  }
  return {
    isQr: false,
    icon: 'cash-outline' as const,
    label: 'Tiền mặt',
    successLabel: 'Thu tiền mặt thành công',
    confirmText: payment?.status === 'SUCCESS' ? 'Đã xác nhận thu tiền mặt' : 'Xác nhận bằng tiền mặt khi nhận hàng',
  };
};

// ─── Khung mã QR hiển thị cho khách quét ───

function QrPaymentCard({
  payment,
  orderId,
  onSimulate,
}: {
  payment: any;
  orderId: number | null;
  onSimulate: (methodCode: DeliveryMethodCode) => Promise<void>;
}) {
  const [channel, setChannel] = useState<'vietqr' | 'momo'>(
    payment?.methodCode === 'MOMO' ? 'momo' : 'vietqr',
  );
  const [qrLoaded, setQrLoaded] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const bankName = 'Sacombank (Ngân hàng Sài Gòn Thương Tín)';
  const bankId = '970403'; 
  const accountNo = '060279584557';
  const accountName = 'CUA HANG SHOESTORE';
  const transferContent = orderId ? `THANHTOAN_DON_${orderId}` : 'SHOESTORE THANHTOAN';
  const amountToPay = payment?.amount || 0;

  const vietQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amountToPay}&addInfo=${encodeURIComponent(
    transferContent,
  )}`;

  const momoQrUrl = `https://img.vietqr.io/image/970422-${accountNo}-compact2.png?amount=${amountToPay}&addInfo=${encodeURIComponent(
    transferContent,
  )}`;

  const activeQrUrl = channel === 'momo' ? momoQrUrl : vietQrUrl;

  async function handleSimulatePress() {
    setSimulating(true);
    try {
      await onSimulate(channel === 'momo' ? 'MOMO' : 'BANK_QR');
    } finally {
      setSimulating(false);
    }
  }

  function handleOpenMomo() {
    Linking.openURL('momo://app').catch(() => {
      Alert.alert(
        'Mở ví MoMo',
        'Vui lòng mở ứng dụng MoMo trên máy để quét mã.',
      );
    });
  }

  return (
    <View style={styles.qrCard}>
      <View style={styles.timerBanner}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#B26A00" />
        <Text style={styles.timerText}>Mã chuyển khoản</Text>
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
          <Text style={[styles.channelTabText, channel === 'vietqr' && styles.channelTabTextActive]}>
            Mã VietQR
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
          <Text style={[styles.channelTabText, channel === 'momo' && { color: '#A50064', fontWeight: '700' }]}>
            Ví MoMo
          </Text>
        </TouchableOpacity>
      </View>

      {/* QR Code Container */}
      <View style={styles.qrContainer}>
        {!qrLoaded && (
          <View style={styles.qrLoadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.qrLoadingText}>Đang tải mã QR...</Text>
          </View>
        )}

        <Image
          source={{ uri: activeQrUrl }}
          style={styles.qrImage}
          resizeMode="contain"
          onLoadEnd={() => setQrLoaded(true)}
        />
      </View>

      <View style={styles.scanBadge}>
        <Ionicons name="scan-outline" size={16} color={colors.primaryDark} />
        <Text style={styles.scanBadgeText}>
          Đưa mã QR này cho khách quét (Tự động điền số tiền & nội dung đơn #{orderId})
        </Text>
      </View>

      {/* Transfer Information Breakdown */}
      <View style={styles.bankInfoBox}>
        <View style={styles.bankInfoRow}>
          <Text style={styles.infoLabel}>Số tiền cần thu:</Text>
          <Text style={styles.infoAmount}>{formatVnd(amountToPay)}</Text>
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
          disabled={simulating}
        >
          {simulating ? (
            <ActivityIndicator size="small" color="#168A4F" />
          ) : (
            <Ionicons name="flash" size={16} color="#168A4F" />
          )}
          <Text style={styles.simulateBtnText}>
            {simulating ? 'Đang xác nhận...' : 'Giả lập thanh toán QR thành công'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DeliveryOrderDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [activeQrPaymentId, setActiveQrPaymentId] = useState<number | null>(null);

  const fetchOrderDetail = async () => {
    setLoading(true);
    try {
      setOrder(await deliveryService.getOrder(id as string));
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể lấy thông tin chi tiết đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOrder(null);
    setActiveQrPaymentId(null);
    if (id) fetchOrderDetail();
    else setLoading(false);
  }, [id]);

  const goToList = () => router.replace('/delivery/home' as any);

  // Xác nhận thu tiền mặt trực tiếp
  const handleConfirmCashPayment = async (paymentId: number, amount: number) => {
    Alert.alert(
      'Xác nhận thu tiền mặt',
      `Xác nhận đã thu trực tiếp ${formatVnd(amount)} tiền mặt từ khách hàng?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận đã thu',
          onPress: async () => {
            setSimulating(true);
            try {
              await deliveryService.confirmPayment(id as string, paymentId, 'CASH');
              Alert.alert('Thành công', 'Đã ghi nhận thu tiền mặt thành công!');
              setActiveQrPaymentId(null);
              await fetchOrderDetail();
            } catch (err: any) {
              Alert.alert('Lỗi', err.response?.data?.message || err.message || 'Không thể xác nhận thanh toán.');
            } finally {
              setSimulating(false);
            }
          },
        },
      ]
    );
  };

  // Giả lập thanh toán QR thành công
  const handleSimulateQrPayment = async (paymentId: number, methodCode: DeliveryMethodCode) => {
    setSimulating(true);
    try {
      await deliveryService.confirmPayment(id as string, paymentId, methodCode);
      Alert.alert('Thanh toán thành công!', 'Đã ghi nhận chuyển khoản QR từ khách hàng thành công.');
      setActiveQrPaymentId(null);
      await fetchOrderDetail();
    } catch (err: any) {
      Alert.alert('Lỗi giả lập', err.response?.data?.message || err.message || 'Không thể giả lập thanh toán.');
    } finally {
      setSimulating(false);
    }
  };

  const handleConfirmDelivered = async () => {
    Alert.alert(
      'Xác nhận hoàn tất giao hàng',
      `Xác nhận đơn hàng #${id} đã giao thành công cho khách?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận đã giao',
          onPress: async () => {
            try {
              await deliveryService.deliver(id as string);
              Alert.alert('Thành công', 'Đã cập nhật trạng thái đơn hàng thành công!');
              goToList();
            } catch (err: any) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể cập nhật trạng thái.');
            }
          },
        },
      ]
    );
  };

  const breadcrumb = (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.crumbRow}>
        <Pressable hitSlop={8} onPress={() => (router.canGoBack() ? router.back() : goToList())} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.white} />
        </Pressable>
        <View style={styles.crumbs}>
          <Pressable hitSlop={6} onPress={goToList}>
            <Text style={styles.crumbLink}>Giao hàng</Text>
          </Pressable>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.crumbCurrent} numberOfLines={1}>Chi tiết đơn #{id}</Text>
        </View>
      </View>
      <Text style={styles.pageTitle}>Thông tin chi tiết đơn hàng</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {breadcrumb}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {breadcrumb}
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>Không tìm thấy thông tin đơn hàng.</Text>
        </View>
      </View>
    );
  }

  const hasPayments = order.payments && order.payments.length > 0;
  // Backend có thể trả ghi chú dưới nhiều tên khác nhau tùy DTO
  const customerNote: string = String(
    order.note ?? order.customerNote ?? order.orderNote ?? order.invoiceNote ?? order.notes ?? ''
  ).trim();
  // Ghi chú của người bàn giao vận chuyển dành cho nhân viên giao hàng
  const shipNoteRaw =
    order.shippingNote ??
    order.shipNote ??
    [...(order.history ?? [])].reverse().find((h: any) => h.newStatus === 'SHIPPING')?.note ??
    '';
  const shipNote: string = String(shipNoteRaw).trim();
  const isPaidSuccess = hasPayments && order.payments.every((p: any) => p.status === 'SUCCESS');
  const activeQrPayment = order.payments?.find((p: any) => (p.paymentId || p.id) === activeQrPaymentId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {breadcrumb}
      <ScrollView contentContainerStyle={styles.container}>
        {/* Thẻ người nhận & địa chỉ giao hàng */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin giao hàng</Text>
          <View style={styles.row}>
            <Ionicons name="person-outline" size={18} color={colors.primary} />
            <Text style={styles.rowText}>{order.receiverName}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="call-outline" size={18} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.primary, fontWeight: '700' }]}>{order.receiverPhone}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Text style={styles.rowText}>{order.shippingAddress}</Text>
          </View>
        </View>

        {/* Ghi chú của khách hàng (chỉ hiện khi có nội dung) */}
        {customerNote ? (
          <View style={[styles.card, { backgroundColor: '#FFF8E8', borderColor: '#F3D9A0' }]}>
            <Text style={styles.cardTitle}>Ghi chú của khách hàng</Text>
            <View style={[styles.row, { alignItems: 'flex-start' }]}>
              <Ionicons name="document-text-outline" size={18} color="#B26A00" style={{ marginTop: 1 }} />
              <Text style={[styles.rowText, { color: '#B26A00', fontWeight: '600' }]}>{customerNote}</Text>
            </View>
          </View>
        ) : null}

        {/* Ghi chú của quản trị viên khi bàn giao vận chuyển (chỉ hiện khi có nội dung) */}
        {shipNote ? (
          <View style={[styles.card, { backgroundColor: '#EEF4FF', borderColor: '#C7D8F7' }]}>
            <Text style={styles.cardTitle}>Ghi chú của quản trị viên</Text>
            <View style={[styles.row, { alignItems: 'flex-start' }]}>
              <Ionicons name="chatbox-ellipses-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
              <Text style={[styles.rowText, { fontWeight: '600' }]}>{shipNote}</Text>
            </View>
          </View>
        ) : null}

        {/* Danh sách sản phẩm trong đơn */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Danh sách sản phẩm</Text>
          {order.items?.map((item: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemSub}>
                  Size {item.sizeLabel} · {item.colorName} · SL: x{item.quantity}
                </Text>
              </View>
              <Text style={styles.itemPrice}>{formatVnd(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        {/* Giao dịch thanh toán */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Giao dịch thanh toán</Text>
          {!hasPayments && (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Chưa có giao dịch thanh toán được ghi nhận.</Text>
          )}

          {order.payments?.map((p: any) => {
            const payInfo = getPaymentInfo(p);
            const c = PAY_TX_COLOR[p.status] ?? PAY_TX_COLOR.PENDING;
            const pId = p.paymentId || p.id;
            const isThisQrShown = activeQrPaymentId === pId;
            const isSuccess = p.status === 'SUCCESS';

            // Tiêu đề hiển thị chuẩn xác theo trạng thái
            const displayTitle = isSuccess ? payInfo.successLabel : payInfo.label;

            return (
              <View key={pId} style={styles.payCardItem}>
                <View style={styles.payItemHeader}>
                  <View style={styles.payIcon}>
                    <Ionicons name={payInfo.icon} size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.boldText}>{displayTitle}</Text>
                    <Text style={styles.mutedText}>
                      {p.methodName || payInfo.label} · {formatVnd(p.amount || order.amountPayable)}
                    </Text>
                    <Text style={styles.confirmText}>{payInfo.confirmText}</Text>
                  </View>
                  <Text style={[styles.payBadge, { backgroundColor: c.bg, color: c.fg }]}>
                    {PAY_TX[p.status] ?? p.status}
                  </Text>
                </View>

                {/* Nếu giao dịch đang PENDING */}
                {p.status === 'PENDING' && (
                  <View style={{ gap: 6, marginTop: 4 }}>
                    {!payInfo.isQr && (
                      <TouchableOpacity
                        style={styles.confirmCashBtn}
                        onPress={() => handleConfirmCashPayment(pId, p.amount || order.amountPayable)}
                        disabled={simulating}
                      >
                        {simulating ? (
                          <ActivityIndicator size="small" color="#168A4F" />
                        ) : (
                          <Ionicons name="cash" size={18} color="#168A4F" />
                        )}
                        <Text style={styles.confirmCashBtnText}>Xác nhận đã thu tiền mặt</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.toggleQrBtn}
                      onPress={() => setActiveQrPaymentId(isThisQrShown ? null : pId)}
                    >
                      <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
                      <Text style={styles.toggleQrBtnText}>
                        {isThisQrShown ? 'Ẩn mã QR chuyển khoản' : 'Hiện mã QR cho khách quét'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tổng tiền phải thu:</Text>
            <Text style={styles.summaryValue}>{formatVnd(order.amountPayable)}</Text>
          </View>
        </View>

        {/* Khung QR code hiển thị động khi Shipper bấm vào */}
        {activeQrPayment && (
          <QrPaymentCard
            payment={activeQrPayment}
            orderId={order.invoiceId}
            onSimulate={(methodCode) => handleSimulateQrPayment(activeQrPayment.paymentId || activeQrPayment.id, methodCode)}
          />
        )}

        {/* Nút xác nhận đã giao hàng thành công */}
        {isPaidSuccess ? (
          <TouchableOpacity style={styles.deliverBtn} onPress={handleConfirmDelivered} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
            <Text style={styles.deliverBtnText}>Xác nhận đã giao hàng thành công</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pendingNoticeBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#B26A00" />
            <Text style={styles.pendingNoticeText}>
              Vui lòng hoàn tất thanh toán trước khi bấm xác nhận giao hàng.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 14, gap: 6 },
  crumbRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  crumbs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  crumbLink: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  crumbCurrent: { color: colors.white, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  pageTitle: { color: colors.white, fontSize: 20, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 14, color: colors.text, flex: 1 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.background },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: colors.text },
  payCardItem: { gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.background },
  payItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EDFDF5', alignItems: 'center', justifyContent: 'center' },
  boldText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  mutedText: { color: colors.textMuted, fontSize: 13 },
  confirmText: { color: colors.primaryDark, fontSize: 13, fontWeight: '700' },
  payBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, fontSize: 12, fontWeight: '700', overflow: 'hidden' },
  confirmCashBtn: {
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
  confirmCashBtnText: { color: '#168A4F', fontWeight: '700', fontSize: 13 },
  toggleQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EBF8F8',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  toggleQrBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  summaryLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
  
  // Dynamic QR Card Styles
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
  timerText: { fontSize: 13, fontWeight: '700', color: '#B26A00' },
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
  channelTabActive: { backgroundColor: colors.surface, elevation: 1 },
  channelTabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  channelTabTextActive: { color: colors.primary, fontWeight: '700' },
  qrContainer: {
    width: '100%',
    maxWidth: 240,
    aspectRatio: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  qrImage: { width: '100%', height: '100%' },
  qrLoadingBox: { position: 'absolute', alignItems: 'center', justifyContent: 'center', gap: 8 },
  qrLoadingText: { fontSize: 12, color: colors.textMuted },
  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF8F8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scanBadgeText: { fontSize: 12, fontWeight: '600', color: colors.primaryDark, textAlign: 'center' },
  bankInfoBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bankInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  infoLabel: { fontSize: 13, color: colors.textMuted, flexShrink: 0 },
  infoVal: { fontSize: 13, color: colors.text, flex: 1, textAlign: 'right' },
  infoAmount: { fontSize: 17, fontWeight: '800', color: colors.primaryDark, flex: 1, textAlign: 'right' },
  contentPill: {
    backgroundColor: '#FFEAD4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: '70%',
    alignSelf: 'flex-end',
  },
  contentPillText: { fontSize: 13, fontWeight: '800', color: '#B26A00', textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  actionRow: { width: '100%', gap: 8 },
  momoAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#A50064',
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  momoAppBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
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
  simulateBtnText: { color: '#168A4F', fontWeight: '700', fontSize: 13 },

  deliverBtn: { backgroundColor: '#059669', borderRadius: radius.md, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  deliverBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  pendingNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8E8',
    borderColor: '#FFD84D',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 4,
  },
  pendingNoticeText: { color: '#B26A00', fontSize: 13, fontWeight: '600', flex: 1 },
});