import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/theme';

interface Props {
  headline: string;
  children: ReactNode;
  /** welcome: phần trên to hơn, có hình minh họa */
  hero?: boolean;
}

/** Nền gradient xanh ngọc + tấm "sheet" trắng bo góc ở dưới, theo mẫu thiết kế. */
export function AuthLayout({ headline, children, hero }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={[colors.gradientTop, colors.gradientBottom]} style={styles.fill}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.top, { paddingTop: insets.top + 24 }, hero && styles.topHero]}>
            {hero ? (
              <View style={styles.illustration}>
                <View style={[styles.bubble, styles.bubbleBig]} />
                <View style={[styles.bubble, styles.bubbleSmall]} />
                <Ionicons name="footsteps" size={96} color={colors.white} />
              </View>
            ) : (
              <Text style={styles.headline}>{headline}</Text>
            )}
          </View>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flexGrow: 1 },
  top: { paddingHorizontal: 28, paddingBottom: 36, minHeight: 190, justifyContent: 'flex-end' },
  topHero: { minHeight: 330, alignItems: 'center', justifyContent: 'center' },
  headline: { color: colors.white, fontSize: 28, fontWeight: '800', lineHeight: 36 },
  illustration: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  bubble: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
  bubbleBig: { width: 220, height: 220 },
  bubbleSmall: { width: 150, height: 150, backgroundColor: 'rgba(255,255,255,0.2)' },
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 16,
  },
});
