import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { colors, radius } from '@/theme';

interface Props extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  secure?: boolean;
}

export function AppTextInput({ icon, error, secure, style, ...rest }: Props) {
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View style={styles.wrap}>
      <View style={[styles.box, !!error && styles.boxError]}>
        <Ionicons name={icon} size={20} color={colors.textMuted} />
        <TextInput
          {...rest}
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidden}
          autoCapitalize={rest.autoCapitalize ?? 'none'}
          autoCorrect={false}
        />
        {secure && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel="Hiện/ẩn mật khẩu">
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  boxError: { borderColor: colors.danger },
  input: { flex: 1, color: colors.text, fontSize: 16 },
  error: { color: colors.danger, fontSize: 13, marginLeft: 4 },
});
