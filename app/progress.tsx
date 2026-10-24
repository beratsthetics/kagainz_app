import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { BodyMap } from '@/components/BodyMap';
import { BarChart, LineChart } from '@/components/Charts';
import { Body, Button, Card, Label, Mono, PressScale, ProgressBar, Reveal, Row, Screen, Segmented, Stat, Stepper, TierBadge } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { loadHistory, useDaily, type DaySummary } from '@/lib/daily';
import { GROUPS, MUSCLES, type Muscle, type MuscleGroup } from '@/lib/exercises';
import type { WeightLog } from '@/lib/goals';
import { useProgress } from '@/lib/progress';
import { dayKey, daysAgo, useStored } from '@/lib/store';
import { useColors } from '@/lib/theme';
import { hasFeature } from '@/lib/tiers';
import { useWorkouts } from '@/lib/workouts';
import { locale, tx } from '@/lib/i18n';

const DAY_LETTERS = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

export default function ProgressScreen() {
  const colors = useColors();
  const { tier } = useAuth();
  const { goals, body, entries } = useDaily();
  const { stats } = useProgress();
  const { history, weeklySets } = useWorkouts();
  const full = hasFeature(tier, 'full_history');
  const [range, setRange] = useState<'7' | '30'>('7');
  const [days, setDays] = useState<DaySummary[]>([]);
  const [weights, setWeights] = useStored<WeightLog[]>('weights', []);
  const [weight, setWeight] = useState(body?.weightKg ?? weights[weights.length - 1]?.kg ?? 75);
  const n = range === '30' && full ? 30 : 7;

  useEffect(() => {
    loadHistory(n).then(setDays);
  }, [n, entries.length]);

  const labels = days.map((d) => (n === 7 ? DAY_LETTERS[d.date.getDay()] : String(d.date.getDate())));
  const logged = days.filter((d) => d.count > 0);
  const avgKcal = logged.length ? Math.round(logged.reduce((a, d) => a + d.totals.kcal, 0) / logged.length) : 0;
  const avgProtein = logged.length ? Math.round(logged.reduce((a, d) => a + d.totals.protein, 0) / logged.length) : 0;

  const weekly = useMemo(() => {
    // Son 8 haftanın antrenman sayısı.
    return Array.from({ length: 8 }, (_, i) => {
      const end = daysAgo(i * 7);
      const start = daysAgo(i * 7 + 7);
      const count = history.filter((s) => {
        const t = new Date(s.startedAt);
        return t > start && t <= end;
      }).length;
      return { label: i === 0 ? 'Bu' : `-${i}`, count };
    }).reverse();
  }, [history]);

  const volume = useMemo(() => weeklySets(), [weeklySets]);
  const byGroup = GROUPS.map((g) => ({
    g,
    sets: (Object.entries(volume) as [Muscle, number][]).filter(([m]) => MUSCLES[m].group === g).reduce((a, [, v]) => a + v, 0),
  }));
  const maxGroup = Math.max(10, ...byGroup.map((x) => x.sets));
  const shownWeights = weights.slice(-(full ? 30 : 7));

  return (
    <Screen edges={[]}>
      <Reveal index={0}>
        <Row gap={spacing.sm}>
          <Stat label="Seri" value={tx('{0} gün', [stats.streak])} color={colors.fat} />
          <Stat label="En iyi seri" value={tx('{0} gün', [stats.bestStreak])} />
        </Row>
        <Row gap={spacing.sm} style={{ marginTop: spacing.sm }}>
          <Stat label="Antrenman" value={`${stats.workouts}`} color={colors.accentBright} />
          <Stat label="Öğün kaydı" value={`${stats.meals}`} color={colors.carb} />
        </Row>
      </Reveal>

      <Reveal index={1}>
        <Row gap={spacing.sm}>
          <View style={{ flex: 1 }}>
            <Segmented
              options={[
                { value: '7', label: '7 gün' },
                { value: '30', label: '30 gün' },
              ]}
              value={range}
              onChange={(v) => (v === '30' && !full ? router.push('/plans') : setRange(v))}
            />
          </View>
          {!full && <TierBadge tier="pro" />}
        </Row>
      </Reveal>

      <Reveal index={2}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Kalori</Label>
            <Mono style={{ color: colors.textMuted }}>{tx('Ort. {0} · hedef {1}', [avgKcal, goals.kcal])}</Mono>
          </Row>
          <BarChart values={days.map((d) => d.totals.kcal)} labels={labels} goal={goals.kcal} unit="kcal" />
        </Card>
      </Reveal>

      <Reveal index={3}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Protein</Label>
            <Mono style={{ color: colors.textMuted }}>{tx('Ort. {0} g · hedef {1} g', [avgProtein, goals.protein])}</Mono>
          </Row>
          <BarChart values={days.map((d) => d.totals.protein)} labels={labels} goal={goals.protein} unit="g" color={colors.protein} />
        </Card>
      </Reveal>

      <Reveal index={4}>
        <Card>
          <Label>Kilo</Label>
          {shownWeights.length > 1 ? (
            <LineChart
              values={shownWeights.map((w) => w.kg)}
              labels={shownWeights.map((w) => new Date(`${w.day}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }))}
              unit="kg"
            />
          ) : (
            <Body muted style={{ fontSize: 13 }}>
              En az iki gün kilo girince değişim çizgisi çıkar.
            </Body>
          )}
          <Row style={{ justifyContent: 'space-between' }}>
            <Stepper value={weight} onChange={setWeight} step={0.1} min={30} max={300} suffix="kg" />
            <PressScale
              onPress={() => setWeights((prev) => [...prev.filter((w) => w.day !== dayKey()), { day: dayKey(), kg: weight }].slice(-365))}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentBright }}>Bugüne kaydet</Text>
            </PressScale>
          </Row>
        </Card>
      </Reveal>

      <Reveal index={5}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Haftalık antrenman</Label>
            <Mono style={{ color: colors.textMuted }}>son 8 hafta</Mono>
          </Row>
          <BarChart values={weekly.map((w) => w.count)} labels={weekly.map((w) => w.label)} unit="antrenman" color={colors.accentBright} height={120} />
        </Card>
      </Reveal>

      <Reveal index={6}>
        <Card>
          <Label>Son 7 gün · kas grubu başına set</Label>
          <BodyMap heat={volume} height={200} />
          {byGroup.map(({ g, sets }) => (
            <GroupRow key={g} g={g} sets={sets} max={maxGroup} />
          ))}
          <Body muted style={{ fontSize: 12 }}>
            Kas grubu başına haftada 10-20 set çoğu kişi için iyi bir aralık.
          </Body>
        </Card>
      </Reveal>

      <Button title="Rozetlerim" variant="outline" arrow onPress={() => router.push('/badges')} />
    </Screen>
  );
}

function GroupRow({ g, sets, max }: { g: MuscleGroup; sets: number; max: number }) {
  const colors = useColors();
  const good = sets >= 10 && sets <= 20;
  return (
    <View style={{ gap: 4 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.text }}>{g}</Text>
        <Mono style={{ fontSize: 12 }}>{tx('{0} set', [Math.round(sets)])}</Mono>
      </Row>
      <ProgressBar value={sets / max} color={good ? colors.success : colors.accent} height={5} />
    </View>
  );
}
