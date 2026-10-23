import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { MovementAnim } from '@/components/MovementAnim';
import { Body, Chip, Icon, Input, PressScale, Row, Screen, Tag, TierBadge } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useExerciseMediaIds } from '@/lib/exerciseMedia';
import { EXERCISES, GROUPS, isUnlocked, MUSCLES, type MuscleGroup } from '@/lib/exercises';
import { makeStyles, useColors } from '@/lib/theme';
import { hasFeature, LIMITS } from '@/lib/tiers';
import { useWorkouts } from '@/lib/workouts';

const plain = (s: string) => s.toLocaleLowerCase('tr-TR');

export default function LibraryScreen() {
  const colors = useColors();
  const withMedia = useExerciseMediaIds();
  const styles = useStyles();
  const { tier } = useAuth();
  const { addExercise } = useWorkouts();
  const { pick } = useLocalSearchParams<{ pick?: string }>();
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [q, setQ] = useState('');
  const full = hasFeature(tier, 'full_library');

  const list = useMemo(
    () =>
      EXERCISES.filter((e) => !group || e.primary.some((m) => MUSCLES[m].group === group))
        .filter((e) => !q || plain(`${e.trName} ${e.name}`).includes(plain(q)))
        .sort((a, b) => Number(isUnlocked(b, full)) - Number(isUnlocked(a, full))),
    [group, q, full],
  );

  return (
    <Screen edges={[]}>
      {!full && (
        <Row gap={spacing.sm} style={styles.banner}>
          <Body style={{ flex: 1, fontSize: 13 }}>
            Ücretsiz pakette {LIMITS.freeLibrarySize} hareket açık. Tamamı için:
          </Body>
          <PressScale onPress={() => router.push('/plans')}>
            <TierBadge tier="pro" />
          </PressScale>
        </Row>
      )}
      <Input
        value={q}
        onChangeText={setQ}
        placeholder="Hareket ara"
        prefix={<Icon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={18} color={colors.textMuted} />}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        <Chip label="Tümü" active={!group} onPress={() => setGroup(null)} />
        {GROUPS.map((g) => (
          <Chip key={g} label={g} active={group === g} onPress={() => setGroup(g)} />
        ))}
      </ScrollView>

      {list.map((e) => {
        const open = isUnlocked(e, full);
        return (
          <PressScale
            key={e.id}
            onPress={() => {
              if (!open) return router.push('/plans');
              if (pick) {
                addExercise(e.id);
                return router.back();
              }
              router.push(`/exercise/${e.id}`);
            }}
            style={[styles.item, !open && { opacity: 0.55 }]}>
            <View style={styles.thumb}>
              <MovementAnim pattern={e.pattern} size={86} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.name}>{e.trName}</Text>
              <Text style={styles.muscles} numberOfLines={1}>
                {e.primary.map((m) => MUSCLES[m].name).join(', ')}
              </Text>
              <Row gap={6}>
                <Tag color={colors.textMuted} bg={colors.surfaceAlt}>
                  {e.equipment}
                </Tag>
                {withMedia.has(e.id) && (
                  <Tag color={colors.accentBright} bg={colors.accentSoft}>
                    Video
                  </Tag>
                )}
                {e.free && !full && (
                  <Tag color={colors.success} bg={colors.successSoft}>
                    Ücretsiz
                  </Tag>
                )}
              </Row>
            </View>
            <Icon
              name={
                !open
                  ? { ios: 'lock.fill', android: 'lock', web: 'lock' }
                  : pick
                    ? { ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }
                    : { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }
              }
              size={pick && open ? 24 : 16}
              color={pick && open ? colors.accentBright : colors.textDim}
            />
          </PressScale>
        );
      })}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  banner: {
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  thumb: {
    width: 86,
    height: 70,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  muscles: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted },
}));
