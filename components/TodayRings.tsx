import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Stop } from 'react-native-svg';
import { Text } from '@/components/T';

import { Card, Icon, Label, Row, type IconName } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useCelebrate } from '@/lib/celebrate';
import { useDaily } from '@/lib/daily';
import { GLASS_ML } from '@/lib/goals';
import { locale, tx } from '@/lib/i18n';
import { isTrainingDay } from '@/lib/program';
import { dayKey, useStored } from '@/lib/store';
import { useColors } from '@/lib/theme';
import { doneSets, useWorkouts } from '@/lib/workouts';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 156;
const STROKE = 13;
const GAP = 4;

type RingData = { key: string; label: string; value: number; text: string; icon: IconName; from: string; to: string };

// Ana sayfadaki günlük halkalar: kalori, protein, antrenman ve su. Her halka kendi renk geçişiyle dolar,
// başında ikonu durur. Dördü dolunca günde bir kez konfeti.
export function TodayRings() {
  const colors = useColors();
  const celebrate = useCelebrate();
  const { session } = useAuth();
  const { totals, goals, water, waterGoal } = useDaily();
  const { history, active, program } = useWorkouts();
  const [celebrated, setCelebrated] = useStored<string>('rings-done', '');
  const today = dayKey();

  const trainedToday = history.some((s) => s.endedAt && dayKey(new Date(s.endedAt)) === today);
  const restDay = !isTrainingDay(program);
  const workout = trainedToday || restDay ? 1 : active && doneSets(active) > 0 ? 0.5 : 0;
  const n = (v: number) => v.toLocaleString(locale());

  const rings: RingData[] = [
    {
      key: 'kcal',
      label: 'Kalori',
      value: totals.kcal / goals.kcal,
      text: tx('{0} / {1} kcal', [n(totals.kcal), n(goals.kcal)]),
      icon: { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' },
      from: '#F43F5E',
      to: '#FB923C',
    },
    {
      key: 'protein',
      label: 'Protein',
      value: totals.protein / goals.protein,
      text: `${n(Math.round(totals.protein))} / ${n(goals.protein)} g`,
      icon: { ios: 'bolt.fill', android: 'bolt', web: 'bolt' },
      from: '#6366F1',
      to: '#38BDF8',
    },
    {
      key: 'workout',
      label: 'Antrenman',
      value: workout,
      text: trainedToday ? tx('Tamamlandı') : restDay ? tx('Dinlenme günü') : active ? tx('Devam ediyor') : tx('Bekliyor'),
      icon: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' },
      from: '#F59E0B',
      to: '#FDE047',
    },
    {
      key: 'water',
      label: 'Su',
      value: water / waterGoal,
      text: `${n((water * GLASS_ML) / 1000)} / ${n((waterGoal * GLASS_ML) / 1000)} L`,
      icon: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
      from: '#06B6D4',
      to: '#5EEAD4',
    },
  ];
  const closed = rings.filter((r) => r.value >= 1).length;
  const allClosed = closed === rings.length;
  const overall = Math.round((rings.reduce((sum, r) => sum + Math.min(1, Math.max(0, r.value)), 0) / rings.length) * 100);

  useEffect(() => {
    if (!session || !allClosed || celebrated === today) return;
    setCelebrated(today);
    celebrate({ title: 'Bugünün halkaları tamam!', subtitle: 'Kalori, protein, su ve antrenman hedefini doldurdun.', emoji: '🎯' });
  }, [session, allClosed, celebrated, today, setCelebrated, celebrate]);

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Label>Bugünün halkaları</Label>
        <Text raw style={{ fontFamily: fonts.mono, fontSize: 12, color: allClosed ? colors.success : colors.textMuted }}>
          {tx('{0}/4 tamam', [closed])}
        </Text>
      </Row>
      <Row gap={spacing.lg} style={{ marginTop: spacing.sm }}>
        <View style={{ width: SIZE, height: SIZE }}>
          <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Defs>
              {rings.map((r) => (
                <LinearGradient key={r.key} id={`ring-${r.key}`} x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={r.from} />
                  <Stop offset="1" stopColor={r.to} />
                </LinearGradient>
              ))}
            </Defs>
            {rings.map((r, i) => (
              <Arc key={r.key} ring={r} radius={radiusOf(i)} delay={i * 120} />
            ))}
          </Svg>
          {/* Her halkanın başında (en üstte) küçük ikonu */}
          {rings.map((r, i) => (
            <View
              key={r.key}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: SIZE / 2 - STROKE / 2,
                top: SIZE / 2 - radiusOf(i) - STROKE / 2,
                width: STROKE,
                height: STROKE,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name={r.icon} size={STROKE - 4} color="rgba(0,0,0,0.7)" />
            </View>
          ))}
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Text raw style={{ fontFamily: fonts.display, fontSize: 17, color: colors.text }}>
              {overall}%
            </Text>
          </View>
        </View>

        <View style={{ flex: 1, gap: spacing.sm }}>
          {rings.map((r) => {
            const pct = Math.round(Math.max(0, r.value) * 100);
            return (
              <View key={r.key} style={{ gap: 2 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row gap={6}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.from }} />
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 1.2, color: colors.textMuted }}>
                      {tx(r.label).toLocaleUpperCase(locale())}
                    </Text>
                  </Row>
                  <Text raw style={{ fontFamily: fonts.display, fontSize: 14, color: r.value >= 1 ? r.from : colors.text }}>
                    {pct >= 100 ? '✓' : `${pct}%`}
                  </Text>
                </Row>
                <Text raw numberOfLines={1} style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted }}>
                  {r.text}
                </Text>
              </View>
            );
          })}
        </View>
      </Row>
    </Card>
  );
}

function radiusOf(i: number) {
  return (SIZE - STROKE) / 2 - i * (STROKE + GAP);
}

// Bir halka: soluk iz + renk geçişli dolum. Değer değişince yumuşakça dolar.
function Arc({ ring, radius, delay }: { ring: RingData; radius: number; delay: number }) {
  const c = 2 * Math.PI * radius;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(Math.min(1, Math.max(0, ring.value)), { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [ring.value, delay, progress]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - progress.value) }));
  return (
    <G>
      <Circle cx={SIZE / 2} cy={SIZE / 2} r={radius} stroke={ring.from} strokeOpacity={0.16} strokeWidth={STROKE} fill="none" />
      <AnimatedCircle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={radius}
        stroke={`url(#ring-${ring.key})`}
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${c} ${c}`}
        animatedProps={animatedProps}
      />
    </G>
  );
}
