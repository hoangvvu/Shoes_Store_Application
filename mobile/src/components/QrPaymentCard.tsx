import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { paymentService } from '@/services/payment.service';
import { colors, radius } from '@/theme';
import { getErrorMessage } from '@/utils/error';
import { formatVnd } from '@/utils/format';

interface Props {
  orderId: number;
  paymentId: number;
  amount: number;
  createdAt?: string;
  onSuccess?: () => void;
}

export function QrPaymentCard({
  orderId,
  paymentId,
  amount,
  createdAt,
  onSuccess,
}: Props) {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const created = createdAt ? new Date(createdAt).getTime() : Date.now();
    const expiry = created + 15 * 60 * 1000;
    return Math.max(0, Math.floor((expiry - Date.now()) / 1000));
  });
  const [channel, setChannel] = useState<'vietqr' | 'momo'>('vietqr');
  const [qrLoaded, setQrLoaded] = useState(false);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const created = createdAt ? new Date(createdAt).getTime() : Date.now();
      const expiry = created + 15 * 60 * 1000;
      const rem = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [createdAt]);

  // Polling tự động mỗi 3 giây kiểm tra thanh toán
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const latest = await paymentService.getPaymentStatus(orderId);
        if (latest.payments.some((p) => p.status === 'SUCCESS')) {
          clearInterval(pollInterval);
          onSuccess?.();
        }
      } catch {
        // bỏ qua lỗi mạng tạm thời
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [orderId, onSuccess]);

  const isExpired = timeLeft <= 0;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Chuẩn VietQR Napas247 - Sacombank (BIN: 970403)
  const bankName = 'Sacombank (Sài Gòn Thương Tín)';
  const bankId = '970403';
  const accountNo = '060279584557';
  const transferContent = `SHOESTORE HD${orderId}`;

  const vietQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    transferContent,
  )}`;

  const momoQrUrl = `https://img.vietqr.io/image/970422-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    transferContent,
  )}`;

  const activeQrUrl = channel === 'momo' ? momoQrUrl : vietQrUrl;

  async function handleSimulatePress() {
    setSimulating(true);
    try {
      await paymentService.simulateSuccess(paymentId, amount);
      Alert.alert(
        'Thanh toán thành công!',
        'Đã ghi nhận chuyển khoản từ ngân hàng/ví điện tử.',
      );
      onSuccess?.();
    } catch (e) {
      Alert.alert('Lỗi giả lập', getErrorMessage(e));
    } finally {
      setSimulating(false);
    }
  }

  function handleOpenMomo() {
    Linking.openURL('momo://app').catch(() => {
      Alert.alert(
        'Mở ví MoMo',
        'Vui lòng mở ứng dụng MoMo trên máy và dùng tính năng Quét mã để quét mã QR.',
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
            Sacombank VietQR
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
          <Text style={styles.infoLabel}>Số tiền:</Text>
          <Text style={styles.infoAmount}>{formatVnd(amount)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.bankInfoRow}>
          <Text style={styles.infoLabel}>Nội dung:</Text>
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
          <Text style={[styles.infoVal, { fontWeight: '800' }]}>{accountNo}</Text>
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
        Hệ thống tự động phát hiện khi bạn chuyển khoản thành công và chuyển trạng thái ngay lập tức.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  qrCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#168A4F',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8E8',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
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
    padding: 3,
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  channelTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  qrContainer: {
    width: 240,
    height: 240,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 8,
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
  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF8F8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  scanBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  bankInfoBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: 10,
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
    fontSize: 16,
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
    marginVertical: 2,
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
  },
});
