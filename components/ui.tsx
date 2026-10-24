import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View, type ColorValue, type DimensionValue, type StyleProp, type TextInputProps, type TextProps, type ViewStyle } from 'react-native';
import { Text, translateChildren } from '@/components/T';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { fonts, radius, spacing, tierColors } from '@/constants/theme';
import { avatarUrl } from '@/lib/media';
import { TIER_INFO, type Tier } from '@/lib/tiers';
import { makeStyles, useColors } from '@/lib/theme';
import { locale, translate, tx } from '@/lib/i18n';

// CSS textTransform Türkçe 'i' harfini 'I' yapar; büyük harfi seçili dile göre kendimiz çeviriyoruz.
// Önce çeviri yapılır (sözlük anahtarları normal yazımla).
export function upper(children: ReactNode): ReactNode {
  const t = translateChildren(children);
  if (typeof t === 'string') return t.toLocaleUpperCase(locale());
  if (Array.isArray(t)) return t.map((c) => (typeof c === 'string' ? c.toLocaleUpperCase(locale()) : c));
  return t;
}

export function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
}

export type IconName = SymbolViewProps['name'];

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: ColorValue }) {
  const colors = useColors();
  return <SymbolView name={name} size={size} tintColor={color ?? colors.text} />;
}

// Sitedeki gibi ince kareli zemin ve üstte mavi bir parıltı.
export function GridBackground({ glow = true }: { glow?: boolean }) {
  const colors = useColors();
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
  const styles = useStyles();
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
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={[{ flexDirection: 'row', gap: spacing.md }]}>
      {bar && <View style={{ width: 2, backgroundColor: colors.text, borderRadius: 1 }} />}
      <View>
        {/* Satırlar birlikte çevrilir: İngilizcede kelime sırası değişebilir ("Kodu / gir" -> "Enter / the code"). */}
        {tx(lines.join('\n')).split('\n').map((l, i) => (
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

export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  const colors = useColors();
  color ??= colors.textMuted;
  const styles = useStyles();
  return <Text style={[styles.eyebrow, { color }]}>{upper(children)}</Text>;
}

export function ScreenHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  const styles = useStyles();
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
  const styles = useStyles();
  return (
    <Text style={[styles.title, style]} {...rest}>
      {upper(children)}
    </Text>
  );
}

export function Heading({ children, style, ...rest }: TextProps & { children: ReactNode }) {
  const styles = useStyles();
  return (
    <Text style={[styles.heading, style]} {...rest}>
      {upper(children)}
    </Text>
  );
}

export function Body({ children, muted, style, ...rest }: TextProps & { children: ReactNode; muted?: boolean; raw?: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Text style={[styles.body, muted && { color: colors.textMuted }, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: TextProps['style'] }) {
  const styles = useStyles();
  return <Text style={[styles.label, style]}>{upper(children)}</Text>;
}

export function Mono({ children, style }: { children: ReactNode; style?: TextProps['style'] }) {
  const styles = useStyles();
  return <Text style={[styles.mono, style]}>{children}</Text>;
}

// Üst kenarında hafif ışık yansıması olan kart.
export function Card({ children, style, glow }: { children: ReactNode; style?: StyleProp<ViewStyle>; glow?: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.card, glow && styles.cardGlow, style]}>
      <LinearGradient
        colors={[colors.sheen, 'rgba(255,255,255,0)']}
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
  const styles = useStyles();
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
  color,
  bg,
}: {
  children: ReactNode;
  color?: string;
  bg?: string;
}) {
  const colors = useColors();
  color ??= colors.accentBright;
  bg ??= colors.accentSoft;
  const styles = useStyles();
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.tagText, { color }]}>{upper(children)}</Text>
    </View>
  );
}

export function TierBadge({ tier }: { tier: Tier }) {
  const styles = useStyles();
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
  onLongPress,
  delayLongPress,
  style,
  disabled,
  flex,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  flex?: boolean;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  // Yüzde genişlik dokunma alanına verilir; içte kalırsa kart içeriği kadar büzülür (ör. %48'lik ızgara).
  const { width, flexGrow, ...inner } = StyleSheet.flatten(style) ?? {};
  const percent = typeof width === 'string';
  return (
    <Pressable
      style={[flex && { flex: 1 }, percent && { width, flexGrow }]}
      disabled={disabled}
      onPressIn={() => (scale.value = withSpring(0.97, { damping: 20, stiffness: 400 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 20, stiffness: 400 }))}
      onPress={() => {
        tap();
        onPress?.();
      }}
      onLongPress={
        onLongPress &&
        (() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLongPress();
        })
      }
      delayLongPress={delayLongPress}>
      <Animated.View style={[animated, percent ? [inner, { flexGrow: 1 }] : style]}>{children}</Animated.View>
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
  const colors = useColors();
  const styles = useStyles();
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

export function Input({ prefix, suffix, style, ...props }: TextInputProps & { prefix?: ReactNode; suffix?: ReactNode }) {
  const colors = useColors();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.inputWrap, focused && styles.inputFocused, style as StyleProp<ViewStyle>]}>
      {prefix}
      <TextInput
        placeholderTextColor={colors.textDim}
        {...props}
        placeholder={props.placeholder == null ? undefined : translate(props.placeholder)}
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
      {suffix}
    </View>
  );
}

export function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const styles = useStyles();
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
  color,
  height = 4,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  const colors = useColors();
  color ??= colors.accent;
  const styles = useStyles();
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
  color,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const colors = useColors();
  color ??= colors.accent;
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

// path: profildeki avatar_url. Fotoğraf yoksa ya da yüklenemezse baş harf gösterilir.
export function Avatar({ name, size = 40, path }: { name?: string | null; size?: number; path?: string | null }) {
  const colors = useColors();
  const [failed, setFailed] = useState(false);
  const uri = failed ? null : avatarUrl(path);
  const letter = (name ?? '?').charAt(0).toLocaleUpperCase(locale());
  const box = { width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: colors.borderStrong } as const;
  if (uri) {
    return <Image source={{ uri }} style={[box, { backgroundColor: colors.surfaceHigh }]} contentFit="cover" transition={150} onError={() => setFailed(true)} />;
  }
  return (
    <LinearGradient colors={[colors.surfaceHigh, colors.surface]} style={[box, { alignItems: 'center', justifyContent: 'center' }]}>
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
  const colors = useColors();
  const styles = useStyles();
  return (
    <PressScale onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      {icon && <Icon name={icon} size={14} color={active ? colors.primaryText : colors.text} />}
      <Text style={[styles.chipText, active && { color: colors.primaryText }]}>{label}</Text>
    </PressScale>
  );
}

export function IconBox({
  name,
  color,
  bg,
  size = 40,
}: {
  name: IconName;
  color?: string;
  bg?: string;
  size?: number;
}) {
  const colors = useColors();
  color ??= colors.text;
  bg ??= colors.surfaceHigh;
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


// Alttan açılan panel (seçenekler, ürün detayı, mesaj işlemleri).
// Alttan açılan pencere. Üstteki tutamaçtan aşağı çekilince ya da arka plana dokununca kayarak kapanır.
export function Sheet({
  visible,
  onClose,
  children,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const y = useSharedValue(height);

  useEffect(() => {
    if (visible) {
      y.value = height;
      y.value = withSpring(0, { damping: 24, stiffness: 260, mass: 0.9 });
    }
  }, [visible, height, y]);

  const close = useMemo(
    () => () => {
      y.value = withTiming(height, { duration: 220, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onClose)();
      });
    },
    [height, onClose, y],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          y.value = Math.max(0, g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 110 || g.vy > 0.8) close();
          else y.value = withSpring(0, { damping: 24, stiffness: 260 });
        },
        onPanResponderTerminate: () => {
          y.value = withSpring(0, { damping: 24, stiffness: 260 });
        },
      }),
    [close, y],
  );

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, height * 0.6], [1, 0], 'clamp') }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }, backdropStyle]} />
        <Pressable style={{ flex: 1 }} onPress={close} />
        <Animated.View
          style={[
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
              paddingTop: 0,
              paddingBottom: spacing.lg + insets.bottom,
              gap: spacing.md,
              maxHeight: '88%',
              width: '100%',
              maxWidth: 720,
              alignSelf: 'center',
            },
            sheetStyle,
          ]}>
          {/* Tutamaç ve başlık sürüklenebilir alan. */}
          <View {...pan.panHandlers} style={{ paddingTop: spacing.sm + 2, gap: spacing.md, cursor: 'grab', userSelect: 'none' } as ViewStyle}>
            <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong }} />
            {title ? <Heading>{title}</Heading> : <View style={{ height: 4 }} />}
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.md }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.md,
        padding: 4,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <PressScale
            key={o.value}
            flex
            onPress={() => onChange(o.value)}
            style={{
              paddingVertical: 10,
              borderRadius: radius.sm,
              alignItems: 'center',
              backgroundColor: active ? colors.primary : 'transparent',
            }}>
            <Text
              numberOfLines={1}
              style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: active ? colors.primaryText : colors.textMuted }}>
              {o.label}
            </Text>
          </PressScale>
        );
      })}
    </View>
  );
}

// - 72 + gibi sayı ayarı (kilo, yaş, bardak).
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const colors = useColors();
  const btn = {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  return (
    <Row gap={spacing.md}>
      <PressScale onPress={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))} style={btn}>
        <Icon name={{ ios: 'minus', android: 'remove', web: 'remove' }} size={16} />
      </PressScale>
      <Text style={{ fontFamily: fonts.mono, fontSize: 20, color: colors.text, minWidth: 70, textAlign: 'center' }}>
        {value.toLocaleString(locale())}
        {suffix ? <Text style={{ fontSize: 13, color: colors.textMuted }}>{` ${suffix}`}</Text> : null}
      </Text>
      <PressScale onPress={() => onChange(Math.min(max, Math.round((value + step) * 10) / 10))} style={btn}>
        <Icon name={{ ios: 'plus', android: 'add', web: 'add' }} size={16} />
      </PressScale>
    </Row>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const colors = useColors();
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: spacing.xs }}>
      <Heading style={{ fontSize: 20 }}>{title}</Heading>
      {action && (
        <PressScale onPress={onAction}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentBright }}>{action} →</Text>
        </PressScale>
      )}
    </Row>
  );
}

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  const colors = useColors();
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
      <IconBox name={icon} color={colors.accentBright} bg={colors.accentSoft} size={56} />
      <Heading style={{ textAlign: 'center', fontSize: 19 }}>{title}</Heading>
      {body && (
        <Body muted style={{ textAlign: 'center', maxWidth: 300, fontSize: 14 }}>
          {body}
        </Body>
      )}
    </View>
  );
}

// Paketle açılan özellik için kilit kartı.
export function LockedCard({ tier, title, body, onPress }: { tier: Tier; title: string; body: string; onPress: () => void }) {
  return (
    <GradientCard colors={tierColors[tier]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconBox name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} color={tierColors[tier][0]} bg={`${tierColors[tier][1]}33`} />
        <TierBadge tier={tier} />
      </Row>
      <Heading>{title}</Heading>
      <Body muted style={{ fontSize: 14 }}>
        {body}
      </Body>
      <Button title={tx('{0} ile aç', [TIER_INFO[tier].name])} arrow onPress={onPress} />
    </GradientCard>
  );
}

const useStyles = makeStyles((colors) => ({
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
    shadowColor: colors.primary,
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
    minWidth: 0,
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
}));

// Yüklenirken içeriğin yerini tutan, nefes alan gri bloklar.
export function Skeleton({ width = '100%', height = 14, radius: r = 7, style }: { width?: DimensionValue; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const pulse = useSharedValue(0.45);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 750 }), -1, true);
  }, [pulse]);
  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: colors.surfaceHigh }, animated, style]} />;
}

// Hazır iskeletler: "rows" kart listesi, "chat" sohbet balonları, "detail" video/detay ekranı.
export function SkeletonList({ variant = 'rows', count = 4 }: { variant?: 'rows' | 'chat' | 'detail'; count?: number }) {
  const colors = useColors();
  const card = { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.md } as const;
  if (variant === 'detail') {
    return (
      <View style={{ gap: spacing.md }}>
        <Skeleton height={320} radius={radius.lg} />
        <Skeleton width="60%" height={22} />
        <Skeleton width="40%" height={14} />
        <View style={[card, { gap: spacing.sm }]}>
          <Skeleton width="80%" />
          <Skeleton width="55%" />
        </View>
      </View>
    );
  }
  if (variant === 'chat') {
    const widths = [62, 44, 70, 38, 56, 48];
    return (
      <View style={{ gap: spacing.md, paddingTop: spacing.md }}>
        {Array.from({ length: count }, (_, i) => {
          const mine = i % 3 === 2;
          return (
            <View key={i} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              {!mine && <Skeleton width={32} height={32} radius={16} />}
              <View style={{ width: `${widths[i % widths.length]}%`, gap: 6 }}>
                {!mine && <Skeleton width={70} height={10} />}
                <Skeleton height={i % 2 ? 40 : 58} radius={radius.lg} />
              </View>
            </View>
          );
        })}
      </View>
    );
  }
  return (
    <View style={{ gap: spacing.sm }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[card, { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }]}>
          <Skeleton width={36} height={36} radius={18} />
          <View style={{ flex: 1, gap: 7 }}>
            <Skeleton width={`${50 + ((i * 17) % 35)}%`} />
            <Skeleton width={`${30 + ((i * 11) % 25)}%`} height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}
