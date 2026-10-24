import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/T';
import Svg, { Defs, Line, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { LOGO_BLUE, LogoMark } from '@/components/Logo';
import { fonts } from '@/constants/theme';
import { type Macros } from '@/lib/macros';
import { type WeekSummary } from '@/lib/week';
import { type WorkoutMeta } from '@/lib/workouts';
import { locale, tx } from '@/lib/i18n';

// Instagram hikâyesi boyutunda (9:16) paylaşım kartı. Ekranda 360x640 çizilir,
// paylaşırken 1080x1920 olarak kaydedilir.
export const CARD_W = 360;
export const CARD_H = 640;

export type CardStyle = 'dark' | 'blue' | 'light';

export type CardData =
  | { kind: 'day'; date: Date; totals: Macros; goals: Macros; water: number; waterGoal: number; streak: number; username?: string | null }
  | { kind: 'workout'; date: Date; meta: WorkoutMeta; streak: number; username?: string | null }
  | { kind: 'week'; week: WeekSummary; username?: string | null }
  | { kind: 'badge'; date: Date; emoji: string; title: string; description: string; earned: number; total: number; username?: string | null };

const PALETTE = {
  dark: { bg: '#08090B', text: '#F4F4F5', muted: '#8B8D98', line: 'rgba(255,255,255,0.10)', tile: 'rgba(255,255,255,0.05)', logo: '#F4F4F5' },
  blue: { bg: '#061433', text: '#FFFFFF', muted: 'rgba(255,255,255,0.7)', line: 'rgba(255,255,255,0.18)', tile: 'rgba(255,255,255,0.09)', logo: '#FFFFFF' },
  light: { bg: '#F4F4F6', text: '#0B0C0F', muted: '#5B5E6A', line: 'rgba(0,0,0,0.10)', tile: 'rgba(0,0,0,0.04)', logo: '#0B0C0F' },
};
const MACRO = { protein: '#60A5FA', carb: '#4ADE80', fat: '#FBBF24' };

const num = (n: number) => Math.round(n).toLocaleString(locale());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ShareCard({ data, variant, ref }: { data: CardData; variant: CardStyle; ref?: Ref<any> }) {
  const p = PALETTE[variant];
  const date = data.kind === 'week' ? data.week.label : data.date.toLocaleDateString(locale(), { day: 'numeric', month: 'long', weekday: 'long' });

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: p.bg }]}>
      <Backdrop variant={variant} />
      <View style={styles.header}>
        <LogoMark height={30} color={p.logo} />
        <View>
          <Text style={[styles.brand, { color: p.text }]}>KAGAINZ</Text>
          <Text style={[styles.brandSub, { color: p.muted }]}>ONLINE FİTNESS</Text>
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', gap: 18 }}>
        <Text style={[styles.eyebrow, { color: p.muted }]}>{date.toLocaleUpperCase(locale())}</Text>
        {data.kind === 'day' && <DayBody data={data} p={p} />}
        {data.kind === 'workout' && <WorkoutBody data={data} p={p} />}
        {data.kind === 'week' && <WeekBody data={data} p={p} />}
        {data.kind === 'badge' && <BadgeBody data={data} p={p} />}
      </View>

      <View style={[styles.footer, { borderTopColor: p.line }]}>
        <Text style={[styles.footerText, { color: p.muted }]}>{data.username ? `@${data.username}` : 'kagainz'}</Text>
        <Text style={[styles.footerText, { color: p.muted }]}>@kagainzz</Text>
      </View>
    </View>
  );
}

type P = (typeof PALETTE)['dark'];

function Big({ value, unit, p }: { value: string; unit: string; p: P }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
      <Text style={[styles.big, { color: p.text }]}>{value}</Text>
      <Text style={[styles.unit, { color: p.muted }]}>{unit}</Text>
    </View>
  );
}

function Tile({ label, value, p, accent }: { label: string; value: string; p: P; accent?: string }) {
  return (
    <View style={[styles.tile, { backgroundColor: p.tile, borderColor: p.line }]}>
      <Row>
        {accent && <View style={[styles.dot, { backgroundColor: accent }]} />}
        <Text style={[styles.tileLabel, { color: p.muted }]}>{label.toLocaleUpperCase(locale())}</Text>
      </Row>
      <Text style={[styles.tileValue, { color: p.text }]}>{value}</Text>
    </View>
  );
}

function Row({ children, gap = 6 }: { children: ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>{children}</View>;
}

function Bar({ label, value, goal, color, p }: { label: string; value: number; goal: number; color: string; p: P }) {
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[styles.tileLabel, { color: p.muted }]}>{label}</Text>
        <Text style={[styles.mono, { color: p.text }]}>
          {num(value)}
          <Text style={{ color: p.muted }}> / {num(goal)} g</Text>
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: p.line }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function DayBody({ data, p }: { data: Extract<CardData, { kind: 'day' }>; p: P }) {
  return (
    <>
      <Text style={[styles.title, { color: p.text }]}>{tx('GÜNÜMÜ{0}KAPATTIM', ['\n'])}</Text>
      <Big value={num(data.totals.kcal)} unit={tx('/ {0} KCAL', [num(data.goals.kcal)])} p={p} />
      <View style={{ gap: 12 }}>
        <Bar label="PROTEİN" value={data.totals.protein} goal={data.goals.protein} color={MACRO.protein} p={p} />
        <Bar label="KARB." value={data.totals.carb} goal={data.goals.carb} color={MACRO.carb} p={p} />
        <Bar label="YAĞ" value={data.totals.fat} goal={data.goals.fat} color={MACRO.fat} p={p} />
      </View>
      <Row gap={8}>
        <Tile label="Su" value={tx('{0}/{1} bardak', [data.water, data.waterGoal])} p={p} />
        <Tile label="Seri" value={tx('🔥 {0} gün', [data.streak])} p={p} />
      </Row>
    </>
  );
}

function WorkoutBody({ data, p }: { data: Extract<CardData, { kind: 'workout' }>; p: P }) {
  const m = data.meta;
  return (
    <>
      <Text style={[styles.title, { color: p.text }]} numberOfLines={2}>
        {m.title.toLocaleUpperCase(locale())}
      </Text>
      <Big value={num(m.volume)} unit="KG TOPLAM" p={p} />
      <Row gap={8}>
        <Tile label="Süre" value={tx('{0} dk', [m.minutes])} p={p} />
        <Tile label="Set" value={`${m.sets}`} p={p} />
        <Tile label="Rekor" value={m.prs.length ? `🏆 ${m.prs.length}` : '–'} p={p} />
      </Row>
      <View style={[styles.list, { borderColor: p.line }]}>
        {m.exercises.slice(0, 5).map((e, i) => (
          <View key={i} style={[styles.listRow, i > 0 && { borderTopWidth: 1, borderTopColor: p.line }]}>
            <Text style={[styles.listName, { color: p.text }]} numberOfLines={1}>
              {e.name}
            </Text>
            <Text style={[styles.mono, { color: p.muted }]}>{e.best}</Text>
          </View>
        ))}
        {m.exercises.length > 5 && <Text style={[styles.more, { color: p.muted }]}>{tx('+{0} hareket daha', [m.exercises.length - 5])}</Text>}
      </View>
    </>
  );
}

const WEEKDAYS = ['P', 'S', 'Ç', 'P', 'C', 'C', 'P'];

function WeekBody({ data, p }: { data: Extract<CardData, { kind: 'week' }>; p: P }) {
  const w = data.week;
  const delta = w.weightStart != null && w.weightEnd != null ? Math.round((w.weightEnd - w.weightStart) * 10) / 10 : null;
  return (
    <>
      <Text style={[styles.title, { color: p.text }]}>{tx('HAFTAMIN{0}ÖZETİ', ['\n'])}</Text>
      <Big value={`${w.workouts}`} unit={w.workouts === 1 ? 'ANTRENMAN' : 'ANTRENMAN'} p={p} />
      <Row gap={6}>
        {w.days.map((d, i) => (
          <View key={d.day} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View
              style={[
                styles.dayDot,
                { borderColor: p.line },
                d.workouts > 0 ? { backgroundColor: LOGO_BLUE, borderColor: LOGO_BLUE } : d.active ? { backgroundColor: p.tile, borderColor: p.muted } : null,
              ]}>
              {d.workouts > 0 && <Text style={{ fontSize: 13 }}>💪</Text>}
            </View>
            <Text style={[styles.tileLabel, { color: p.muted }]}>{WEEKDAYS[i]}</Text>
          </View>
        ))}
      </Row>
      <Row gap={8}>
        <Tile label="Ort. kalori" value={w.avgKcal ? `${num(w.avgKcal)}` : '–'} p={p} />
        <Tile label="Ort. protein" value={w.avgProtein ? `${num(w.avgProtein)} g` : '–'} p={p} accent={MACRO.protein} />
      </Row>
      <Row gap={8}>
        <Tile label="Hacim" value={w.volume ? tx('{0} kg', [num(w.volume)]) : '–'} p={p} />
        <Tile label="Kilo" value={delta == null ? '–' : tx('{0}{1} kg', [delta > 0 ? '+' : '', delta.toLocaleString(locale())])} p={p} />
        <Tile label="Seri" value={`🔥 ${w.streak}`} p={p} />
      </Row>
    </>
  );
}

function BadgeBody({ data, p }: { data: Extract<CardData, { kind: 'badge' }>; p: P }) {
  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <Text style={[styles.tileLabel, { color: p.muted }]}>YENİ ROZET</Text>
      <View style={[styles.badgeRing, { borderColor: LOGO_BLUE, backgroundColor: p.tile }]}>
        <Text style={{ fontSize: 96, lineHeight: 116 }}>{data.emoji}</Text>
      </View>
      <Text style={[styles.title, { color: p.text, textAlign: 'center' }]} numberOfLines={2}>
        {data.title.toLocaleUpperCase(locale())}
      </Text>
      <Text style={[styles.listName, { color: p.muted, textAlign: 'center' }]}>{data.description}</Text>
      <Text style={[styles.mono, { color: p.muted }]}>{tx('KOLEKSİYON {0}/{1}', [data.earned, data.total])}</Text>
    </View>
  );
}

function Backdrop({ variant }: { variant: CardStyle }) {
  const lineColor = variant === 'light' ? '#000000' : '#FFFFFF';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {variant === 'blue' && (
        <LinearGradient colors={['#0B3A9E', '#06204F', '#050B1A']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      )}
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={`card-grid-${variant}`} width={24} height={24} patternUnits="userSpaceOnUse">
            <Line x1={0} y1={0} x2={24} y2={0} stroke={lineColor} strokeOpacity={0.05} strokeWidth={1} />
            <Line x1={0} y1={0} x2={0} y2={24} stroke={lineColor} strokeOpacity={0.05} strokeWidth={1} />
          </Pattern>
          <RadialGradient id={`card-glow-${variant}`} cx="85%" cy="8%" r="70%">
            <Stop offset="0" stopColor={LOGO_BLUE} stopOpacity={variant === 'light' ? 0.18 : 0.35} />
            <Stop offset="1" stopColor={LOGO_BLUE} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#card-grid-${variant})`} />
        <Rect width="100%" height="100%" fill={`url(#card-glow-${variant})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRing: { width: 180, height: 180, borderRadius: 90, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  card: { width: CARD_W, height: CARD_H, padding: 26, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 2, lineHeight: 22 },
  brandSub: { fontFamily: fonts.bodyBold, fontSize: 8, letterSpacing: 2.4 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2.2 },
  title: { fontFamily: fonts.display, fontSize: 46, lineHeight: 48, letterSpacing: 0.5 },
  big: { fontFamily: fonts.display, fontSize: 64, lineHeight: 68 },
  unit: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.6, marginBottom: 12 },
  tile: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, gap: 4 },
  tileLabel: { fontFamily: fonts.bodyBold, fontSize: 9.5, letterSpacing: 1.4 },
  tileValue: { fontFamily: fonts.displayMedium, fontSize: 17 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  mono: { fontFamily: fonts.mono, fontSize: 12 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  list: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, gap: 10 },
  listName: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13 },
  more: { fontFamily: fonts.body, fontSize: 11.5, paddingBottom: 9 },
  dayDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12 },
  footerText: { fontFamily: fonts.mono, fontSize: 11 },
});
