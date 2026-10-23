import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { MacroBar, StreakPill, ThemeToggle, WaterTracker } from '@/components/bits';
import {
  Avatar,
  Body,
  Button,
  Card,
  Eyebrow,
  GradientCard,
  Heading,
  Icon,
  IconBox,
  Label,
  Mono,
  PressScale,
  ProgressBar,
  Reveal,
  Ring,
  Row,
  Screen,
  Tag,
  TierBadge,
  type IconName,
} from '@/components/ui';
import { fonts, radius, spacing, tierColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { challengeProgress } from '@/lib/challenges';
import { useDaily } from '@/lib/daily';
import { exerciseById } from '@/lib/exercises';
import { isTrainingDay, todaysDayIndex, WEEKDAYS } from '@/lib/program';
import { useProgress } from '@/lib/progress';
import { makeStyles, useColors } from '@/lib/theme';
import { hasFeature } from '@/lib/tiers';
import { doneSets, useWorkouts } from '@/lib/workouts';

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

type Action = { icon: IconName; label: string; color: 'carb' | 'accentBright' | 'fat' | 'water'; onPress: () => void };

export default function TodayScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { session, profile, tier } = useAuth();
  const { totals, goals, hasCustomGoals, entries } = useDaily();
  const { program, active, startDay } = useWorkouts();
  const { activity } = useProgress();
  const canTrain = hasFeature(tier, 'training_programs');
  const day = program.days[todaysDayIndex(program)];
  const trainingToday = isTrainingDay(program);
  const left = Math.max(0, goals.kcal - totals.kcal);
  const challenge = challengeProgress(activity);

  const actions: Action[] = [
    {
      icon: { ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' },
      label: 'Öğün ekle',
      color: 'carb',
      onPress: () => router.push('/macros'),
    },
    {
      icon: { ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' },
      label: 'Barkod',
      color: 'accentBright',
      onPress: () => router.push(session ? '/food/scan' : '/auth?reason=macros'),
    },
    {
      icon: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' },
      label: 'Antrenman',
      color: 'fat',
      onPress: () => router.push(active ? '/workout' : '/training'),
    },
    {
      icon: { ios: 'chart.xyaxis.line', android: 'monitoring', web: 'monitoring' },
      label: 'İlerleme',
      color: 'water',
      onPress: () => router.push('/progress'),
    },
  ];

  return (
    <Screen>
      <Reveal index={0}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Eyebrow>Bugün · {WEEKDAYS[new Date().getDay()].day}</Eyebrow>
            <Text style={styles.greet}>
              {greeting().toLocaleUpperCase('tr-TR')}
              {profile?.username ? (
                <Text style={{ color: colors.silver }}>{`, ${profile.username.toLocaleUpperCase('tr-TR')}`}</Text>
              ) : null}
            </Text>
          </View>
          <Row gap={spacing.sm}>
            <ThemeToggle />
            <PressScale onPress={() => router.push(session ? '/profile' : '/auth')}>
              <Avatar name={profile?.username ?? 'K'} path={profile?.avatar_url} size={42} />
            </PressScale>
          </Row>
        </Row>
        <Row style={{ marginTop: spacing.sm }}>
          <TierBadge tier={tier} />
          <StreakPill />
          {!session && (
            <PressScale onPress={() => router.push('/auth')}>
              <Text style={styles.link}>Giriş yap →</Text>
            </PressScale>
          )}
        </Row>
      </Reveal>

      {active && (
        <Reveal index={1}>
          <PressScale onPress={() => router.push('/workout')}>
            <GradientCard colors={tierColors.pro}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Label>Devam eden antrenman</Label>
                <Mono style={{ color: colors.accentBright }}>{doneSets(active)} set</Mono>
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <Heading style={{ fontSize: 24 }}>{active.title}</Heading>
                <Icon name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }} size={20} />
              </Row>
            </GradientCard>
          </PressScale>
        </Reveal>
      )}

      <Reveal index={1}>
        <SmartTip />
      </Reveal>

      {/* Beslenme özeti */}
      <Reveal index={2}>
        <PressScale onPress={() => router.push('/macros')}>
          <Card glow>
            <Row style={{ justifyContent: 'space-between' }}>
              <Label>Beslenme</Label>
              <Mono style={{ color: colors.textMuted }}>
                {totals.kcal.toLocaleString('tr-TR')} / {goals.kcal.toLocaleString('tr-TR')} kcal
              </Mono>
            </Row>
            <Row gap={spacing.lg} style={{ marginTop: spacing.xs }}>
              <Ring value={totals.kcal / goals.kcal} size={124} stroke={11} color={totals.kcal > goals.kcal ? colors.fat : colors.accent}>
                <Text style={styles.ringValue}>{left.toLocaleString('tr-TR')}</Text>
                <Label>kcal kaldı</Label>
              </Ring>
              <View style={{ flex: 1, gap: spacing.md }}>
                <MacroBar label="Protein" value={totals.protein} goal={goals.protein} color={colors.protein} />
                <MacroBar label="Karb." value={totals.carb} goal={goals.carb} color={colors.carb} />
                <MacroBar label="Yağ" value={totals.fat} goal={goals.fat} color={colors.fat} />
              </View>
            </Row>
            {!hasCustomGoals && session && (
              <PressScale onPress={() => router.push('/goals')} style={styles.goalCta}>
                <Icon name={{ ios: 'target', android: 'my_location', web: 'my_location' }} size={16} color={colors.accentBright} />
                <Text style={[styles.link, { flex: 1 }]}>Hedefini kendine göre hesapla</Text>
                <Text style={styles.link}>→</Text>
              </PressScale>
            )}
            {entries.length === 0 && (
              <Body muted style={{ fontSize: 13 }}>
                Bugün henüz öğün girmedin.
              </Body>
            )}
          </Card>
        </PressScale>
      </Reveal>

      <Reveal index={3}>
        <Card>
          <WaterTracker />
        </Card>
      </Reveal>

      {/* Hızlı işlemler */}
      <Reveal index={4}>
        <Row gap={spacing.sm}>
          {actions.map((a) => (
            <PressScale key={a.label} flex onPress={a.onPress} style={styles.action}>
              <IconBox name={a.icon} color={colors[a.color]} bg={`${colors[a.color]}1F`} size={42} />
              <Text style={styles.actionText}>{a.label}</Text>
            </PressScale>
          ))}
        </Row>
      </Reveal>

      {/* Bugünkü antrenman */}
      {!active && (
        <Reveal index={5}>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Label>{trainingToday ? 'Bugünkü antrenman' : `Sıradaki: ${day.day}`}</Label>
              <Tag>{day.focus}</Tag>
            </Row>
            <Heading style={{ fontSize: 26 }}>{`${day.focus} günü`}</Heading>
            <View style={{ gap: 6, opacity: canTrain ? 1 : 0.35 }}>
              {day.exercises.slice(0, 3).map((e, i) => (
                <Row key={e.exerciseId} style={styles.exercise}>
                  <Text style={styles.index}>{String(i + 1).padStart(2, '0')}</Text>
                  <Text style={styles.exerciseName} numberOfLines={1}>
                    {exerciseById(e.exerciseId)?.trName}
                  </Text>
                  <Mono style={{ color: colors.textMuted }}>
                    {e.sets}×{e.reps}
                  </Mono>
                </Row>
              ))}
              {day.exercises.length > 3 && (
                <Mono style={{ color: colors.textDim, fontSize: 12 }}>+{day.exercises.length - 3} hareket daha</Mono>
              )}
            </View>
            {canTrain ? (
              <Button
                title={trainingToday ? 'Antrenmana başla' : 'Yine de başla'}
                icon={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
                onPress={() => {
                  startDay(day);
                  router.push('/workout');
                }}
              />
            ) : (
              <Row gap={spacing.sm}>
                <View style={{ flex: 1 }}>
                  <Button title="Serbest başla" variant="outline" onPress={() => router.push('/training')} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Pro ile aç" onPress={() => router.push('/plans')} />
                </View>
              </Row>
            )}
          </Card>
        </Reveal>
      )}

      {/* Haftalık meydan okuma */}
      <Reveal index={6}>
        <PressScale onPress={() => router.push('/challenges')}>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Label>Haftanın meydan okuması</Label>
              {challenge.done ? <Tag color={colors.success} bg={colors.successSoft}>Tamam</Tag> : null}
            </Row>
            <Row gap={spacing.md}>
              <Text style={{ fontSize: 34 }}>{challenge.challenge.emoji}</Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Heading style={{ fontSize: 19 }}>{challenge.challenge.title}</Heading>
                <Body muted style={{ fontSize: 13 }}>
                  {challenge.challenge.description}
                </Body>
              </View>
              <Mono>
                {challenge.value}/{challenge.challenge.target}
              </Mono>
            </Row>
            <ProgressBar value={challenge.value / challenge.challenge.target} color={challenge.done ? colors.success : colors.fat} height={5} />
          </Card>
        </PressScale>
      </Reveal>

      {/* Topluluk çağrısı */}
      <Reveal index={7}>
        <PressScale onPress={() => router.push('/chat/genel')}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <IconBox
              name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
              color={colors.fat}
              bg={`${colors.fat}1F`}
              size={46}
            />
            <View style={{ flex: 1 }}>
              <Heading style={{ fontSize: 18 }}>Bugünü paylaş</Heading>
              <Body muted style={{ fontSize: 13.5 }}>
                Öğününün fotoğrafını at, makroları otomatik eklensin.
              </Body>
            </View>
            <Icon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={18} color={colors.textMuted} />
          </Card>
        </PressScale>
      </Reveal>
    </Screen>
  );
}

// Saate göre değişen kısa öneri: sabah kahvaltı, gün içinde kalan makro, akşam kapanış.
function SmartTip() {
  const colors = useColors();
  const styles = useStyles();
  const { totals, goals } = useDaily();
  const h = new Date().getHours();
  const proteinLeft = Math.max(0, Math.round(goals.protein - totals.protein));
  const kcalLeft = Math.max(0, goals.kcal - totals.kcal);

  let icon: IconName = { ios: 'sunrise.fill', android: 'wb_twilight', web: 'wb_twilight' };
  let title = 'Güne proteinle başla';
  let body = '3 yumurta + 60 g yulaf + 1 muz ≈ 35 g protein, 520 kcal.';
  if (h >= 11 && h < 17) {
    icon = { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' };
    title = proteinLeft > 0 ? `${proteinLeft} g protein kaldı` : 'Protein tamam';
    body =
      proteinLeft > 40
        ? `Öğlen 200 g tavuk göğsü + 150 g pilav ≈ 66 g protein. Kalan ${kcalLeft} kcal.`
        : `Kalan ${kcalLeft} kcal. Ara öğünde 200 g süzme yoğurt iyi gider.`;
  } else if (h >= 17) {
    icon = { ios: 'moon.stars.fill', android: 'bedtime', web: 'bedtime' };
    title = kcalLeft > 0 ? `Günü kapat: ${kcalLeft} kcal` : 'Hedefe ulaştın';
    body =
      proteinLeft > 0
        ? `Akşam ${proteinLeft} g protein daha: ör. 150 g somon + salata, yatmadan lor peyniri.`
        : 'Bugünkü makroların tamam. Yarın için su ve uyku planla.';
  } else if (h < 5) {
    icon = { ios: 'moon.zzz.fill', android: 'bedtime', web: 'bedtime' };
    title = 'Uyku da antrenmanın parçası';
    body = '7-9 saat uyku kas gelişimi ve iştah kontrolü için en ucuz takviye.';
  }

  return (
    <View style={styles.tip}>
      <IconBox name={icon} color={colors.fat} bg={`${colors.fat}1F`} size={38} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.tipTitle}>{title.toLocaleUpperCase('tr-TR')}</Text>
        <Body muted style={{ fontSize: 13 }}>
          {body}
        </Body>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  greet: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.text },
  link: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentBright },
  ringValue: { fontFamily: fonts.display, fontSize: 28, color: colors.text, lineHeight: 32 },
  goalCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  action: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionText: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.text },
  exercise: {
    gap: spacing.sm + 2,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  index: { fontFamily: fonts.mono, fontSize: 12, color: colors.textDim },
  exerciseName: { flex: 1, fontFamily: fonts.body, fontSize: 14.5, color: colors.text },
  tip: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: `${colors.fat}40`,
    backgroundColor: `${colors.fat}0D`,
  },
  tipTitle: { fontFamily: fonts.displayMedium, fontSize: 16, letterSpacing: 0.4, color: colors.text },
}));
