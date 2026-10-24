import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { BodyMap } from '@/components/BodyMap';
import {
  Body,
  Button,
  Card,
  Chip,
  GradientCard,
  Heading,
  Icon,
  IconBox,
  Label,
  Mono,
  PressScale,
  Reveal,
  Row,
  Screen,
  ScreenHeader,
  SectionHeader,
  Tag,
  TierBadge,
} from '@/components/ui';
import { fonts, radius, spacing, tierColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { exerciseById, MUSCLES, type Muscle } from '@/lib/exercises';
import { todaysDayIndex } from '@/lib/program';
import { daysAgo } from '@/lib/store';
import { makeStyles, useColors } from '@/lib/theme';
import { hasFeature, LIMITS } from '@/lib/tiers';
import { doneSets, useWorkouts } from '@/lib/workouts';
import { locale, tx } from '@/lib/i18n';

export default function TrainingScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { tier } = useAuth();
  const { program, assigned, templates, templateDays, setTemplateDays, active, startDay, startEmpty, history, records, weeklySets } = useWorkouts();
  const [day, setDay] = useState(todaysDayIndex(program));
  // Şablon değişince bugünün gününe dön.
  useEffect(() => setDay(todaysDayIndex(program)), [program]);
  const unlocked = hasFeature(tier, 'training_programs');
  const fullHistory = hasFeature(tier, 'full_history');
  const current = program.days[Math.min(day, program.days.length - 1)];
  const volume = useMemo(() => weeklySets(), [weeklySets]);
  const topMuscles = (Object.entries(volume) as [Muscle, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const since = daysAgo(LIMITS.freeHistoryDays).toISOString();
  const visible = [...history].reverse().filter((s) => fullHistory || s.startedAt >= since);
  const hidden = history.length - visible.length;
  const prs = Object.entries(records)
    .sort((a, b) => b[1].at.localeCompare(a[1].at))
    .slice(0, 5);

  function begin(fn: () => void) {
    if (active) return router.push('/workout');
    fn();
    router.push('/workout');
  }

  return (
    <Screen>
      <Reveal index={0}>
        <ScreenHeader
          eyebrow={assigned ? 'Koçunun programı' : 'Programın'}
          title="Antrenman"
          right={
            <PressScale onPress={() => router.push('/library')} style={styles.libraryBtn}>
              <Icon name={{ ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' }} size={16} color={colors.accentBright} />
              <Text style={styles.libraryText}>HAREKETLER</Text>
            </PressScale>
          }
        />
      </Reveal>

      {active && (
        <Reveal index={1}>
          <PressScale onPress={() => router.push('/workout')}>
            <GradientCard colors={tierColors.pro}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Label>Devam eden</Label>
                <Mono style={{ color: colors.accentBright }}>{tx('{0} set tamam', [doneSets(active)])}</Mono>
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <Heading style={{ fontSize: 24 }}>{active.title}</Heading>
                <Icon name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }} size={20} />
              </Row>
            </GradientCard>
          </PressScale>
        </Reveal>
      )}

      {/* Koçun hazır şablonları: ücretli üye kaç gün çalışacağını seçer. Koç özel program atadıysa gizli. */}
      {unlocked && !assigned && templates.length > 0 && (
        <Reveal index={2}>
          <Card style={{ gap: spacing.sm }}>
            <Label>Haftada kaç gün?</Label>
            <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
              {templates.map((d) => (
                <Chip key={d} label={tx('{0} gün', [d])} active={templateDays === d} onPress={() => setTemplateDays(d)} />
              ))}
            </Row>
            {templateDays != null && program.note ? (
              <Body muted raw style={{ fontSize: 13 }}>
                {program.note}
              </Body>
            ) : null}
          </Card>
        </Reveal>
      )}

      <Reveal index={2}>
        <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
          {program.days.map((d, i) => (
            <Chip key={d.day + i} label={`${tx(d.short)} · ${tx(d.focus)}`} active={i === day} onPress={() => setDay(i)} />
          ))}
        </Row>
      </Reveal>

      <Reveal index={3}>
        <View>
          <Card glow>
            <Row style={{ justifyContent: 'space-between' }}>
              <Label>{current.day}</Label>
              <Row gap={6}>
                {assigned && <Tag color={colors.gold} bg={`${colors.gold}1F`}>Koç</Tag>}
                <Tag>{current.focus}</Tag>
              </Row>
            </Row>
            <Heading style={{ fontSize: 28 }}>{tx('{0} günü', [tx(current.focus)])}</Heading>
            <Mono style={{ color: colors.textMuted }}>{tx('{0} hareket · {1} set · ~ {2} dk', [current.exercises.length, current.exercises.reduce((n, e) => n + e.sets, 0), Math.round(current.exercises.reduce((n, e) => n + e.sets, 0) * 3.2)])}</Mono>
            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              {current.exercises.map((e, i) => {
                const ex = exerciseById(e.exerciseId);
                const rec = records[e.exerciseId];
                return (
                  <PressScale key={e.exerciseId + i} onPress={() => router.push(`/exercise/${e.exerciseId}`)} style={styles.exercise}>
                    <Text style={styles.index}>{String(i + 1).padStart(2, '0')}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{ex?.trName ?? e.exerciseId}</Text>
                      <Text style={styles.muscle}>
                        {ex?.primary.map((m) => MUSCLES[m].name).join(', ')}
                        {rec ? tx('  ·  En iyi {0} kg', [rec.kg]) : ''}
                      </Text>
                    </View>
                    <Mono style={{ color: colors.textMuted }}>
                      {e.sets}×{e.reps}
                    </Mono>
                    <Icon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} color={colors.textDim} />
                  </PressScale>
                );
              })}
            </View>
            {unlocked && (
              <Button
                title={active ? 'Devam eden antrenmana dön' : 'Bu antrenmanı başlat'}
                icon={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
                onPress={() => begin(() => startDay(current))}
              />
            )}
          </Card>

          {!unlocked && (
            <LinearGradient colors={['transparent', `${colors.background}F2`, colors.background]} style={styles.lockOverlay}>
              <View style={styles.lockIcon}>
                <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={22} />
              </View>
              <Heading style={{ fontSize: 24, textAlign: 'center' }}>Program Pro ile</Heading>
              <Body muted style={{ textAlign: 'center', maxWidth: 300, fontSize: 14 }}>
                Kişiye özel program, tüm hareketler ve tam geçmiş.
              </Body>
              <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.lg }}>
                <Button title="Paketleri gör" arrow onPress={() => router.push('/plans')} />
              </View>
            </LinearGradient>
          )}
        </View>
      </Reveal>

      <Reveal index={4}>
        <Button
          title="Serbest antrenman başlat"
          variant="outline"
          icon={{ ios: 'plus', android: 'add', web: 'add' }}
          onPress={() => begin(startEmpty)}
        />
      </Reveal>

      {/* Haftalık hacim: kas başına set */}
      <Reveal index={5}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Son 7 gün · kas başına set</Label>
            <PressScale onPress={() => router.push('/progress')}>
              <Text style={styles.link}>Grafikler →</Text>
            </PressScale>
          </Row>
          <Row gap={spacing.md} style={{ alignItems: 'center' }}>
            <BodyMap heat={volume} height={190} />
            <View style={{ flex: 1, gap: 6 }}>
              {topMuscles.length ? (
                topMuscles.map(([m, v]) => (
                  <Row key={m} style={{ justifyContent: 'space-between' }}>
                    <Text style={styles.muscleName}>{MUSCLES[m].name}</Text>
                    <Mono>{Math.round(v)}</Mono>
                  </Row>
                ))
              ) : (
                <Body muted style={{ fontSize: 13 }}>
                  Antrenman kaydettikçe çalıştırdığın kaslar burada renklenir.
                </Body>
              )}
            </View>
          </Row>
        </Card>
      </Reveal>

      {prs.length > 0 && (
        <Reveal index={6}>
          <SectionHeader title="Rekorların" action="Tümü" onAction={() => router.push('/progress')} />
          <Card style={{ gap: 0 }}>
            {prs.map(([id, r]) => (
              <PressScale key={id} onPress={() => router.push(`/exercise/${id}`)}>
                <Row style={styles.prRow}>
                  <Text style={{ fontSize: 18 }}>🏆</Text>
                  <Text style={[styles.name, { flex: 1 }]}>{exerciseById(id)?.trName}</Text>
                  <Mono>{tx('{0} kg × {1}', [r.kg, r.reps])}</Mono>
                  <Mono style={{ color: colors.textMuted }}>{tx('1RM ~{0}', [Math.round(r.e1rm)])}</Mono>
                </Row>
              </PressScale>
            ))}
          </Card>
        </Reveal>
      )}

      <Reveal index={7}>
        <SectionHeader title="Geçmiş" />
        {visible.length === 0 ? (
          <Body muted style={{ fontSize: 13.5 }}>
            İlk antrenmanını bitirdiğinde burada görünecek.
          </Body>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {visible.slice(0, 10).map((s) => (
              <Card key={s.id} style={{ gap: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={styles.name}>{s.title}</Text>
                  <Mono style={{ color: colors.textMuted }}>
                    {new Date(s.startedAt).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })}
                  </Mono>
                </Row>
                <Mono style={{ color: colors.textMuted, fontSize: 12 }}>{tx('{0} hareket · {1} set · {2} kg {3}', [s.exercises.length, doneSets(s), Math.round(s.volume ?? 0).toLocaleString(locale()), s.prs?.length ? ` · ${s.prs.length} rekor` : ''])}</Mono>
              </Card>
            ))}
          </View>
        )}
        {hidden > 0 && (
          <PressScale onPress={() => router.push('/plans')} style={styles.more}>
            <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={14} color={colors.textMuted} />
            <Text style={[styles.link, { color: colors.textMuted }]}>{tx('{0} eski antrenman Pro ile görünür', [hidden])}</Text>
            <TierBadge tier="pro" />
          </PressScale>
        )}
      </Reveal>

      <Reveal index={8}>
        <PressScale onPress={() => router.push('/form-check')}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <IconBox name={{ ios: 'video.fill', android: 'videocam', web: 'videocam' }} color="#C4B5FD" bg="rgba(196,181,253,0.16)" size={46} />
            <View style={{ flex: 1 }}>
              <Heading style={{ fontSize: 18 }}>Form check</Heading>
              <Body muted style={{ fontSize: 13 }}>
                Videonu gönder, koçun zaman damgalı yorum yazsın.
              </Body>
            </View>
            {!hasFeature(tier, 'form_check') && <TierBadge tier="plus" />}
          </Card>
        </PressScale>
      </Reveal>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  libraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  libraryText: { fontFamily: fonts.bodyBold, fontSize: 11.5, letterSpacing: 1, color: colors.accentBright },
  link: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentBright },
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
  muscle: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  muscleName: { fontFamily: fonts.body, fontSize: 13, color: colors.text },
  lockOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.lg,
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
  prRow: { gap: spacing.sm + 2, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  more: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, justifyContent: 'center' },
}));
