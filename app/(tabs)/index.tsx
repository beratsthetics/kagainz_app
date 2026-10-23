import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Avatar,
  Body,
  Card,
  Eyebrow,
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
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useDaily } from '@/lib/daily';
import { todaysWorkout } from '@/lib/program';
import { hasFeature } from '@/lib/tiers';

const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

const ACTIONS: {
  icon: IconName;
  label: string;
  color: string;
  href: '/macros' | '/community' | '/training' | '/plans';
}[] = [
  {
    icon: { ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' },
    label: 'Öğün ekle',
    color: colors.carb,
    href: '/macros',
  },
  {
    icon: { ios: 'square.and.pencil', android: 'edit_square', web: 'edit_square' },
    label: 'Paylaş',
    color: colors.accentBright,
    href: '/community',
  },
  {
    icon: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' },
    label: 'Program',
    color: colors.fat,
    href: '/training',
  },
  {
    icon: { ios: 'video.fill', android: 'videocam', web: 'videocam' },
    label: 'Form check',
    color: '#C4B5FD',
    href: '/plans',
  },
];

export default function TodayScreen() {
  const { session, profile, tier } = useAuth();
  const { totals, goals } = useDaily();
  const workout = todaysWorkout();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const canTrain = hasFeature(tier, 'training_programs');
  const doneCount = workout.exercises.filter((e) => done[e.name]).length;
  const left = Math.max(0, goals.kcal - totals.kcal);

  return (
    <Screen>
      <Reveal index={0}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Eyebrow>Bugün · {DAYS[new Date().getDay()]}</Eyebrow>
            <Text style={styles.greet}>
              {greeting().toLocaleUpperCase('tr-TR')}
              {profile?.username ? (
                <Text style={{ color: colors.silver }}>{`, ${profile.username.toLocaleUpperCase('tr-TR')}`}</Text>
              ) : null}
            </Text>
          </View>
          <PressScale onPress={() => router.push(session ? '/profile' : '/auth')}>
            <Avatar name={profile?.username ?? 'K'} size={46} />
          </PressScale>
        </Row>
        <Row style={{ marginTop: spacing.sm }}>
          <TierBadge tier={tier} />
          {!session && (
            <PressScale onPress={() => router.push('/auth')}>
              <Text style={styles.link}>Giriş yap →</Text>
            </PressScale>
          )}
        </Row>
      </Reveal>

      {/* Beslenme özeti */}
      <Reveal index={1}>
        <PressScale onPress={() => router.push('/macros')}>
          <Card glow>
            <Row style={{ justifyContent: 'space-between' }}>
              <Label>Beslenme</Label>
              <Mono style={{ color: colors.textMuted }}>
                {totals.kcal.toLocaleString('tr-TR')} / {goals.kcal.toLocaleString('tr-TR')} kcal
              </Mono>
            </Row>
            <Row gap={spacing.lg} style={{ marginTop: spacing.xs }}>
              <Ring value={totals.kcal / goals.kcal} size={128} stroke={11}>
                <Text style={styles.ringValue}>{left.toLocaleString('tr-TR')}</Text>
                <Label>kcal kaldı</Label>
              </Ring>
              <View style={{ flex: 1, gap: spacing.md }}>
                <MacroBar label="Protein" value={totals.protein} goal={goals.protein} color={colors.protein} />
                <MacroBar label="Karb." value={totals.carb} goal={goals.carb} color={colors.carb} />
                <MacroBar label="Yağ" value={totals.fat} goal={goals.fat} color={colors.fat} />
              </View>
            </Row>
          </Card>
        </PressScale>
      </Reveal>

      {/* Hızlı işlemler */}
      <Reveal index={2}>
        <Row gap={spacing.sm}>
          {ACTIONS.map((a) => (
            <PressScale key={a.label} flex onPress={() => router.push(a.href)} style={styles.action}>
              <IconBox name={a.icon} color={a.color} bg={`${a.color}1F`} size={42} />
              <Text style={styles.actionText}>{a.label}</Text>
            </PressScale>
          ))}
        </Row>
      </Reveal>

      {/* Bugünkü antrenman, sitedeki kart gibi */}
      <Reveal index={3}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Bugünkü antrenman</Label>
            <Tag>{workout.focus}</Tag>
          </Row>
          <Heading style={{ fontSize: 26 }}>{`${workout.focus} günü`}</Heading>
          <View style={{ gap: spacing.sm, opacity: canTrain ? 1 : 0.35 }} pointerEvents={canTrain ? 'auto' : 'none'}>
            {workout.exercises.slice(0, 3).map((e) => (
              <PressScale
                key={e.name}
                onPress={() => setDone((d) => ({ ...d, [e.name]: !d[e.name] }))}
                style={styles.exercise}>
                <View style={[styles.check, done[e.name] && styles.checkOn]}>
                  {done[e.name] && (
                    <Icon
                      name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                      size={12}
                      color={colors.primaryText}
                    />
                  )}
                </View>
                <Text style={[styles.exerciseName, done[e.name] && styles.exerciseDone]}>{e.name}</Text>
                <Mono style={{ color: colors.textMuted }}>{e.sets}</Mono>
              </PressScale>
            ))}
          </View>
          {canTrain ? (
            <Row style={{ justifyContent: 'space-between', marginTop: spacing.xs }}>
              <Mono style={{ color: colors.textMuted }}>
                {doneCount}/{workout.exercises.length} tamamlandı
              </Mono>
              <PressScale onPress={() => router.push('/training')}>
                <Text style={styles.link}>Tümünü gör →</Text>
              </PressScale>
            </Row>
          ) : (
            <PressScale onPress={() => router.push('/plans')} style={styles.lock}>
              <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={14} color={colors.text} />
              <Text style={styles.lockText}>{'Pro ile programını aç'.toLocaleUpperCase('tr-TR')}</Text>
            </PressScale>
          )}
        </Card>
      </Reveal>

      {/* Topluluk çağrısı */}
      <Reveal index={4}>
        <PressScale onPress={() => router.push('/chat/genel')}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <IconBox
              name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
              color={colors.fat}
              bg={`${colors.fat}1F`}
              size={46}
            />
            <View style={{ flex: 1 }}>
              <Heading style={{ fontSize: 18 }}>Bugünü paylaş</Heading>
              <Body muted style={{ fontSize: 13.5 }}>
                Öğününü at, makroları otomatik eklensin.
              </Body>
            </View>
            <Icon
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={18}
              color={colors.textMuted}
            />
          </Card>
        </PressScale>
      </Reveal>
    </Screen>
  );
}

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Label>{label}</Label>
        <Mono style={{ fontSize: 12 }}>
          {Math.round(value)}
          <Text style={{ color: colors.textDim }}>/{goal}g</Text>
        </Mono>
      </Row>
      <ProgressBar value={value / goal} color={color} height={5} />
    </View>
  );
}

const styles = StyleSheet.create({
  greet: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, color: colors.text },
  link: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentBright },
  ringValue: { fontFamily: fonts.display, fontSize: 30, color: colors.text, lineHeight: 34 },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 6,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.success, borderColor: colors.success },
  exerciseName: { flex: 1, fontFamily: fonts.body, fontSize: 14.5, color: colors.text },
  exerciseDone: { color: colors.textDim, textDecorationLine: 'line-through' },
  lock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginTop: spacing.xs,
  },
  lockText: { fontFamily: fonts.displayMedium, fontSize: 15, color: colors.text, letterSpacing: 0.8 },
});
