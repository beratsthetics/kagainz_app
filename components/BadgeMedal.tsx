import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/T';
import { fonts, radius as radii, tierColors } from '@/constants/theme';
import type { Badge } from '@/lib/progress';
import { tx } from '@/lib/i18n';
import { bandOf, LEVEL_BANDS, levelOf, type LevelBand } from '@/lib/levels';
import { useColors } from '@/lib/theme';
import type { Tier } from '@/lib/tiers';

type Ring = readonly [string, string, ...string[]];

// Madalya efektleri artan sırada: shine parıltı geçer, spin halka döner ve dalga yayar, royal kıvılcım da ekler.
export type MedalFx = 'none' | 'shine' | 'spin' | 'royal';

export const TIER_FX: Record<Tier, MedalFx> = { free: 'none', pro: 'shine', plus: 'spin', max: 'royal' };

function bandFx(band: LevelBand): MedalFx {
  if (band.flow) return 'royal';
  if (band.frame) return 'spin';
  if (band.glow) return 'shine';
  return 'none';
}

function bandRing(band: LevelBand): Ring {
  return (band.flow as unknown as Ring) ?? band.frame ?? [band.color, band.color + '88'];
}

export function Medal({ ring, fx, size = 52, dim, delay = 0, children }: { ring: Ring; fx: MedalFx; size?: number; dim?: boolean; delay?: number; children: ReactNode }) {
  const colors = useColors();
  const round = { width: size, height: size, borderRadius: size / 2 };
  const edge = Math.max(2.5, size * 0.065);
  const spins = !dim && (fx === 'spin' || fx === 'royal');
  return (
    <View style={round}>
      {spins && <Halo size={size} color={ring[0]} delay={delay} />}
      <View style={[round, { overflow: 'hidden' }]}>
        {dim ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.border }]} />
        ) : spins ? (
          <Spin width={size} height={size} ring={ring} duration={3600} />
        ) : (
          <LinearGradient colors={ring} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        <View style={[styles.face, { top: edge, left: edge, right: edge, bottom: edge, borderRadius: size / 2, backgroundColor: colors.surfaceHigh }]}>
          <View style={{ opacity: dim ? 0.3 : 1 }}>{children}</View>
          {!dim && fx !== 'none' && <Shine size={size} delay={delay} />}
        </View>
      </View>
      {!dim && fx === 'royal' && <Sparkles size={size} color={ring[ring.length - 1]} delay={delay} />}
    </View>
  );
}

// Dönen renk geçişi: kutunun köşegeninden büyük bir degrade, kutunun arkasında döner.
function Spin({ width, height, ring, duration }: { width: number; height: number; ring: Ring; duration: number }) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(360, { duration, easing: Easing.linear }), -1, false);
  }, [r, duration]);
  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  const big = Math.hypot(width, height);
  return (
    <Animated.View style={[{ position: 'absolute', width: big, height: big, left: (width - big) / 2, top: (height - big) / 2 }, turn]}>
      <LinearGradient colors={[...ring, ring[0]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
    </Animated.View>
  );
}

function Shine({ size, delay }: { size: number; delay: number }) {
  const x = useSharedValue(-1);
  useEffect(() => {
    x.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), withDelay(2400, withTiming(-1, { duration: 0 }))),
        -1,
        false,
      ),
    );
  }, [x, delay]);
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * size }, { rotate: '20deg' }] }));
  return <Animated.View pointerEvents="none" style={[styles.shine, { width: size * 0.26, height: size * 1.6 }, move]} />;
}

function Halo({ size, color, delay }: { size: number; color: string; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }), -1, false));
  }, [t, delay]);
  const pulse = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - t.value), transform: [{ scale: 1 + t.value * 0.3 }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color }, pulse]}
    />
  );
}

const SPARKS = [
  { x: 0.78, y: -0.08, d: 0 },
  { x: -0.06, y: 0.62, d: 650 },
  { x: 0.84, y: 0.74, d: 1300 },
];

function Sparkles({ size, color, delay }: { size: number; color: string; delay: number }) {
  return (
    <>
      {SPARKS.map((s) => (
        <Spark key={s.d} size={size} color={color} x={s.x} y={s.y} delay={delay + s.d} />
      ))}
    </>
  );
}

function Spark({ size, color, x, y, delay }: { size: number; color: string; x: number; y: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 450 }), withTiming(0, { duration: 650 }), withDelay(900, withTiming(0, { duration: 0 }))), -1, false),
    );
  }, [t, delay]);
  const twinkle = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ scale: 0.5 + t.value * 0.7 }] }));
  return (
    <Animated.Text pointerEvents="none" style={[{ position: 'absolute', left: x * size, top: y * size, fontSize: size * 0.24, color }, twinkle]}>
      ✦
    </Animated.Text>
  );
}

// Rozet madalyası: halka rengi ve efekti rozetin paketinden gelir (Pro, Plus, Max giderek daha canlı).
export function BadgeMedal({ badge, earned, locked, size = 52, delay }: { badge: Badge; earned: boolean; locked?: boolean; size?: number; delay?: number }) {
  return (
    <Medal ring={tierColors[badge.tier]} fx={TIER_FX[badge.tier]} size={size} dim={!earned} delay={delay}>
      <Text style={{ fontSize: size * 0.42 }}>{locked ? '🔒' : badge.emoji}</Text>
    </Medal>
  );
}

// Seviye rozetleri: her seviye aralığı (Çaylak, Azimli, Demir, Altın, Efsane) bir madalya; ulaşılanlar kendi efektiyle oynar.
export function LevelMedals({ xp, size = 46 }: { xp: number | null | undefined; size?: number }) {
  const colors = useColors();
  const level = levelOf(xp);
  return (
    <View style={styles.levelRow}>
      {LEVEL_BANDS.map((band, i) => {
        const reached = level >= band.from;
        return (
          <View key={band.from} style={styles.levelCell}>
            <Medal ring={bandRing(band)} fx={bandFx(band)} size={size} dim={!reached} delay={i * 400}>
              <Text raw style={{ fontFamily: fonts.display, fontSize: size * 0.36, color: reached ? band.color : colors.textDim }}>
                {band.mark ?? band.from}
              </Text>
            </Medal>
            <Text numberOfLines={1} style={[styles.levelName, { color: reached ? band.color : colors.textDim }]}>
              {tx(band.name)}
            </Text>
            <Text raw style={[styles.levelFrom, { color: colors.textMuted }]}>
              LV {band.from}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// Profil fotoğrafı halkası. Pro, Plus ve Max'ta paket renginde döner (Plus dalga, Max kıvılcım da ekler);
// ücretsizde Lv 10 ve üstü seviye renginde sabit halka. still: uzun listelerde (chat) animasyonsuz.
export function AvatarRing({ tier, xp, size, still, children }: { tier?: Tier | null; xp?: number | null; size: number; still?: boolean; children: ReactNode }) {
  const band = bandOf(levelOf(xp));
  const paid = tier != null && tier !== 'free';
  const ring: Ring | null = paid ? tierColors[tier] : band.glow ? bandRing(band) : null;
  if (!ring) return <>{children}</>;
  const fx: MedalFx = paid && !still ? TIER_FX[tier] : 'none';
  const edge = Math.max(2, Math.round(size * 0.05));
  const outer = size + edge * 2;
  const round = { width: outer, height: outer, borderRadius: outer / 2 };
  const spins = fx === 'spin' || fx === 'royal';
  return (
    <View style={round}>
      {spins && <Halo size={outer} color={ring[0]} delay={0} />}
      <View style={[round, { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }]}>
        {fx === 'none' ? (
          <LinearGradient colors={ring} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        ) : (
          <Spin width={outer} height={outer} ring={ring} duration={fx === 'shine' ? 5000 : 3600} />
        )}
        {children}
      </View>
      {fx === 'royal' && <Sparkles size={outer} color={ring[ring.length - 1]} delay={0} />}
    </View>
  );
}

// Pro, Plus ve Max üyelerde rozet vitrininin kenarında paket renginde dönen bir ışık.
export function TierFrame({ tier, children }: { tier: Tier; children: ReactNode }) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  if (tier === 'free') return <>{children}</>;
  const ring = tierColors[tier];
  return (
    <View onLayout={(e) => setBox(e.nativeEvent.layout)} style={{ borderRadius: radii.lg + 2, padding: 2, overflow: 'hidden' }}>
      {box ? <Spin width={box.width} height={box.height} ring={[ring[0], ring[1], 'rgba(0,0,0,0)']} duration={6000} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  face: { position: 'absolute', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.22)' },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  levelCell: { alignItems: 'center', gap: 4, flex: 1 },
  levelName: { fontFamily: fonts.bodyBold, fontSize: 11.5, marginTop: 4 },
  levelFrom: { fontFamily: fonts.mono, fontSize: 10 },
});
