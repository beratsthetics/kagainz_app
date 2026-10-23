import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ColorValue,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors, fonts, radius, spacing, tierColors } from '@/constants/theme';
import { TIER_INFO, type Tier } from '@/lib/tiers';

// CSS textTransform Türkçe 'i' harfini 'I' yapar; büyük harfi tr-TR ile kendimiz çeviriyoruz.
export function upper(children: ReactNode): ReactNode {
  if (typeof children === 'string') return children.toLocaleUpperCase('tr-TR');
  if (Array.isArray(children)) return children.map((c) => (typeof c === 'string' ? c.toLocaleUpperCase('tr-TR') : c));
  return children;
}

export function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
}

export type IconName = SymbolViewProps['name'];

export function Icon({ name, size = 20, color = colors.text }: { name: IconName; size?: number; color?: ColorValue }) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}

// Sitedeki gibi ince kareli zemin ve üstte mavi bir parıltı.
export function GridBackground({ glow = true }: { glow?: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="grid" width={44} height={44} patternUnits="userSpaceOnUse">
            <Line x1={0} y1={0} x2={44} y2={0} stroke={colors.grid} strokeWidth={1} />
            <Line x1={0} y1={0} x2={0} y2={44} stroke={colors.grid} strokeWidth={1} />
          </Pattern>
          <RadialGradient id="glow" cx="85%" cy="0%" rx="70%" ry="45%">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={0.28} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="fade" cx="50%" cy="40%" rx="75%" ry="70%">
            <Stop offset="0.5" stopColor={colors.background} stopOpacity={0} />
            <Stop offset="1" stopColor={colors.background} stopOpacity={1} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#grid)" />
        <Rect width="100%" height="100%" fill="url(#fade)" />
        {glow && <Rect width="100%" height="100%" fill="url(#glow)" />}
      </Svg>
    </View>
  );
}

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
}) {
  return (
    <View style={styles.screen}>
      <GridBackground />
      <SafeAreaView style={{ flex: 1 }} edges={edges}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.screenContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.screenContent, { flex: 1 }]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

// Giriş animasyonu: içerik sırayla aşağıdan yukarı belirir.
export function Reveal({
  children,
  index = 0,
  style,
}: {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70)
        .duration(420)
        .springify()
        .damping(18)}
      style={style}>
      {children}
    </Animated.View>
  );
}

// Sitedeki "ONLINE / FITNESS" başlığı: ilk satır beyaz, sonrakiler gümüş.
export function Hero({ lines, size = 52, bar = true }: { lines: string[]; size?: number; bar?: boolean }) {
  return (
    <View style={[{ flexDirection: 'row', gap: spacing.md }]}>
      {bar && <View style={{ width: 2, backgroundColor: colors.text, borderRadius: 1 }} />}
      <View>
        {lines.map((l, i) => (
          <Text
            key={l}
            style={[
              styles.title,
              { fontSize: size, lineHeight: size * 1.05, color: i === 0 ? colors.text : colors.silver },
            ]}>
            {upper(l)}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function Eyebrow({ children, color = colors.textMuted }: { children: ReactNode; color?: string }) {
  return <Text style={[styles.eyebrow, { color }]}>{upper(children)}</Text>;
}

export function ScreenHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
      }}>
      <View style={{ flex: 1 }}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Text style={[styles.title, { fontSize: 38, lineHeight: 42 }]}>{upper(title)}</Text>
      </View>
      {right}
    </View>
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

// Üst kenarında hafif ışık yansıması olan kart.
export function Card({ children, style, glow }: { children: ReactNode; style?: StyleProp<ViewStyle>; glow?: boolean }) {
  return (
    <View style={[styles.card, glow && styles.cardGlow, style]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
        style={[StyleSheet.absoluteFill, { borderRadius: radius.lg, height: 90 }]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

// Kenarı renk geçişli kart (paketler, öne çıkan içerik).
export function GradientCard({
  children,
  colors: gradient,
  style,
}: {
  children: ReactNode;
  colors: [string, string];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: radius.lg + 1, padding: 1 }, style]}>
      <View style={[styles.card, { borderWidth: 0 }]}>
        <LinearGradient
          colors={[`${gradient[1]}33`, 'rgba(0,0,0,0)']}
          style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]}
          pointerEvents="none"
        />
        {children}
      </View>
    </LinearGradient>
  );
}

export function Tag({
  children,
  color = colors.accentBright,
  bg = colors.accentSoft,
}: {
  children: ReactNode;
  color?: string;
  bg?: string;
}) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.tagText, { color }]}>{upper(children)}</Text>
    </View>
  );
}

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <LinearGradient colors={tierColors[tier]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tierBadge}>
      <Text style={styles.tierBadgeText}>{upper(TIER_INFO[tier].name)}</Text>
    </LinearGradient>
  );
}

// Basınca hafifçe küçülen, titreşimli dokunma alanı.
export function PressScale({
  children,
  onPress,
  style,
  disabled,
  flex,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  flex?: boolean;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      style={flex ? { flex: 1 } : undefined}
      disabled={disabled}
      onPressIn={() => (scale.value = withSpring(0.97, { damping: 20, stiffness: 400 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 20, stiffness: 400 }))}
      onPress={() => {
        tap();
        onPress?.();
      }}>
      <Animated.View style={[animated, style]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  arrow,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  arrow?: boolean;
}) {
  const primary = variant === 'primary';
  const fg = primary ? colors.primaryText : colors.text;
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        primary && styles.buttonPrimary,
        variant === 'outline' && styles.buttonOutline,
        (disabled || loading) && { opacity: 0.45 },
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} color={fg} />}
          <Text style={[styles.buttonText, { color: fg }]}>{upper(title)}</Text>
          {arrow && <Text style={[styles.buttonText, { color: fg }]}>→</Text>}
        </>
      )}
    </PressScale>
  );
}

export function Input({ prefix, style, ...props }: TextInputProps & { prefix?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.inputWrap, focused && styles.inputFocused, style as StyleProp<ViewStyle>]}>
      {prefix}
      <TextInput
        placeholderTextColor={colors.textDim}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={styles.input}
      />
    </View>
  );
}

export function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {color && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />}
        <Label>{label}</Label>
      </View>
      <Mono style={{ fontSize: 17, marginTop: 6 }}>{value}</Mono>
    </View>
  );
}

export function ProgressBar({
  value,
  color = colors.accent,
  height = 4,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(Math.min(1, Math.max(0, value)), { duration: 700 });
  }, [value, width]);
  const animated = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return (
    <View style={[styles.progressTrack, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: color }, animated]} />
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Dairesel ilerleme halkası (kalori hedefi vb.).
export function Ring({
  value,
  size = 120,
  stroke = 10,
  color = colors.accent,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(Math.min(1, Math.max(0, value)), { duration: 900 });
  }, [value, progress]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - progress.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
}

export function Avatar({ name, size = 40 }: { name?: string | null; size?: number }) {
  const letter = (name ?? '?').charAt(0).toLocaleUpperCase('tr-TR');
  return (
    <LinearGradient
      colors={['#2A2B33', '#15161A']}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderStrong,
      }}>
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.42, color: colors.text }}>{letter}</Text>
    </LinearGradient>
  );
}

export function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  return (
    <PressScale onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      {icon && <Icon name={icon} size={14} color={active ? colors.primaryText : colors.text} />}
      <Text style={[styles.chipText, active && { color: colors.primaryText }]}>{label}</Text>
    </PressScale>
  );
}

export function IconBox({
  name,
  color = colors.text,
  bg = colors.surfaceHigh,
  size = 40,
}: {
  name: IconName;
  color?: string;
  bg?: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={name} size={size * 0.5} color={color} />
    </View>
  );
}

export function Row({
  children,
  gap = spacing.sm,
  style,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: {
    padding: spacing.md + 4,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  title: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, color: colors.text, letterSpacing: 0.3 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2.4, marginBottom: 4 },
  heading: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.text, letterSpacing: 0.3 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  label: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 1.4, color: colors.textMuted },
  mono: { fontFamily: fonts.mono, fontSize: 13, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    gap: spacing.sm + 2,
    overflow: 'hidden',
  },
  cardGlow: {
    borderColor: colors.borderStrong,
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  tag: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 1 },
  tierBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  tierBadgeText: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 1.2, color: '#08090B' },
  button: {
    minHeight: 54,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    shadowColor: '#fff',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonOutline: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(255,255,255,0.02)' },
  buttonText: { fontFamily: fonts.displayMedium, fontSize: 17, letterSpacing: 1 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inputFocused: { borderColor: colors.accent, backgroundColor: colors.surfaceHigh },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never } : null),
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
  },
  progressTrack: { backgroundColor: colors.border, overflow: 'hidden' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
});
