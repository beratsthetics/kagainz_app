import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius, spacing } from '@/constants/theme';

// CSS textTransform Türkçe 'i' harfini 'I' yapar; büyük harfi tr-TR ile kendimiz çeviriyoruz.
function upper(children: ReactNode): ReactNode {
  if (typeof children === 'string') return children.toLocaleUpperCase('tr-TR');
  if (Array.isArray(children)) return children.map((c) => (typeof c === 'string' ? c.toLocaleUpperCase('tr-TR') : c));
  return children;
}

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screenContent, { flex: 1 }]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {body}
    </SafeAreaView>
  );
}

export function Title({ children, style, ...rest }: TextProps & { children: ReactNode }) {
  return (
    <Text style={[styles.title, style]} {...rest}>
      {upper(children)}
    </Text>
  );
}

export function Heading({ children, style, ...rest }: TextProps & { children: ReactNode }) {
  return (
    <Text style={[styles.heading, style]} {...rest}>
      {upper(children)}
    </Text>
  );
}

export function Body({ children, muted, style, ...rest }: TextProps & { children: ReactNode; muted?: boolean }) {
  return (
    <Text style={[styles.body, muted && { color: colors.textMuted }, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: TextProps['style'] }) {
  return <Text style={[styles.label, style]}>{upper(children)}</Text>;
}

export function Mono({ children, style }: { children: ReactNode; style?: TextProps['style'] }) {
  return <Text style={[styles.mono, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{upper(children)}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonOutline,
        (pressed || disabled) && { opacity: 0.6 },
      ]}>
      {loading ? (
        <ActivityIndicator color={primary ? colors.primaryText : colors.text} />
      ) : (
        <Text style={[styles.buttonText, { color: primary ? colors.primaryText : colors.text }]}>{upper(title)}</Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.textMuted} {...props} style={[styles.input, props.style]} />;
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Label>{label}</Label>
      <Mono style={{ fontSize: 16, marginTop: 4 }}>{value}</Mono>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, value * 100))}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: spacing.md, gap: spacing.md, width: '100%', maxWidth: 720, alignSelf: 'center' },
  title: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, color: colors.text },
  heading: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  label: { fontFamily: fonts.body, fontSize: 11, letterSpacing: 1.2, color: colors.textMuted },
  mono: { fontFamily: fonts.mono, fontSize: 13, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#93C5FD', letterSpacing: 1 },
  button: {
    minHeight: 52,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonOutline: { borderWidth: 1, borderColor: colors.border },
  buttonText: { fontFamily: fonts.displayMedium, fontSize: 17, letterSpacing: 0.8 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
  },
  progressTrack: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: colors.accent },
});
