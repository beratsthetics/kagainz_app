import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { Card, Label, Ring, Row } from '@/components/ui';
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

const SIZE = 156;
const STROKE = 12;
const GAP = 4;

// Ana sayfadaki günlük halkalar: kalori, protein, antrenman ve su (benzer renkler yan yana gelmesin diye bu sırada). Dördü dolunca günde bir kez konfeti.
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

  const rings = [
    { label: 'Kalori', value: totals.kcal / goals.kcal, color: colors.danger, text: `${n(totals.kcal)} / ${n(goals.kcal)}` },
    { label: 'Protein', value: totals.protein / goals.protein, color: colors.protein, text: `${n(Math.round(totals.protein))} / ${n(goals.protein)} g` },
    {
      label: 'Antrenman',
      value: workout,
      color: colors.fat,
      text: trainedToday ? tx('Tamamlandı') : restDay ? tx('Dinlenme günü') : active ? tx('Devam ediyor') : tx('Bekliyor'),
    },
    { label: 'Su', value: water / waterGoal, color: colors.water, text: `${n((water * GLASS_ML) / 1000)} / ${n((waterGoal * GLASS_ML) / 1000)} L` },
  ];
  const closed = rings.filter((r) => r.value >= 1).length;
  const allClosed = closed === rings.length;

  useEffect(() => {
    if (!session || !allClosed || celebrated === today) return;
    setCelebrated(today);
    celebrate({ title: 'Bugünün halkaları tamam!', subtitle: 'Kalori, protein, su ve antrenman hedefini doldurdun.', emoji: '🎯' });
  }, [session, allClosed, celebrated, today, setCelebrated, celebrate]);

  // Halkalar iç içe: her biri bir öncekinin içine çizilir.
  const nested = rings.reduceRight<ReactNode>(
    (inner, r, i) => (
      <Ring value={r.value} size={SIZE - i * 2 * (STROKE + GAP)} stroke={STROKE} color={r.color}>
        {inner}
      </Ring>
    ),
    <Text raw style={{ fontFamily: fonts.display, fontSize: 16, color: colors.text }}>
      {closed}/4
    </Text>,
  );

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Label>Bugünün halkaları</Label>
        {allClosed && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.success }}>Hepsi tamam 🎯</Text>}
      </Row>
      <Row gap={spacing.lg} style={{ marginTop: spacing.xs }}>
        {nested}
        <View style={{ flex: 1, gap: spacing.sm + 2 }}>
          {rings.map((r) => (
            <View key={r.label} style={{ gap: 1 }}>
              <Row gap={6}>
                <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: r.color }} />
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 1.2, color: colors.textMuted }}>{tx(r.label).toLocaleUpperCase(locale())}</Text>
              </Row>
              <Text raw style={{ fontFamily: fonts.mono, fontSize: 13, color: r.value >= 1 ? colors.text : colors.textMuted }}>
                {r.text}
              </Text>
            </View>
          ))}
        </View>
      </Row>
    </Card>
  );
}
