import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

import { AuthShell } from '@/components/AuthShell';
import { Body, Button, Eyebrow, Hero, PressScale, Row, Segmented, Stat, Stepper } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useDaily } from '@/lib/daily';
import { ACTIVITY, calculateGoals, GOALS, waterGoalGlasses, type Activity, type BodyProfile, type GoalType, type WeightLog } from '@/lib/goals';
import { dayKey, useStored } from '@/lib/store';
import { makeStyles, useColors } from '@/lib/theme';

// Kayıttan hemen sonra 4 adımlık karşılama: hedef, vücut, hareket, kişisel sonuç.
// Bitince hedefler ve ilk kilo kaydı yazılır, ana sayfa ilk günden kişisel açılır.
const GOAL_EMOJI: Record<GoalType, string> = { cut: '🔥', recomp: '⚡', maintain: '⚖️', bulk: '💪' };
const GOAL_ORDER: GoalType[] = ['cut', 'recomp', 'maintain', 'bulk'];
const STEPS = 4;

export default function Onboarding() {
  const styles = useStyles();
  const colors = useColors();
  const { profile } = useAuth();
  const { body, setBody } = useDaily();
  const [, setWeights] = useStored<WeightLog[]>('weights', []);
  const [, setOnboarded] = useStored<boolean>('onboarded', false);
  const [step, setStep] = useState(0);
  const [p, setP] = useState<BodyProfile>(body ?? { sex: 'male', age: 25, heightCm: 178, weightKg: 75, activity: 'moderate', goal: 'recomp' });
  const goals = useMemo(() => calculateGoals(p), [p]);
  const set = <K extends keyof BodyProfile>(k: K, v: BodyProfile[K]) => setP((prev) => ({ ...prev, [k]: v }));

  function finish() {
    setBody(p, goals);
    setWeights((prev) => [...prev.filter((w) => w.day !== dayKey()), { day: dayKey(), kg: p.weightKg }].slice(-365));
    setOnboarded(true);
    router.dismissAll();
  }

  function skip() {
    setOnboarded(true);
    router.dismissAll();
  }

  const footer =
    step < STEPS - 1 ? (
      <View style={{ gap: spacing.sm }}>
        <Button title="Devam" arrow onPress={() => setStep((s) => s + 1)} />
        {step === 0 && (
          <PressScale onPress={skip}>
            <Text style={styles.skip}>Şimdilik geç</Text>
          </PressScale>
        )}
      </View>
    ) : (
      <Button title="Başlayalım" arrow onPress={finish} />
    );

  return (
    <AuthShell step={step} steps={STEPS} footer={footer} onBack={() => (step > 0 ? setStep(step - 1) : skip())}>
      <Animated.View key={step} entering={FadeInRight.duration(260)} exiting={FadeOutLeft.duration(160)} style={{ gap: spacing.lg }}>
        {step === 0 && (
          <>
            <View>
              <Eyebrow>{profile?.username ? `Hoş geldin @${profile.username}` : 'Hoş geldin'}</Eyebrow>
              <Hero lines={['Hedefin', 'ne?']} size={48} />
            </View>
            <Body muted>Seçimine göre kalori ve protein hedefini hesaplayacağız. Sonra istediğin zaman değiştirebilirsin.</Body>
            <View style={styles.grid}>
              {GOAL_ORDER.map((g) => {
                const active = p.goal === g;
                return (
                  <View key={g} style={styles.goalCell}>
                    <PressScale flex onPress={() => set('goal', g)} style={[styles.goal, active && styles.goalActive]}>
                      <Text style={{ fontSize: 30 }}>{GOAL_EMOJI[g]}</Text>
                      <Text style={[styles.goalTitle, active && { color: colors.accentBright }]}>{GOALS[g].label.toLocaleUpperCase('tr-TR')}</Text>
                      <Text style={styles.hint}>{GOALS[g].hint}</Text>
                    </PressScale>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Hero lines={['Biraz', 'seni tanıyalım']} size={44} />
            <Segmented
              options={[
                { value: 'male', label: 'Erkek' },
                { value: 'female', label: 'Kadın' },
              ]}
              value={p.sex}
              onChange={(v) => set('sex', v)}
            />
            <View style={styles.metrics}>
              <Metric label="Yaş">
                <Stepper value={p.age} onChange={(v) => set('age', v)} min={14} max={90} />
              </Metric>
              <Metric label="Boy">
                <Stepper value={p.heightCm} onChange={(v) => set('heightCm', v)} min={130} max={230} suffix="cm" />
              </Metric>
              <Metric label="Kilo" last>
                <Stepper value={p.weightKg} onChange={(v) => set('weightKg', v)} step={0.5} min={35} max={250} suffix="kg" />
              </Metric>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Hero lines={['Ne kadar', 'hareketlisin?']} size={44} />
            <View style={{ gap: spacing.sm }}>
              {(Object.keys(ACTIVITY) as Activity[]).map((a) => {
                const active = p.activity === a;
                return (
                  <PressScale key={a} onPress={() => set('activity', a)} style={[styles.choice, active && styles.goalActive]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.choiceTitle, active && { color: colors.accentBright }]}>{ACTIVITY[a].label}</Text>
                      <Text style={styles.hint}>{ACTIVITY[a].hint}</Text>
                    </View>
                    <View style={[styles.radio, active && { borderColor: colors.accent }]}>{active && <View style={styles.radioDot} />}</View>
                  </PressScale>
                );
              })}
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <View>
              <Eyebrow>Kişisel planın hazır</Eyebrow>
              <Hero lines={['Günlük', 'hedefin']} size={48} />
            </View>
            <View style={styles.result}>
              <CountUp value={goals.kcal} style={styles.kcal} />
              <Text style={styles.kcalUnit}>KCAL / GÜN</Text>
              <Row gap={spacing.sm} style={{ marginTop: spacing.md }}>
                <Stat label="Protein" value={`${goals.protein} g`} color={colors.protein} />
                <Stat label="Karb." value={`${goals.carb} g`} color={colors.carb} />
                <Stat label="Yağ" value={`${goals.fat} g`} color={colors.fat} />
              </Row>
            </View>
            <Body muted style={{ fontSize: 13.5 }}>
              {GOAL_EMOJI[p.goal]} {GOALS[p.goal].label} · su hedefin {waterGoalGlasses(p.weightKg)} bardak. Öğün girdikçe ana sayfadaki halka dolacak.
            </Body>
          </>
        )}
      </Animated.View>
    </AuthShell>
  );
}

function Metric({ label, children, last }: { label: string; children: ReactNode; last?: boolean }) {
  const styles = useStyles();
  return (
    <Row style={[styles.metric, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      {children}
    </Row>
  );
}

// Sayı 0'dan hedefe doğru sayarak çıkar.
function CountUp({ value, style }: { value: number; style: object }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 900);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t === 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [value]);
  return <Text style={style}>{shown.toLocaleString('tr-TR')}</Text>;
}

const useStyles = makeStyles((colors) => ({
  skip: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  goalCell: { width: '47%', flexGrow: 1 },
  goal: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },
  goalActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  goalTitle: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.text, letterSpacing: 0.5 },
  hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted },
  metrics: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  metric: { justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  metricLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceTitle: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.accent },
  result: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  kcal: { fontFamily: fonts.display, fontSize: 72, lineHeight: 80, color: colors.text },
  kcalUnit: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 2, color: colors.textMuted },
}));
