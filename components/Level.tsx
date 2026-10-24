import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/T';
import { fonts } from '@/constants/theme';
import { tx } from '@/lib/i18n';
import { bandOf, levelOf, xpFor } from '@/lib/levels';
import { useColors } from '@/lib/theme';

// "LV 12" rozeti; Lv 20 ve üstünde çerçevesiyle aynı degrade.
export function LevelBadge({ xp, size = 'sm' }: { xp: number | null | undefined; size?: 'sm' | 'md' }) {
  const level = levelOf(xp);
  const band = bandOf(level);
  const fontSize = size === 'md' ? 12 : 10;
  const pad = { paddingHorizontal: size === 'md' ? 9 : 6, paddingVertical: size === 'md' ? 3 : 2, borderRadius: 999 };
  const label = (
    <Text raw style={{ fontFamily: fonts.mono, fontSize, letterSpacing: 0.5, color: band.frame ? '#08090B' : band.color }}>
      LV {level}
    </Text>
  );
  if (band.frame) {
    return (
      <LinearGradient colors={band.frame} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pad}>
        {label}
      </LinearGradient>
    );
  }
  return <View style={[pad, { borderWidth: 1, borderColor: band.color + '66', backgroundColor: band.color + '1A' }]}>{label}</View>;
}

// Kullanıcı adı seviyeye göre renklenir, parlar, Lv 30'da renkleri akar.
export function LevelName({ username, xp, style }: { username: string; xp: number | null | undefined; style?: StyleProp<TextStyle> }) {
  const band = bandOf(levelOf(xp));
  const text = `${band.mark ? band.mark + ' ' : ''}@${username}`;
  // Lv 1-4 ismi olduğu gibi bırakır; sonrası seviye rengini alır.
  const look: TextStyle = {
    ...(band.from > 1 && { color: band.color }),
    ...(band.glow && { textShadowColor: band.color + '99', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } }),
    ...(band.display && { fontFamily: fonts.display, fontSize: Math.max(14, StyleSheet.flatten(style)?.fontSize ?? 14), letterSpacing: 0.4 }),
  };
  if (band.flow) return <FlowName text={text} colors={band.flow} style={[style, look]} />;
  return (
    <Text raw style={[style, look]}>
      {text}
    </Text>
  );
}

function FlowName({ text, colors, style }: { text: string; colors: string[]; style: StyleProp<TextStyle> }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2400 }), -1, true);
  }, [t]);
  const steps = colors.map((_, i) => i / (colors.length - 1));
  const animated = useAnimatedStyle(() => {
    const c = interpolateColor(t.value, steps, colors);
    return { color: c, textShadowColor: c };
  });
  return <Animated.Text style={[style, animated]}>{text}</Animated.Text>;
}

// Lv 20 ve üstünde mesaj balonunun etrafında degrade çerçeve.
export function LevelFrame({ xp, radius, style, children }: { xp: number | null | undefined; radius: ViewStyle; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const band = bandOf(levelOf(xp));
  if (!band.frame) return <>{children}</>;
  return (
    <LinearGradient colors={band.frame} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[radius, { padding: 1.5 }, style]}>
      {children}
    </LinearGradient>
  );
}

// Profilde: seviye adı, bir sonraki seviyeye kalan XP ve ilerleme çubuğu.
export function LevelProgress({ xp }: { xp: number | null | undefined }) {
  const colors = useColors();
  const level = levelOf(xp);
  const band = bandOf(level);
  const from = xpFor(level);
  const to = xpFor(level + 1);
  const value = Math.max(0, xp ?? 0);
  return (
    <View style={{ alignSelf: 'stretch', gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: band.color }}>{tx(band.name)}</Text>
        <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted }}>{tx('{0} / {1} XP', [value, to])}</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceHigh, overflow: 'hidden' }}>
        <LinearGradient
          colors={band.frame ?? [band.color, band.color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 6, width: `${Math.min(100, ((value - from) / (to - from)) * 100)}%` }}
        />
      </View>
    </View>
  );
}
