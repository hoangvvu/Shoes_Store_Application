import { StyleSheet, Text } from 'react-native';
import { BRAND_NAME } from '@/constants/app';
import { colors } from '@/theme';

export function Logo({ color = colors.primary, size = 34 }: { color?: string; size?: number }) {
  return <Text style={[styles.logo, { color, fontSize: size }]}>{BRAND_NAME}</Text>;
}

const styles = StyleSheet.create({
  logo: { fontWeight: '800', letterSpacing: 3 },
});
