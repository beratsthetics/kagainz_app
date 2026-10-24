import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/T';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BadgeMedal } from '@/components/BadgeMedal';
import { Button, PressScale } from '@/components/ui';
import { fonts, radius, spacing, tierColors } from '@/constants/theme';

import { useColors } from './theme';
import { locale, tx } from './i18n';
import type { Badge } from './progress';

// badge verilirse üstteki kart yerine tam ekran madalya açılır.
export type Celebration = { title: string; subtitle?: string; emoji?: string; badge?: Badge };

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
    timer.current = setTimeout(showNext, next.badge ? 8000 : 3200);
  }, []);

  const close = useCallback(() => {
    clearTimeout(timer.current);
    showNext();
  }, [showNext]);

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
      {current &&
        (current.badge ? (
          <BadgeReveal key={current.id} badge={current.badge} onClose={close} />
        ) : (
          <CelebrationOverlay key={current.id} c={current} />
        ))}
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
          <Text style={[styles.title, { color: colors.text }]}>{c.title.toLocaleUpperCase(locale())}</Text>
          {c.subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{c.subtitle}</Text> : null}
        </View>
      </Animated.View>
    </View>
  );
}

// Yeni rozet: madalya dönerek büyür, arkasında paket renginde ışık, altında paylaş butonu.
function BadgeReveal({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  const colors = useColors();
  const tint = tierColors[badge.tier];
  const palette = [tint[0], tint[1], colors.text, colors.accentBright];
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = withSpring(1, { damping: 12, stiffness: 110 });
  }, [s]);
  const pop = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { scale: 0.3 + 0.7 * s.value }, { rotateY: `${(1 - s.value) * 540}deg` }],
  }));
  const glow = useAnimatedStyle(() => ({ opacity: 0.2 * Math.min(1, s.value), transform: [{ scale: 0.6 + 0.6 * s.value }] }));
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, styles.reveal]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      {Array.from({ length: PIECES }, (_, i) => (
        <Piece key={i} color={palette[i % palette.length]} />
      ))}
      <View style={styles.revealBody} pointerEvents="box-none">
        <View style={styles.medalBox} pointerEvents="none">
          <Animated.View style={[styles.glow, { backgroundColor: tint[1] }, glow]} />
          <Animated.View style={pop}>
            <BadgeMedal badge={badge} earned size={150} />
          </Animated.View>
        </View>
        <Text style={[styles.eyebrow, { color: tint[0] }]}>{tx('Yeni rozet').toLocaleUpperCase(locale())}</Text>
        <Text style={styles.revealTitle}>{tx(badge.title).toLocaleUpperCase(locale())}</Text>
        <Text style={styles.revealText}>{badge.description}</Text>
        <View style={{ alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md }}>
          <Button
            title="Hikâyede paylaş"
            arrow
            icon={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
            onPress={() => {
              onClose();
              router.push({ pathname: '/share', params: { kind: 'badge', id: badge.id } });
            }}
          />
          <PressScale onPress={onClose} style={{ alignSelf: 'center', padding: spacing.sm }}>
            <Text style={styles.revealClose}>Kapat</Text>
          </PressScale>
        </View>
      </View>
    </Animated.View>
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
      { rotate: tx('{0}deg', [start.spin * t.value]) },
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
  reveal: { backgroundColor: 'rgba(5,6,8,0.88)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  revealBody: { width: '100%', maxWidth: 420, alignItems: 'center', paddingHorizontal: spacing.lg, gap: 6 },
  medalBox: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 2 },
  revealTitle: { fontFamily: fonts.display, fontSize: 38, color: '#F4F4F5', textAlign: 'center' },
  revealText: { fontFamily: fonts.body, fontSize: 15, color: '#A1A1AA', textAlign: 'center' },
  revealClose: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#A1A1AA' },
  title: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 0.4 },
  subtitle: { fontFamily: fonts.body, fontSize: 13.5, marginTop: 2 },
});
