import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Body,
  Button,
  Card,
  Chip,
  Heading,
  Icon,
  Label,
  Mono,
  PressScale,
  ProgressBar,
  Reveal,
  Row,
  Screen,
  ScreenHeader,
  Tag,
  TierBadge,
} from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { PROGRAM, todaysWorkout } from '@/lib/program';
import { hasFeature } from '@/lib/tiers';

export default function TrainingScreen() {
  const { tier } = useAuth();
  const [day, setDay] = useState(PROGRAM.indexOf(todaysWorkout()));
  const [done, setDone] = useState<Record<string, boolean>>({});
  const unlocked = hasFeature(tier, 'training_programs');
  const current = PROGRAM[day];
  const doneCount = current.exercises.filter((e) => done[`${day}-${e.name}`]).length;

  return (
    <Screen>
      <Reveal index={0}>
        <ScreenHeader eyebrow="Programın" title="Antrenman" right={!unlocked && <TierBadge tier="pro" />} />
      </Reveal>

      <Reveal index={1}>
        <Row gap={spacing.sm}>
          {PROGRAM.map((d, i) => (
            <Chip key={d.day} label={`${d.short} · ${d.focus}`} active={i === day} onPress={() => setDay(i)} />
          ))}
        </Row>
      </Reveal>

      <Reveal index={2}>
        <View>
          <Card glow>
            <Row style={{ justifyContent: 'space-between' }}>
              <Label>{current.day}</Label>
              <Tag>{current.focus}</Tag>
            </Row>
            <Heading style={{ fontSize: 28 }}>{`${current.focus} günü`}</Heading>
            <Row style={{ justifyContent: 'space-between' }}>
              <Mono style={{ color: colors.textMuted }}>
                {doneCount}/{current.exercises.length} egzersiz
              </Mono>
              <Mono style={{ color: colors.textMuted }}>~45 dk</Mono>
            </Row>
            <ProgressBar value={doneCount / current.exercises.length} color={colors.success} height={5} />
            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              {current.exercises.map((e, i) => {
                const key = `${day}-${e.name}`;
                const checked = done[key];
                return (
                  <PressScale
                    key={key}
                    onPress={() => setDone((s) => ({ ...s, [key]: !s[key] }))}
                    style={styles.exercise}>
                    <Text style={styles.index}>{String(i + 1).padStart(2, '0')}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, checked && styles.nameDone]}>{e.name}</Text>
                      <Text style={styles.muscle}>{e.muscle}</Text>
                    </View>
                    <Mono style={{ color: colors.textMuted }}>{e.sets}</Mono>
                    <View style={[styles.check, checked && styles.checkOn]}>
                      {checked && (
                        <Icon
                          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                          size={13}
                          color={colors.primaryText}
                        />
                      )}
                    </View>
                  </PressScale>
                );
              })}
            </View>
          </Card>

          {!unlocked && (
            // Kilitli: program görünür ama bulanık bir perdeyle kapalı.
            <LinearGradient
              colors={['rgba(8,9,11,0.78)', 'rgba(8,9,11,0.95)', colors.background]}
              style={styles.lockOverlay}>
              <View style={styles.lockIcon}>
                <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={22} />
              </View>
              <Heading style={{ fontSize: 26, textAlign: 'center' }}>Pro ile aç</Heading>
              <Body muted style={{ textAlign: 'center', maxWidth: 300 }}>
                Kişiye özel antrenman programı, yemek planı ve Pro kulüp chat'i.
              </Body>
              <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.lg }}>
                <Button title="Paketleri gör" arrow onPress={() => router.push('/plans')} />
              </View>
            </LinearGradient>
          )}
        </View>
      </Reveal>

      {unlocked && (
        <Reveal index={3}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Icon
              name={{
                ios: 'figure.strengthtraining.traditional',
                android: 'accessibility_new',
                web: 'accessibility_new',
              }}
              size={28}
              color={colors.accentBright}
            />
            <Body muted style={{ flex: 1, fontSize: 13.5 }}>
              Kas grubu animasyonlu egzersiz anlatımları çok yakında.
            </Body>
          </Card>
        </Reveal>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  exercise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  index: { fontFamily: fonts.mono, fontSize: 12, color: colors.textDim },
  name: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  nameDone: { color: colors.textDim, textDecorationLine: 'line-through' },
  muscle: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.textDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.success, borderColor: colors.success },
  lockOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm + 4,
  },
  lockIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
