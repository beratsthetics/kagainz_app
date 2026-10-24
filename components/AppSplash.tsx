import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/T';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Line, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { fonts } from '@/constants/theme';

// Açılış ekranı: sistemin splash'iyle (siyah zemin, K ve mavi çizgi) birebir aynı başlar,
// sonra logo yukarı kayar, KAGAINZ yazısı ve yükleme çizgisi gelir; uygulama hazır olunca kaybolur.
// Marka ekranı olduğu için tema ne olursa olsun koyu.
const BG = '#08090B';
const ACCENT = '#3B82F6';
const MIN_MS = 1500;

export function AppSplash({ ready }: { ready: boolean }) {
  const [minDone, setMinDone] = useState(false);
  const [gone, setGone] = useState(false);
  const intro = useSharedValue(0);
  const bar = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    intro.value = withDelay(150, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
    bar.value = withDelay(400, withTiming(0.8, { duration: MIN_MS - 400, easing: Easing.out(Easing.quad) }));
    const t = setTimeout(() => setMinDone(true), MIN_MS);
    return () => clearTimeout(t);
  }, [intro, bar]);

  useEffect(() => {
    if (!ready || !minDone) return;
    bar.value = withTiming(1, { duration: 250 });
    exit.value = withDelay(
      250,
      withTiming(1, { duration: 420, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setGone)(true);
      }),
    );
  }, [ready, minDone, bar, exit]);

  const root = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const content = useAnimatedStyle(() => ({ transform: [{ scale: 1 + exit.value * 0.08 }] }));
  const logo = useAnimatedStyle(() => ({ transform: [{ translateY: -50 * intro.value }, { scale: 1 - 0.1 * intro.value }] }));
  const word = useAnimatedStyle(() => ({ opacity: intro.value, transform: [{ translateY: 18 * (1 - intro.value) }] }));
  const tagline = useAnimatedStyle(() => ({ opacity: Math.max(0, intro.value * 2 - 1) }));
  const fill = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));

  if (gone) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, root]} pointerEvents={ready && minDone ? 'none' : 'auto'}>
      <StatusBar style="light" />
      <Grid />
      <Animated.View style={[styles.center, content]}>
        <Animated.View style={logo}>
          <Image source={require('@/assets/images/splash-icon.png')} style={styles.logo} contentFit="contain" />
        </Animated.View>
        <Animated.View style={[styles.words, word]}>
          <Text style={styles.word}>KAGAINZ</Text>
          <Animated.Text style={[styles.tagline, tagline]}>ONLINE FİTNESS</Animated.Text>
        </Animated.View>
      </Animated.View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fill]} />
      </View>
    </Animated.View>
  );
}

function Grid() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="splash-grid" width={32} height={32} patternUnits="userSpaceOnUse">
            <Line x1={0} y1={0} x2={32} y2={0} stroke="#FFFFFF" strokeOpacity={0.04} strokeWidth={1} />
            <Line x1={0} y1={0} x2={0} y2={32} stroke="#FFFFFF" strokeOpacity={0.04} strokeWidth={1} />
          </Pattern>
          <RadialGradient id="splash-glow" cx="50%" cy="45%" r="55%">
            <Stop offset="0" stopColor={ACCENT} stopOpacity={0.18} />
            <Stop offset="1" stopColor={ACCENT} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#splash-grid)" />
        <Rect width="100%" height="100%" fill="url(#splash-glow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: BG, zIndex: 1000 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 240, height: 240 },
  words: { position: 'absolute', top: '50%', marginTop: 24, alignItems: 'center', gap: 8 },
  word: { fontFamily: fonts.display, fontSize: 46, letterSpacing: 8, color: '#F4F4F5', paddingLeft: 8 },
  tagline: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2.4, color: '#8B8D98' },
  track: {
    position: 'absolute',
    left: '30%',
    right: '30%',
    bottom: 72,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2, backgroundColor: ACCENT },
});
