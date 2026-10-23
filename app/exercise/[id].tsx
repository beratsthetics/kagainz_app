import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { BodyMap } from '@/components/BodyMap';
import { LineChart } from '@/components/Charts';
import { MovementAnim } from '@/components/MovementAnim';
import { Body, Button, Card, EmptyState, Label, LockedCard, Mono, Reveal, Row, Screen, Stat, Tag, Title } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { exerciseById, isUnlocked, MUSCLES } from '@/lib/exercises';
import { makeStyles, useColors } from '@/lib/theme';
import { hasFeature } from '@/lib/tiers';
import { e1rm, useWorkouts } from '@/lib/workouts';

export default function ExerciseScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tier } = useAuth();
  const { records, history, active, addExercise } = useWorkouts();
  const ex = exerciseById(id ?? '');

  if (!ex) {
    return (
      <Screen edges={[]}>
        <EmptyState icon={{ ios: 'questionmark.circle', android: 'help', web: 'help' }} title="Hareket bulunamadı" />
      </Screen>
    );
  }

  const open = isUnlocked(ex, hasFeature(tier, 'full_library'));
  const rec = records[ex.id];
  // Her antrenmandaki en iyi tahmini 1RM.
  const points = history
    .map((s) => {
      const e = s.exercises.find((x) => x.exerciseId === ex.id);
      if (!e) return null;
      const best = Math.max(0, ...e.sets.filter((x) => x.done).map((x) => e1rm(x.kg ?? 0, x.reps ?? 0)));
      return best > 0 ? { date: new Date(s.startedAt), v: best } : null;
    })
    .filter((x): x is { date: Date; v: number } => x != null)
    .slice(-12);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <Reveal index={0}>
        <Title style={{ fontSize: 34, lineHeight: 38 }}>{ex.trName}</Title>
        <Row gap={6} style={{ marginTop: spacing.xs, flexWrap: 'wrap' }}>
          <Tag>{MUSCLES[ex.primary[0]].group}</Tag>
          <Tag color={colors.textMuted} bg={colors.surfaceAlt}>
            {ex.equipment}
          </Tag>
          {ex.name !== ex.trName && <Text style={styles.en}>{ex.name}</Text>}
        </Row>
      </Reveal>

      {!open ? (
        <LockedCard tier="pro" title="Bu hareket Pro'da" body="Tüm hareket kütüphanesi, animasyonlar ve kas haritası Pro ile açılır." onPress={() => router.push('/plans')} />
      ) : (
        <>
          <Reveal index={1}>
            <View style={styles.anim}>
              <MovementAnim pattern={ex.pattern} size={300} />
            </View>
          </Reveal>

          <Reveal index={2}>
            <Card>
              <Label>Çalışan kaslar</Label>
              <BodyMap primary={ex.primary} secondary={ex.secondary} height={230} />
              <Row gap={spacing.md} style={{ justifyContent: 'center' }}>
                <Row gap={6}>
                  <View style={[styles.dot, { backgroundColor: colors.accentBright }]} />
                  <Text style={styles.legend}>{ex.primary.map((m) => MUSCLES[m].name).join(', ')}</Text>
                </Row>
              </Row>
              {ex.secondary.length > 0 && (
                <Row gap={6} style={{ justifyContent: 'center' }}>
                  <View style={[styles.dot, { backgroundColor: colors.accent, opacity: 0.5 }]} />
                  <Text style={[styles.legend, { color: colors.textMuted }]}>Yardımcı: {ex.secondary.map((m) => MUSCLES[m].name).join(', ')}</Text>
                </Row>
              )}
            </Card>
          </Reveal>

          <Reveal index={3}>
            <Card>
              <Label>Nasıl yapılır</Label>
              {ex.steps.map((s, i) => (
                <Row key={i} gap={spacing.md} style={{ alignItems: 'flex-start' }}>
                  <View style={styles.step}>
                    <Text style={styles.stepText}>{i + 1}</Text>
                  </View>
                  <Body style={{ flex: 1, fontSize: 14.5 }}>{s}</Body>
                </Row>
              ))}
              <View style={styles.tip}>
                <Text style={styles.tipLabel}>İPUCU</Text>
                <Body style={{ fontSize: 14 }}>{ex.tip}</Body>
              </View>
            </Card>
          </Reveal>

          <Reveal index={4}>
            <Card>
              <Label>Senin rekorların</Label>
              {rec ? (
                <>
                  <Row gap={spacing.sm}>
                    <Stat label="En ağır" value={`${rec.kg} kg × ${rec.reps}`} />
                    <Stat label="Tahmini 1RM" value={`${Math.round(rec.e1rm)} kg`} color={colors.fat} />
                  </Row>
                  {points.length > 1 && (
                    <LineChart
                      values={points.map((p) => p.v)}
                      labels={points.map((p) => p.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }))}
                      unit="kg 1RM"
                      color={colors.fat}
                    />
                  )}
                </>
              ) : (
                <Body muted style={{ fontSize: 13.5 }}>
                  Bu hareketi kaydettiğinde en iyi kilon ve gelişim grafiğin burada görünecek.
                </Body>
              )}
              {active && !active.exercises.some((e) => e.exerciseId === ex.id) && (
                <Button
                  title="Devam eden antrenmana ekle"
                  variant="outline"
                  icon={{ ios: 'plus', android: 'add', web: 'add' }}
                  onPress={() => {
                    addExercise(ex.id);
                    router.push('/workout');
                  }}
                />
              )}
              {!rec && <Mono style={{ color: colors.textDim, fontSize: 11 }}>1RM: Epley formülüyle tahmin edilir.</Mono>}
            </Card>
          </Reveal>
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  en: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted, alignSelf: 'center' },
  anim: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legend: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.text },
  step: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontFamily: fonts.mono, fontSize: 12, color: colors.text },
  tip: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accentSoft, gap: 4 },
  tipLabel: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 1.4, color: colors.accentBright },
}));
