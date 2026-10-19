import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

interface Props {
  value: number;
  size?: number;
  /** Có `onChange` thì cho phép chạm để chọn số sao. */
  onChange?: (v: number) => void;
}

export function StarRating({ value, size = 18, onChange }: Props) {
  return (
    <View style={styles.row} accessibilityLabel={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = <Ionicons name={n <= Math.round(value) ? 'star' : 'star-outline'} size={size} color="#F5A623" />;
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>{star}</Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 2 } });
