import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

import { AuthShell } from '@/components/AuthShell';
import { Body, Button, Eyebrow, Hero, Input, PressScale, Row, Segmented, Stepper } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useDaily } from '@/lib/daily';
import { ACTIVITY, calculateGoals, GOALS, type Activity, type BodyProfile, type GoalType, type WeightLog } from '@/lib/goals';
import { dayKey, useStored } from '@/lib/store';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { makeStyles, useColors } from '@/lib/theme';
import { locale, tx } from '@/lib/i18n';
import { useWorkouts } from '@/lib/workouts';

// Kayıttan hemen sonra 3 soru: hedef, boy ve kilo, haftada kaç gün antrenman.
// Bitince hedefler, ilk kilo kaydı ve program gün sayısı yazılır; doğrudan Bugün ekranı açılır.
const GOAL_EMOJI: Record<GoalType, string> = { cut: '🔥', recomp: '⚡', maintain: '⚖️', bulk: '💪' };
const GOAL_ORDER: GoalType[] = ['cut', 'recomp', 'maintain', 'bulk'];
const STEPS = 3;
// Haftalık antrenman günü, kalori hesabındaki hareket düzeyini belirler.
const DAYS: { days: number; label: string; activity: Activity }[] = [
  { days: 0, label: 'Henüz başlamadım', activity: 'sedentary' },
  { days: 2, label: '1-2 gün', activity: 'light' },
  { days: 3, label: '3 gün', activity: 'moderate' },
  { days: 4, label: '4 gün', activity: 'moderate' },
  { days: 5, label: '5 gün', activity: 'active' },
  { days: 6, label: '6 gün ve üstü', activity: 'active' },
];

export default function Onboarding() {
  const styles = useStyles();
  const colors = useColors();
  const { profile } = useAuth();
  const { body, setBody } = useDaily();
  const [, setWeights] = useStored<WeightLog[]>('weights', []);
  const [, setOnboarded] = useStored<boolean>('onboarded', false);
  const { setTemplateDays } = useWorkouts();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<BodyProfile>(body ?? { sex: 'male', age: 25, heightCm: 178, weightKg: 75, activity: 'moderate', goal: 'recomp' });
  const [days, setDays] = useState(() => DAYS.find((d) => d.activity === p.activity)?.days ?? 6);
  const goals = useMemo(() => calculateGoals(p), [p]);
  const set = <K extends keyof BodyProfile>(k: K, v: BodyProfile[K]) => setP((prev) => ({ ...prev, [k]: v }));

  function finish() {
    setBody(p, goals);
    setWeights((prev) => [...prev.filter((w) => w.day !== dayKey()), { day: dayKey(), kg: p.weightKg }].slice(-365));
    // Koçun 3-6 günlük şablonlarından uyanı (Pro ve üstünde görünür).
    if (days >= 3) setTemplateDays(days);
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
              <Eyebrow>{profile?.username ? tx('Hoş geldin @{0}', [profile.username]) : 'Hoş geldin'}</Eyebrow>
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
                      <Text style={[styles.goalTitle, active && { color: colors.accentBright }]}>{GOALS[g].label.toLocaleUpperCase(locale())}</Text>
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
            <Hero lines={['Haftada', 'kaç gün?']} size={44} />
            <Body muted>Kaç gün antrenman yaptığına göre kalori hedefini ve programını ayarlayacağız.</Body>
            <View style={{ gap: spacing.sm }}>
              {DAYS.map((d) => {
                const active = days === d.days;
                return (
                  <PressScale
                    key={d.days}
                    onPress={() => {
                      setDays(d.days);
                      set('activity', d.activity);
                    }}
                    style={[styles.choice, active && styles.goalActive]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.choiceTitle, active && { color: colors.accentBright }]}>{d.label}</Text>
                      <Text style={styles.hint}>{ACTIVITY[d.activity].label}</Text>
                    </View>
                    <View style={[styles.radio, active && { borderColor: colors.accent }]}>{active && <View style={styles.radioDot} />}</View>
                  </PressScale>
                );
              })}
            </View>
            {isSupabaseConfigured && <InviteCode />}
          </>
        )}
      </Animated.View>
    </AuthShell>
  );
}

// Davet kodu (isteğe bağlı). Sonra profilden de girilebilir.
function InviteCode() {
  const colors = useColors();
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function apply() {
    setBusy(true);
    const { data, error } = await supabase.rpc('redeem_invite', { code });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: /redeem_invite|schema cache/.test(error.message) ? 'Davet kodu şu an kullanılamıyor.' : error.message });
    setMsg({ ok: true, text: tx('@{0} davetiyle katıldın 🎉', [data]) });
    refreshProfile();
  }

  if (msg?.ok) return <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.success }}>{msg.text}</Text>;
  return (
    <View style={{ gap: spacing.xs }}>
      <Row gap={spacing.sm}>
        <View style={{ flex: 1 }}>
          <Input value={code} onChangeText={setCode} placeholder="Davet kodun varsa" autoCapitalize="none" autoCorrect={false} />
        </View>
        <Button title="Uygula" variant="outline" loading={busy} disabled={code.trim().length < 3} onPress={apply} />
      </Row>
      {msg && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.danger }}>{msg.text}</Text>}
    </View>
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
}));
