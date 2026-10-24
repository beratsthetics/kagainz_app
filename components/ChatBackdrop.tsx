import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { GridBackground } from '@/components/ui';
import { useColors, useTheme } from '@/lib/theme';

// Odanın seviyesine göre chat arka planı. Genel oda sitedeki kareli zemini kullanır;
// Pro mavi elektrik, Plus mor aurora, Max altın ışıltı. Işıklar yavaşça süzülür,
// mesajların okunmasını bozmayacak kadar soluktur.
type Blob = { color: string; size: number; x: number; y: number; dx: number; dy: number; duration: number; opacity: number };
type Look = { blobs: Blob[]; pattern: 'lines' | 'waves' | 'sparkle'; ink: string };

const LOOKS: Record<string, Look> = {
  pro: {
    ink: '#3B82F6',
    pattern: 'lines',
    blobs: [
      { color: '#3B82F6', size: 460, x: -160, y: -120, dx: 60, dy: 50, duration: 9000, opacity: 0.58 },
      { color: '#06B6D4', size: 380, x: 180, y: 420, dx: -50, dy: -70, duration: 11000, opacity: 0.4 },
    ],
  },
  plus: {
    ink: '#A78BFA',
    pattern: 'waves',
    blobs: [
      { color: '#8B5CF6', size: 480, x: 120, y: -160, dx: -70, dy: 60, duration: 10000, opacity: 0.6 },
      { color: '#EC4899', size: 360, x: -140, y: 320, dx: 60, dy: -40, duration: 12000, opacity: 0.4 },
      { color: '#6366F1', size: 320, x: 200, y: 620, dx: -40, dy: -60, duration: 9000, opacity: 0.36 },
    ],
  },
  max: {
    ink: '#F5C451',
    pattern: 'sparkle',
    blobs: [
      { color: '#F59E0B', size: 520, x: 60, y: -260, dx: -40, dy: 40, duration: 12000, opacity: 0.54 },
      { color: '#FDE68A', size: 300, x: -120, y: 520, dx: 50, dy: -50, duration: 10000, opacity: 0.29 },
      { color: '#B45309', size: 380, x: 220, y: 300, dx: -60, dy: 30, duration: 14000, opacity: 0.36 },
    ],
  },
};

export function ChatBackdrop({ room }: { room: string }) {
  const look = LOOKS[room];
  const { mode } = useTheme();
  if (!look) return <GridBackground glow={false} />;
  const dim = mode === 'dark' ? 1 : 0.6;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {look.blobs.map((b, i) => (
        <GlowBlob key={i} id={`${room}-${i}`} blob={b} dim={dim} />
      ))}
      <PatternLayer id={room} kind={look.pattern} ink={look.ink} dim={dim} />
      {look.pattern === 'sparkle' && <Sparkles ink={look.ink} dim={dim} />}
      <Vignette id={room} />
    </View>
  );
}

function GlowBlob({ id, blob, dim }: { id: string; blob: Blob; dim: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: blob.duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, blob.duration]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: blob.x + blob.dx * t.value }, { translateY: blob.y + blob.dy * t.value }, { scale: 1 + 0.08 * t.value }],
  }));
  const r = blob.size / 2;
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: blob.size, height: blob.size }, style]}>
      <Svg width={blob.size} height={blob.size}>
        <Defs>
          <RadialGradient id={`blob-${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={blob.color} stopOpacity={blob.opacity * dim} />
            <Stop offset="1" stopColor={blob.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#blob-${id})`} />
      </Svg>
    </Animated.View>
  );
}

function PatternLayer({ id, kind, ink, dim }: { id: string; kind: Look['pattern']; ink: string; dim: number }) {
  const o = 0.14 * dim;
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        {kind === 'lines' && (
          // İnce çapraz çizgiler.
          <Pattern id={`pat-${id}`} width={28} height={28} patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <Line x1={0} y1={0} x2={0} y2={28} stroke={ink} strokeOpacity={o} strokeWidth={1} />
          </Pattern>
        )}
        {kind === 'waves' && (
          // Noktalı ızgara.
          <Pattern id={`pat-${id}`} width={22} height={22} patternUnits="userSpaceOnUse">
            <Circle cx={11} cy={11} r={1.1} fill={ink} fillOpacity={o * 1.6} />
          </Pattern>
        )}
        {kind === 'sparkle' && (
          // Seyrek altın noktalar ve ince çapraz çizgiler.
          <Pattern id={`pat-${id}`} width={36} height={36} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Line x1={0} y1={0} x2={0} y2={36} stroke={ink} strokeOpacity={o * 0.7} strokeWidth={0.75} />
            <Circle cx={18} cy={18} r={0.9} fill={ink} fillOpacity={o * 2} />
          </Pattern>
        )}
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#pat-${id})`} />
    </Svg>
  );
}

// Max odasında yanıp sönen küçük ışıltılar.
const SPARKS = [
  { x: '12%', y: '18%', d: 0 },
  { x: '78%', y: '12%', d: 900 },
  { x: '62%', y: '38%', d: 1800 },
  { x: '22%', y: '55%', d: 600 },
  { x: '86%', y: '64%', d: 1400 },
  { x: '40%', y: '78%', d: 2200 },
  { x: '8%', y: '88%', d: 300 },
] as const;

function Sparkles({ ink, dim }: { ink: string; dim: number }) {
  return (
    <>
      {SPARKS.map((s, i) => (
        <Spark key={i} left={s.x} top={s.y} delay={s.d} ink={ink} dim={dim} />
      ))}
    </>
  );
}

function Spark({ left, top, delay, ink, dim }: { left: `${number}%`; top: `${number}%`; delay: number; ink: string; dim: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({ opacity: 0.15 + 0.75 * t.value * dim, transform: [{ scale: 0.6 + 0.6 * t.value }, { rotate: '45deg' }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left, top, width: 6, height: 6, borderRadius: 1, backgroundColor: ink, shadowColor: ink, shadowOpacity: 0.9, shadowRadius: 6 }, style]} />
  );
}

// Kenarları zemine doğru karartır, ışıklar ekrana yayılmasın.
function Vignette({ id }: { id: string }) {
  const colors = useColors();
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={`vig-${id}`} cx="50%" cy="45%" rx="80%" ry="75%">
          <Stop offset="0.65" stopColor={colors.background} stopOpacity={0} />
          <Stop offset="1" stopColor={colors.background} stopOpacity={0.6} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#vig-${id})`} />
    </Svg>
  );
}
