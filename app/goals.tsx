import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import {
  Body,
  Button,
  Card,
  Hero,
  Icon,
  Label,
  Mono,
  PressScale,
  Reveal,
  Row,
  Screen,
  Segmented,
  Stat,
  Stepper,
} from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useDaily } from '@/lib/daily';
import { ACTIVITY, calculateGoals, GOALS, tdee, waterGoalGlasses, type Activity, type BodyProfile, type GoalType, type WeightLog } from '@/lib/goals';
import { dayKey, useStored } from '@/lib/store';
import { makeStyles, useColors } from '@/lib/theme';
import { locale, tx } from '@/lib/i18n';

export default function GoalsScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { body, setBody, coachGoals } = useDaily();
  const [, setWeights] = useStored<WeightLog[]>('weights', []);
  const [p, setP] = useState<BodyProfile>(
    body ?? { sex: 'male', age: 25, heightCm: 178, weightKg: 75, activity: 'moderate', goal: 'recomp' },
  );
  const goals = useMemo(() => calculateGoals(p), [p]);
  const set = <K extends keyof BodyProfile>(k: K, v: BodyProfile[K]) => setP((prev) => ({ ...prev, [k]: v }));

  function save() {
    setBody(p, goals);
    setWeights((prev) => [...prev.filter((w) => w.day !== dayKey()), { day: dayKey(), kg: p.weightKg }].slice(-365));
    router.back();
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      header={
        <Row style={{ justifyContent: 'flex-end' }}>
          <PressScale onPress={() => router.back()} style={styles.close}>
            <Icon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} />
          </PressScale>
        </Row>
      }>
      <Reveal index={0}>
        <Hero lines={['Hedefini', 'hesapla']} size={46} />
      </Reveal>
      <Reveal index={1}>
        <Body muted>Bilgilerine göre günlük kalori ve makro hedefini hesaplıyoruz. İstediğin zaman değiştirebilirsin.</Body>
      </Reveal>
      {coachGoals && (
        <Reveal index={1}>
          <Card style={{ borderColor: colors.accent }}>
            <Label>Koçunun belirlediği hedef</Label>
            <Body style={{ fontSize: 14.5 }}>{tx('{0} kcal · {1} g protein · {2} g karb. · {3} g yağ', [coachGoals.kcal.toLocaleString(locale()), coachGoals.protein, coachGoals.carb, coachGoals.fat])}</Body>
            {coachGoals.note && <Body muted style={{ fontSize: 13.5 }}>{coachGoals.note}</Body>}
            <Body muted style={{ fontSize: 12.5 }}>
              Koçun hedef atadığı sürece günlük hedefin bu. Aşağıdaki bilgiler su hedefi ve kilo takibi için kullanılır.
            </Body>
          </Card>
        </Reveal>
      )}

      <Reveal index={2}>
        <Card>
          <Label>Cinsiyet</Label>
          <Segmented
            options={[
              { value: 'male', label: 'Erkek' },
              { value: 'female', label: 'Kadın' },
            ]}
            value={p.sex}
            onChange={(v) => set('sex', v)}
          />
          <Row style={styles.metric}>
            <Label>Yaş</Label>
            <Stepper value={p.age} onChange={(v) => set('age', v)} min={14} max={90} />
          </Row>
          <Row style={styles.metric}>
            <Label>Boy</Label>
            <Stepper value={p.heightCm} onChange={(v) => set('heightCm', v)} min={130} max={230} suffix="cm" />
          </Row>
          <Row style={styles.metric}>
            <Label>Kilo</Label>
            <Stepper value={p.weightKg} onChange={(v) => set('weightKg', v)} step={0.5} min={35} max={250} suffix="kg" />
          </Row>
        </Card>
      </Reveal>

      <Reveal index={3}>
        <Card>
          <Label>Hareket seviyen</Label>
          {(Object.keys(ACTIVITY) as Activity[]).map((a) => (
            <Choice key={a} active={p.activity === a} title={ACTIVITY[a].label} hint={ACTIVITY[a].hint} onPress={() => set('activity', a)} />
          ))}
        </Card>
      </Reveal>

      <Reveal index={4}>
        <Card>
          <Label>Hedefin</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {(Object.keys(GOALS) as GoalType[]).map((g) => (
              <PressScale
                key={g}
                onPress={() => set('goal', g)}
                style={[styles.goal, p.goal === g && { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.goalTitle, p.goal === g && { color: colors.accentBright }]}>
                  {GOALS[g].label}
                </Text>
                <Text style={styles.goalHint}>{GOALS[g].hint}</Text>
              </PressScale>
            ))}
          </View>
        </Card>
      </Reveal>

      <Reveal index={5}>
        <Card glow>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Günlük hedefin</Label>
            <Mono style={{ color: colors.textMuted }}>{tx('Harcama ≈ {0} kcal', [Math.round(tdee(p))])}</Mono>
          </Row>
          <Text style={styles.kcal}>
            {goals.kcal.toLocaleString(locale())}
            <Text style={{ fontSize: 18, color: colors.textMuted }}> kcal</Text>
          </Text>
          <Row gap={spacing.sm}>
            <Stat label="Protein" value={`${goals.protein} g`} color={colors.protein} />
            <Stat label="Karb." value={`${goals.carb} g`} color={colors.carb} />
            <Stat label="Yağ" value={`${goals.fat} g`} color={colors.fat} />
          </Row>
          <Body muted style={{ fontSize: 12.5 }}>{tx('Su hedefi: {0} bardak. Mifflin-St Jeor formülü; kilo değişiminde yeniden hesapla.', [waterGoalGlasses(p.weightKg)])}</Body>
          <Button title="Hedefimi kaydet" arrow onPress={save} />
        </Card>
      </Reveal>
    </Screen>
  );
}

function Choice({ active, title, hint, onPress }: { active: boolean; title: string; hint: string; onPress: () => void }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <PressScale onPress={onPress} style={[styles.choice, active && { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}>
      <View style={[styles.radio, active && { borderColor: colors.accent }]}>{active && <View style={styles.radioDot} />}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.goalHint}>{hint}</Text>
      </View>
    </PressScale>
  );
}

const useStyles = makeStyles((colors) => ({
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metric: { justifyContent: 'space-between', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  goal: {
    width: '48%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    gap: 4,
  },
  goalTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  goalHint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceTitle: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  kcal: { fontFamily: fonts.display, fontSize: 52, lineHeight: 58, color: colors.text },
}));
