import { router } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { Body, Button, GradientCard, IconBox, Label, Row, type IconName } from '@/components/ui';
import { fonts, spacing, tierColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { MEALS, mealForNow, useDaily } from '@/lib/daily';
import { exerciseById } from '@/lib/exercises';
import { locale, tx } from '@/lib/i18n';
import { isTrainingDay, todaysDayIndex } from '@/lib/program';
import { useProgress } from '@/lib/progress';
import { dayKey } from '@/lib/store';
import { useColors } from '@/lib/theme';
import { hasFeature } from '@/lib/tiers';
import { doneSets, useWorkouts } from '@/lib/workouts';

type Next = { icon: IconName; label: string; title: string; body: string; cta: string; onPress: () => void; ctaIcon?: IconName };

const PLAY: IconName = { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' };
const PLUS: IconName = { ios: 'plus', android: 'add', web: 'add' };

// Ana sayfanın en üstündeki tek kart: şu an yapılacak en önemli şey.
// Sıra: devam eden antrenman, bu saatin öğünü, bugünkü antrenman, su, günü kapatma.
export function NextUp() {
  const colors = useColors();
  const { session, tier } = useAuth();
  const { entries, totals, goals, water, waterGoal, setWater } = useDaily();
  const { program, active, history, startDay } = useWorkouts();
  const { stats } = useProgress();
  // Hiç kayıt yokken kart "İlk adımın" olur ve kalın kenarlıkla öne çıkar.
  const first = !!session && stats.meals + stats.workouts === 0;
  const next = pick();

  function pick(): Next {
    if (!session)
      return {
        icon: { ios: 'person.crop.circle.badge.plus', android: 'person_add', web: 'person_add' },
        label: 'Sıradaki',
        title: 'Ücretsiz hesabını oluştur',
        body: 'Makrolarını, antrenmanlarını ve serini kaydetmek için 30 saniyede kayıt ol.',
        cta: 'Ücretsiz kayıt ol',
        onPress: () => router.push('/auth'),
      };

    if (active)
      return {
        icon: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' },
        label: 'Devam eden antrenman',
        title: active.title,
        body: tx('{0} set tamam. Kaldığın yerden devam et.', [doneSets(active)]),
        cta: 'Devam et',
        ctaIcon: PLAY,
        onPress: () => router.push('/workout'),
      };

    const h = new Date().getHours();
    const slot = mealForNow();
    const proteinLeft = Math.max(0, Math.round(goals.protein - totals.protein));
    const kcalLeft = Math.max(0, goals.kcal - totals.kcal);
    const ateNow = entries.some((e) => (e.meal ?? 'snack') === slot);
    if (slot !== 'snack' && !ateNow) {
      const body =
        slot === 'breakfast'
          ? '3 yumurta + 60 g yulaf + 1 muz ≈ 35 g protein, 520 kcal.'
          : slot === 'lunch'
            ? proteinLeft > 40
              ? tx('Öğlen 200 g tavuk göğsü + 150 g pilav ≈ 66 g protein. Kalan {0} kcal.', [kcalLeft])
              : tx('Kalan {0} kcal. Ara öğünde 200 g süzme yoğurt iyi gider.', [kcalLeft])
            : proteinLeft > 0
              ? tx('Akşam {0} g protein daha: ör. 150 g somon + salata, yatmadan lor peyniri.', [proteinLeft])
              : 'Bugünkü makroların tamam. Yarın için su ve uyku planla.';
      return {
        icon: MEALS[slot].icon as IconName,
        label: 'Sıradaki',
        title: tx('{0} öğününü ekle', [tx(MEALS[slot].label)]),
        body,
        cta: 'Öğün ekle',
        ctaIcon: PLUS,
        onPress: () => router.push({ pathname: '/macros', params: { meal: slot } }),
      };
    }

    const today = dayKey();
    const trainedToday = history.some((s) => s.endedAt && dayKey(new Date(s.endedAt)) === today);
    if (isTrainingDay(program) && !trainedToday) {
      const day = program.days[todaysDayIndex(program)];
      const canTrain = hasFeature(tier, 'training_programs');
      const names = day.exercises
        .slice(0, 3)
        .map((e) => exerciseById(e.exerciseId)?.trName)
        .filter(Boolean)
        .join(', ');
      return {
        icon: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' },
        label: 'Bugünkü antrenman',
        title: tx('{0} günü', [tx(day.focus)]),
        body: canTrain ? tx('{0} hareket: {1}', [day.exercises.length, names]) : 'Programlar Pro ile açılır. Şimdilik serbest antrenman yapabilirsin.',
        cta: canTrain ? 'Antrenmana başla' : 'Serbest başla',
        ctaIcon: PLAY,
        onPress: () => {
          if (!canTrain) return router.push('/training');
          startDay(day);
          router.push('/workout');
        },
      };
    }

    // Su: 07:00-21:00 arasına yayılmış hedefin gerisindeyse hatırlat.
    const expected = Math.round(waterGoal * Math.min(1, Math.max(0, (h - 7) / 14)));
    if (water < expected)
      return {
        icon: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
        label: 'Sıradaki',
        title: 'Bir bardak su iç',
        body: tx('Bu saate kadar {0} bardak olmalıydı, {1} bardaktasın.', [expected, water]),
        cta: '+1 bardak',
        onPress: () => setWater(water + 1),
      };

    if (kcalLeft > 0)
      return {
        icon: { ios: 'moon.stars.fill', android: 'bedtime', web: 'bedtime' },
        label: 'Sıradaki',
        title: tx('Günü kapat: {0} kcal', [kcalLeft.toLocaleString(locale())]),
        body:
          proteinLeft > 0
            ? tx('Akşam {0} g protein daha: ör. 150 g somon + salata, yatmadan lor peyniri.', [proteinLeft])
            : 'Bugünkü makroların tamam. Yarın için su ve uyku planla.',
        cta: 'Öğün ekle',
        ctaIcon: PLUS,
        onPress: () => router.push({ pathname: '/macros', params: { meal: slot } }),
      };

    return {
      icon: { ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' },
      label: 'Bugün',
      title: 'Hedefe ulaştın',
      body: 'Bugünkü makroların tamam. Yarın için su ve uyku planla.',
      cta: 'Günü hikâyede paylaş',
      onPress: () => router.push({ pathname: '/share', params: { kind: 'day' } }),
    };
  }

  return (
    <GradientCard colors={tierColors.pro} style={first && { borderWidth: 2 }}>
      <Row gap={spacing.md} style={{ alignItems: 'flex-start' }}>
        <IconBox name={next.icon} color={colors.accentBright} bg={colors.accentSoft} size={44} />
        <View style={{ flex: 1, gap: 4 }}>
          <Label>{first ? 'İlk adımın' : next.label}</Label>
          <Text raw style={{ fontFamily: fonts.bodyBold, fontSize: 20, lineHeight: 26, color: colors.text }}>
            {tx(next.title)}
          </Text>
          <Body muted style={{ fontSize: 13.5 }}>
            {next.body}
          </Body>
        </View>
      </Row>
      <Button title={next.cta} icon={next.ctaIcon} onPress={next.onPress} />
    </GradientCard>
  );
}
