import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/T';

import { ExerciseMediaView } from '@/components/ExerciseMediaView';
import { MovementAnim } from '@/components/MovementAnim';
import { Body, Button, Chip, Icon, Input, PressScale, Row, Screen, Tag, TierBadge } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useExerciseMedia, useExerciseMediaIds } from '@/lib/exerciseMedia';
import { BUILTIN_MEDIA } from '@/lib/exerciseVideos';
import { useExercises } from '@/lib/exerciseCatalog';
import { GROUPS, isHidden, isUnlocked, MUSCLES, type MuscleGroup, type Pattern } from '@/lib/exercises';
import { makeStyles, useColors } from '@/lib/theme';
import { hasFeature, LIMITS } from '@/lib/tiers';
import { useWorkouts } from '@/lib/workouts';
import { tx } from '@/lib/i18n';

const plain = (s: string) => s.toLocaleLowerCase('tr-TR');

export default function LibraryScreen() {
  const colors = useColors();
  const withMedia = useExerciseMediaIds();
  const styles = useStyles();
  const { tier, isCoach } = useAuth();
  const { addExercise } = useWorkouts();
  const { pick } = useLocalSearchParams<{ pick?: string }>();
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [q, setQ] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const full = hasFeature(tier, 'full_library');
  // Kaldırılan hareketler listede görünmez; koç onları ayrı sekmede görüp geri ekleyebilir.
  const all = useExercises(isCoach);
  const hiddenCount = all.filter((e) => isHidden(e.id)).length;
  const hiddenTab = showHidden && hiddenCount > 0;

  const list = useMemo(
    () =>
      all
        .filter((e) => (hiddenTab ? isHidden(e.id) : !isHidden(e.id)))
        .filter((e) => !group || e.primary.some((m) => MUSCLES[m].group === group))
        .filter((e) => !q || plain(`${e.trName} ${e.name}`).includes(plain(q)))
        .sort((a, b) => Number(isUnlocked(b, full)) - Number(isUnlocked(a, full))),
    [all, group, q, full, hiddenTab],
  );

  return (
    <Screen edges={[]}>
      {!full && (
        <Row gap={spacing.sm} style={styles.banner}>
          <Body style={{ flex: 1, fontSize: 13 }}>{tx('Ücretsiz pakette {0} hareket açık. Tamamı için:', [LIMITS.freeLibrarySize])}</Body>
          <PressScale onPress={() => router.push('/plans')}>
            <TierBadge tier="pro" />
          </PressScale>
        </Row>
      )}
      {isCoach && !pick && (
        <Button title="Yeni hareket ekle" variant="outline" icon={{ ios: 'plus', android: 'add', web: 'add' }} onPress={() => router.push('/coach/exercise-new')} />
      )}
      <Input
        value={q}
        onChangeText={setQ}
        placeholder="Hareket ara"
        prefix={<Icon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={18} color={colors.textMuted} />}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        <Chip label="Tümü" active={!group && !hiddenTab} onPress={() => (setGroup(null), setShowHidden(false))} />
        {GROUPS.map((g) => (
          <Chip key={g} label={g} active={group === g && !hiddenTab} onPress={() => (setGroup(g), setShowHidden(false))} />
        ))}
        {isCoach && !pick && hiddenCount > 0 && (
          <Chip label={`Kaldırılanlar (${hiddenCount})`} active={hiddenTab} onPress={() => (setGroup(null), setShowHidden(true))} />
        )}
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
            style={[styles.item, (!open || isHidden(e.id)) && { opacity: 0.55 }]}>
            <Thumb exerciseId={e.id} pattern={e.pattern} canView={isCoach || tier !== 'free'} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.name}>{e.trName}</Text>
              <Text style={styles.muscles} numberOfLines={1}>
                {e.primary.map((m) => tx(MUSCLES[m].name)).join(', ')}
              </Text>
              <Row gap={8}>
                <Tag color={colors.textMuted} bg={colors.surfaceAlt}>
                  {e.equipment}
                </Tag>
                {isHidden(e.id) && (
                  <Tag color={colors.danger} bg={`${colors.danger}1F`}>
                    Kaldırıldı
                  </Tag>
                )}
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

// Hareketin kapağı: koçun yüklediği video küçük ve sessiz oynar, resim/GIF gösterilir (ücretli üye ve koç görür); yoksa uygulamayla gelen
// videonun kapak karesi, o da yoksa çizim animasyonu.
function Thumb({ exerciseId, pattern, canView }: { exerciseId: string; pattern: Pattern; canView: boolean }) {
  const styles = useStyles();
  const { media, url } = useExerciseMedia(exerciseId, canView);
  if (media && url) {
    return (
      <View style={styles.poster}>
        <ExerciseMediaView url={url} kind={media.kind} size={86} height={70} interactive={false} />
      </View>
    );
  }
  if (BUILTIN_MEDIA[exerciseId]) return <Image source={BUILTIN_MEDIA[exerciseId].poster} style={styles.poster} contentFit="cover" />;
  return (
    <View style={styles.thumb}>
      <MovementAnim pattern={pattern} size={86} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  banner: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  poster: { width: 86, height: 70, borderRadius: radius.md, backgroundColor: '#FFFFFF', overflow: 'hidden' },
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
