import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Text } from '@/components/T';

import { MacroBar, WaterTracker } from '@/components/bits';
import { Body, Card, Icon, Label, PressScale, Row, type IconName } from '@/components/ui';
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

const SIZE = 66;
const STROKE = 7;

type RingData = { key: string; label: string; value: number; text: string; icon: IconName; from: string; to: string };

// Ana sayfadaki günlük halkalar: kalori, protein, antrenman ve su yan yana; altında adı ve değeri.
// Her halka kendi renk geçişiyle dolar. Dördü dolunca günde bir kez konfeti.
// Bir halkaya dokununca ayrıntısı altta açılır (makrolar, su bardakları, bugünkü antrenman).
export function TodayRings() {
  const colors = useColors();
  const celebrate = useCelebrate();
  const { session } = useAuth();
  const { totals, goals, water, waterGoal, hasCustomGoals } = useDaily();
  const [open, setOpen] = useState<string | null>(null);
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
      text: `${n(totals.kcal)}/${n(goals.kcal)}`,
      icon: { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' },
      from: '#F43F5E',
      to: '#FB923C',
    },
    {
      key: 'protein',
      label: 'Protein',
      value: totals.protein / goals.protein,
      text: `${n(Math.round(totals.protein))}/${n(goals.protein)} g`,
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
      text: `${n((water * GLASS_ML) / 1000)}/${n((waterGoal * GLASS_ML) / 1000)} L`,
      icon: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
      from: '#06B6D4',
      to: '#5EEAD4',
    },
  ];
  const closed = rings.filter((r) => r.value >= 1).length;
  const allClosed = closed === rings.length;

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
      <Row style={{ marginTop: spacing.sm, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {rings.map((r, i) => {
          const pct = Math.round(Math.max(0, r.value) * 100);
          return (
            <PressScale key={r.key} flex onPress={() => setOpen((o) => (o === r.key ? null : r.key))} style={{ alignItems: 'center', gap: 8, paddingVertical: 4, borderRadius: 14, backgroundColor: open === r.key ? colors.surfaceAlt : 'transparent' }}>
              <View style={{ width: SIZE, height: SIZE }}>
                <Arc ring={r} delay={i * 120} />
                <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Icon name={r.icon} size={15} color={r.from} />
                  <Text raw style={{ fontFamily: fonts.display, fontSize: 13, color: colors.text }}>
                    {pct >= 100 ? '✓' : `${pct}%`}
                  </Text>
                </View>
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.4, color: colors.text }}>
                {tx(r.label)}
              </Text>
              <Text raw numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.textMuted, marginTop: -4 }}>
                {r.text}
              </Text>
            </PressScale>
          );
        })}
      </Row>
      {open === null && (
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textDim, textAlign: 'center' }}>Ayrıntı için bir halkaya dokun</Text>
      )}
      {(open === 'kcal' || open === 'protein') && (
        <View style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
          <MacroBar label="Protein" value={totals.protein} goal={goals.protein} color={colors.protein} />
          <MacroBar label="Karb." value={totals.carb} goal={goals.carb} color={colors.carb} />
          <MacroBar label="Yağ" value={totals.fat} goal={goals.fat} color={colors.fat} />
          <Row style={{ justifyContent: 'space-between' }}>
            <PressScale onPress={() => router.push(hasCustomGoals ? '/macros' : '/goals')}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentBright }}>{hasCustomGoals ? 'Makroya git →' : 'Hedefini kendine göre hesapla →'}</Text>
            </PressScale>
            {totals.kcal > 0 && (
              <PressScale onPress={() => router.push({ pathname: '/share', params: { kind: 'day' } })}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentBright }}>Paylaş</Text>
              </PressScale>
            )}
          </Row>
        </View>
      )}
      {open === 'water' && <WaterTracker />}
      {open === 'workout' && (
        <Row style={{ justifyContent: 'space-between', paddingTop: spacing.xs }}>
          <Body muted style={{ fontSize: 13, flex: 1 }}>
            {trainedToday ? 'Bugünkü antrenmanı bitirdin.' : restDay ? 'Bugün dinlenme günü. Toparlanmak da antrenmanın parçası.' : 'Bugünkü antrenmanın seni bekliyor.'}
          </Body>
          <PressScale onPress={() => router.push(active ? '/workout' : '/training')}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentBright }}>Antrenmana git →</Text>
          </PressScale>
        </Row>
      )}
    </Card>
  );
}

// Bir halka: soluk iz + renk geçişli dolum. Değer değişince yumuşakça dolar.
function Arc({ ring, delay }: { ring: RingData; delay: number }) {
  const radius = (SIZE - STROKE) / 2;
  const c = 2 * Math.PI * radius;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(Math.min(1, Math.max(0, ring.value)), { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [ring.value, delay, progress]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - progress.value) }));
  return (
    <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Defs>
        <LinearGradient id={`ring-${ring.key}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={ring.from} />
          <Stop offset="1" stopColor={ring.to} />
        </LinearGradient>
      </Defs>
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
    </Svg>
  );
}
