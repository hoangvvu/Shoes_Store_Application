import { StyleSheet, Text } from 'react-native';
import { STATUS_COLOR, STATUS_LABEL } from '@/constants/order';
import type { OrderStatus } from '@/types/order';

export function StatusBadge({ status }: { status: OrderStatus }) {
  const c = STATUS_COLOR[status];
  return <Text style={[styles.badge, { backgroundColor: c.bg, color: c.fg }]}>{STATUS_LABEL[status]}</Text>;
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, fontSize: 12, fontWeight: '700', overflow: 'hidden', alignSelf: 'flex-start' },
});
