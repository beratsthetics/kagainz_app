import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';
import { LevelBadge, LevelName } from '@/components/Level';

import { Avatar, Body, Button, Card, EmptyState, Label, PressScale, Reveal, Row, Screen, SkeletonList, Tag, TierBadge } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useProgress } from '@/lib/progress';
import { KUDOS, sendKudos, setFollowing, usePublicProfile } from '@/lib/social';
import { useColors } from '@/lib/theme';
import { locale, tx } from '@/lib/i18n';

export default function UserProfile() {
  const colors = useColors();
  const { username } = useLocalSearchParams<{ username: string }>();
  const { session } = useAuth();
  const { bump } = useProgress();
  const { profile, setProfile, error } = usePublicProfile(username);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const me = session?.user.id;

  if (profile === undefined) {
    return (
      <Screen edges={[]}>
        <SkeletonList variant="detail" />
      </Screen>
    );
  }
  if (!profile) {
    return (
      <Screen edges={[]}>
        <EmptyState icon={{ ios: 'person.crop.circle.badge.questionmark', android: 'person_search', web: 'person_search' }} title="Kullanıcı bulunamadı" body={error ?? undefined} />
      </Screen>
    );
  }

  const self = profile.id === me;

  async function toggleFollow() {
    if (!me || !profile) return;
    setBusy(true);
    setNotice(null);
    const next = !profile.is_following;
    const err = await setFollowing(me, profile.id, next);
    setBusy(false);
    if (err) return setNotice(err);
    setProfile({ ...profile, is_following: next, followers: profile.followers + (next ? 1 : -1) });
  }

  async function kudos(emoji: (typeof KUDOS)[number]) {
    if (!me || !profile) return;
    const err = await sendKudos(me, profile.id, emoji);
    if (err) return setNotice(err);
    bump('kudos');
    setProfile({ ...profile, kudos_today: true });
    setNotice(tx('@{0} tebrik edildi {1}', [profile.username, emoji]));
  }

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: `@${profile.username}`.toLocaleUpperCase(locale()) }} />
      <Reveal index={0}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Avatar name={profile.username} path={profile.avatar_url} size={96} />
          <Row gap={6}>
            <LevelName username={profile.username} xp={profile.xp} style={{ fontFamily: fonts.display, fontSize: 28, color: colors.text }} />
            {profile.tier !== 'free' && <TierBadge tier={profile.tier} />}
            <LevelBadge xp={profile.xp} size="md" />
          </Row>
          {profile.role === 'coach' && (
            <Tag color={colors.accentBright} bg={colors.accentSoft}>
              Koç
            </Tag>
          )}
          {profile.follows_me && !self && <Body muted style={{ fontSize: 13 }}>Seni takip ediyor</Body>}
        </View>
      </Reveal>

      <Reveal index={1}>
        <Row gap={spacing.sm}>
          <Box label="Takipçi" value={profile.followers} />
          <Box label="Takip" value={profile.following} />
          <Box label="Seri" value={profile.streak ?? '–'} suffix={profile.streak ? ' 🔥' : ''} />
          <Box label="Bu hafta" value={profile.week_workouts ?? '–'} suffix={profile.week_workouts ? ' 💪' : ''} />
        </Row>
      </Reveal>

      {!self && me && (
        <Reveal index={2}>
          <Button title={profile.is_following ? 'Takibi bırak' : 'Takip et'} variant={profile.is_following ? 'outline' : 'primary'} loading={busy} onPress={toggleFollow} />
        </Reveal>
      )}

      {!self && me && (
        <Reveal index={3}>
          <Card>
            <Label>Tebrik et</Label>
            <Body muted style={{ fontSize: 13 }}>
              {profile.kudos_today ? 'Bugün tebrik ettin. Yarın yine gönderebilirsin.' : 'Günde bir kez; bildirim olarak gider.'}
            </Body>
            <Row gap={spacing.sm}>
              {KUDOS.map((e) => (
                <PressScale key={e} flex disabled={profile.kudos_today} onPress={() => kudos(e)}>
                  <View
                    style={{
                      alignItems: 'center',
                      paddingVertical: spacing.sm,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceAlt,
                      opacity: profile.kudos_today ? 0.4 : 1,
                    }}>
                    <Text style={{ fontSize: 28 }}>{e}</Text>
                  </View>
                </PressScale>
              ))}
            </Row>
          </Card>
        </Reveal>
      )}

      {notice && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>{notice}</Text>}

      {self && <Button title="Arkadaşlarını gör" variant="outline" arrow onPress={() => router.push('/friends')} />}
      {profile.streak == null && profile.week_workouts == null && (
        <Body muted style={{ fontSize: 12.5, textAlign: 'center' }}>
          Seri ve antrenman sayısı, kullanıcı sıralamada görünmeyi açtıysa gösterilir.
        </Body>
      )}
    </Screen>
  );
}

function Box({ label, value, suffix = '' }: { label: string; value: number | string; suffix?: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 2 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.text }}>
        {value}
        {suffix}
      </Text>
      <Label>{label}</Label>
    </View>
  );
}
