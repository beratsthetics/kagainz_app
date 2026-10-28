import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { Button, IconBox, PressScale, Row, Sheet, Stepper, tap, type IconName } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { mealForNow, useDaily } from '@/lib/daily';
import { GLASS_ML, type WeightLog } from '@/lib/goals';
import { locale, tx } from '@/lib/i18n';
import { dayKey, useStored } from '@/lib/store';
import { makeStyles, useColors } from '@/lib/theme';
import { useWorkouts } from '@/lib/workouts';

type Tile = { key: string; icon: IconName; label: string; sub?: string; color: string; onPress: () => void };

// Alt menünün ortasındaki + düğmesinin açtığı pencere: günlük kayıtların hepsi tek dokunuş uzakta.
export function QuickAdd({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const styles = useStyles();
  const { session } = useAuth();
  const { water, waterGoal, setWater, body } = useDaily();
  const { active } = useWorkouts();
  const [weights, setWeights] = useStored<WeightLog[]>('weights', []);
  const [weightOpen, setWeightOpen] = useState(false);
  const [weight, setWeight] = useState(body?.weightKg ?? weights[weights.length - 1]?.kg ?? 75);
  const todayWeight = weights.find((w) => w.day === dayKey());

  function go(path: Parameters<typeof router.push>[0]) {
    onClose();
    router.push(session ? path : '/auth');
  }

  const tiles: Tile[] = [
    {
      key: 'meal',
      icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
      label: 'Öğün',
      color: colors.accentBright,
      onPress: () => go({ pathname: '/macros', params: { meal: mealForNow() } }),
    },
    {
      key: 'set',
      icon: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' },
      label: active ? 'Sete devam' : 'Set',
      color: colors.accentBright,
      onPress: () => go(active ? '/workout' : '/training'),
    },
    {
      key: 'water',
      icon: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
      label: '+1 bardak su',
      sub: `${((water * GLASS_ML) / 1000).toLocaleString(locale())} / ${((waterGoal * GLASS_ML) / 1000).toLocaleString(locale())} L`,
      color: colors.water,
      onPress: () => {
        tap();
        setWater(water + 1);
      },
    },
    {
      key: 'weight',
      icon: { ios: 'scalemass.fill', android: 'monitor_weight', web: 'monitor_weight' },
      label: 'Kilo',
      sub: todayWeight ? `${todayWeight.kg.toLocaleString(locale())} kg` : undefined,
      color: colors.accentBright,
      onPress: () => (session ? setWeightOpen((o) => !o) : go('/auth')),
    },
    {
      key: 'form',
      icon: { ios: 'figure.stand', android: 'accessibility_new', web: 'accessibility_new' },
      label: 'Form fotoğrafı',
      color: colors.accentBright,
      onPress: () => go('/form-check'),
    },
  ];

  return (
    <Sheet visible={visible} onClose={onClose} title="Hızlı kayıt">
      <View style={styles.grid}>
        {tiles.map((t) => (
          <PressScale
            key={t.key}
            onPress={t.onPress}
            style={[styles.tile, t.key === 'weight' && weightOpen && { borderColor: t.color }]}>
            <IconBox name={t.icon} color={t.color} bg={`${t.color}1F`} size={40} />
            <Text style={styles.tileText}>{t.label}</Text>
            {t.sub ? (
              <Text raw style={styles.tileSub}>
                {t.sub}
              </Text>
            ) : null}
          </PressScale>
        ))}
      </View>
      {weightOpen && (
        <Row gap={spacing.sm}>
          <View style={{ flex: 1 }}>
            <Stepper value={weight} onChange={setWeight} step={0.1} min={30} max={300} suffix="kg" />
          </View>
          <Button
            title="Kaydet"
            onPress={() => {
              setWeights((prev) =>
                [...prev.filter((w) => w.day !== dayKey()), { day: dayKey(), kg: weight }].slice(-365),
              );
              setWeightOpen(false);
              tap();
            }}
          />
        </Row>
      )}
      {todayWeight && !weightOpen ? (
        <Text style={styles.note}>
          {tx('Bugünkü kilon kaydedildi: {0} kg', [todayWeight.kg.toLocaleString(locale())])}
        </Text>
      ) : null}
    </Sheet>
  );
}

const useStyles = makeStyles((colors) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  tileText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.text, textAlign: 'center' },
  tileSub: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted },
  note: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted, textAlign: 'center' },
}));
