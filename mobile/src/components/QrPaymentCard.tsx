import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { paymentService } from '@/services/payment.service';
import { colors, radius, shadows } from '@/theme';
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
  onSuccess,
}: Props) {
  const [qrLoaded, setQrLoaded] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Polling check payment status
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const latest = await paymentService.getPaymentStatus(orderId);
        if (latest.payments.some((p) => p.status === 'SUCCESS')) {
          clearInterval(pollInterval);
          onSuccess?.();
        }
      } catch {
        // ignore network error
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [orderId, onSuccess]);

  const bankId = '970403';
  const accountNo = '060279584557';
  const transferContent = `SHOESTORE HD${orderId}`;

  const vietQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    transferContent,
  )}`;

  async function handleQrTap() {
    if (simulating) return;
    setSimulating(true);
    try {
      await paymentService.simulateSuccess(paymentId, amount);
      onSuccess?.();
    } catch (e) {
      Alert.alert('Lỗi', getErrorMessage(e));
    } finally {
      setSimulating(false);
    }
  }

  return (
    <View style={styles.bankPortalCard}>
      {/* QR Code */}
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
          source={{ uri: vietQrUrl }}
          style={styles.qrImage}
          resizeMode="contain"
          onLoadEnd={() => setQrLoaded(true)}
        />
      </TouchableOpacity>

      {/* Số tiền chuyển khoản */}
      <View style={styles.amountBox}>
        <Text style={styles.amountSubLabel}>SỐ TIỀN CHUYỂN KHOẢN</Text>
        <Text style={styles.amountBigText}>{formatVnd(amount)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
