import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, radius, spacing } from '@/constants/theme';

import { useColors } from './theme';

export type Celebration = { title: string; subtitle?: string; emoji?: string };

const CelebrateContext = createContext<(c: Celebration) => void>(() => {});

// Rekor, seri, hedef dolması gibi anlarda konfeti + titreşim + üstte kısa bir kart.
export function CelebrateProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<(Celebration & { id: number }) | null>(null);
  const queue = useRef<Celebration[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showing = useRef(false);

  const showNext = useCallback(() => {
    const next = queue.current.shift();
    showing.current = Boolean(next);
    if (!next) return setCurrent(null);
    setCurrent({ ...next, id: Date.now() });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    timer.current = setTimeout(showNext, 3200);
  }, []);

  const celebrate = useCallback(
    (c: Celebration) => {
      queue.current.push(c);
      if (!showing.current) showNext();
    },
    [showNext],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <CelebrateContext.Provider value={celebrate}>
      {children}
      {current && <CelebrationOverlay key={current.id} c={current} />}
    </CelebrateContext.Provider>
  );
}

export function useCelebrate() {
  return useContext(CelebrateContext);
}

const PIECES = 46;

function CelebrationOverlay({ c }: { c: Celebration }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const palette = [colors.protein, colors.carb, colors.fat, '#C4B5FD', '#F472B6', colors.text];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: PIECES }, (_, i) => (
        <Piece key={i} color={palette[i % palette.length]} />
      ))}
      <Animated.View
        entering={FadeInUp.springify().damping(16)}
        exiting={FadeOutUp.duration(250)}
        style={[
          styles.toast,
          { top: insets.top + spacing.sm, backgroundColor: colors.surface, borderColor: colors.borderStrong },
        ]}>
        {c.emoji ? <Text style={styles.emoji}>{c.emoji}</Text> : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{c.title.toLocaleUpperCase('tr-TR')}</Text>
          {c.subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{c.subtitle}</Text> : null}
        </View>
      </Animated.View>
    </View>
  );
}

function Piece({ color }: { color: string }) {
  const { width, height } = Dimensions.get('window');
  const start = useRef({
    x: Math.random() * width,
    drift: (Math.random() - 0.5) * 160,
    delay: Math.random() * 350,
    size: 6 + Math.random() * 6,
    spin: (Math.random() - 0.5) * 900,
    round: Math.random() > 0.6,
    duration: 1900 + Math.random() * 1100,
  }).current;
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(start.delay, withTiming(1, { duration: start.duration, easing: Easing.out(Easing.quad) }));
  }, [t, start]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value > 0.85 ? (1 - t.value) / 0.15 : 1,
    transform: [
      { translateX: start.x + start.drift * t.value },
      { translateY: -30 + (height * 0.85 + 30) * t.value },
      { rotate: `${start.spin * t.value}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: start.size,
          height: start.round ? start.size : start.size * 1.6,
          borderRadius: start.round ? start.size / 2 : 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    maxWidth: 520,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  emoji: { fontSize: 34 },
  title: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 0.4 },
  subtitle: { fontFamily: fonts.body, fontSize: 13.5, marginTop: 2 },
});
