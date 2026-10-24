import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Avatar, Body, Button, Card, EmptyState, Input, Label, PressScale, Reveal, Row, Screen, Segmented, SkeletonList, TierBadge } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { searchUsers, setFollowing, useFollowingIds, useFollowList, type UserRow } from '@/lib/social';
import { useColors } from '@/lib/theme';

type Tab = 'following' | 'followers';

export default function FriendsScreen() {
  const colors = useColors();
  const { session, profile } = useAuth();
  const me = session?.user.id;
  const [tab, setTab] = useState<Tab>('following');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<UserRow[] | null>(null);
  const { rows, error, reload } = useFollowList(me, tab);
  const { ids, setIds } = useFollowingIds(me);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) return setFound(null);
    const t = setTimeout(() => searchUsers(q).then((r) => setFound(r.filter((u) => u.id !== me))), 300);
    return () => clearTimeout(t);
  }, [q, me]);

  if (!me || !profile?.username) {
    return (
      <Screen edges={[]}>
        <EmptyState icon={{ ios: 'person.2.fill', android: 'group', web: 'group' }} title="Arkadaşlarını bul" body="Takip etmek için giriş yap ve kullanıcı adı seç." />
        <Button title={me ? 'Kullanıcı adı seç' : 'Giriş yap'} arrow onPress={() => router.push(me ? '/auth/username' : '/auth')} />
      </Screen>
    );
  }

  async function toggle(u: UserRow) {
    const next = !ids.has(u.id);
    const err = await setFollowing(me!, u.id, next);
    if (err) return setNotice(err);
    setNotice(null);
    setIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(u.id);
      else s.delete(u.id);
      return s;
    });
    if (tab === 'following') reload();
  }

  const list = found ?? rows;

  return (
    <Screen edges={[]}>
      <Reveal index={0}>
        <Input value={q} onChangeText={setQ} placeholder="Kullanıcı adıyla ara" autoCapitalize="none" autoCorrect={false} prefix={<Text style={{ color: colors.textMuted, fontFamily: fonts.bodyBold }}>@</Text>} />
      </Reveal>
      {!found && (
        <Reveal index={1}>
          <Segmented
            options={[
              { value: 'following', label: 'Takip ettiklerin' },
              { value: 'followers', label: 'Takipçilerin' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </Reveal>
      )}
      {(notice || error) && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger }}>{notice ?? error}</Text>}

      {list == null ? (
        <SkeletonList count={5} />
      ) : list.length === 0 ? (
        found ? (
          <EmptyState icon={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} title="Kimse bulunamadı" body="Kullanıcı adının başını yazmayı dene." />
        ) : (
          <EmptyState
            icon={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
            title={tab === 'following' ? 'Henüz kimseyi takip etmiyorsun' : 'Henüz takipçin yok'}
            body="Yukarıdan arkadaşını ara ya da davet kodunu paylaş. Takip ettiklerin sıralamada ayrı listelenir."
          />
        )
      ) : (
        <View style={{ gap: spacing.xs }}>
          {list.map((u) => (
            <PressScale key={u.id} onPress={() => router.push({ pathname: '/u/[username]', params: { username: u.username } })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
                <Avatar name={u.username} path={u.avatar_url} size={40} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text }}>@{u.username}</Text>
                  {u.tier !== 'free' && <TierBadge tier={u.tier} />}
                </View>
                <PressScale onPress={() => toggle(u)}>
                  <View
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: ids.has(u.id) ? colors.borderStrong : colors.primary,
                      backgroundColor: ids.has(u.id) ? 'transparent' : colors.primary,
                    }}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: ids.has(u.id) ? colors.text : colors.primaryText }}>
                      {ids.has(u.id) ? 'Takiptesin' : 'Takip et'}
                    </Text>
                  </View>
                </PressScale>
              </View>
            </PressScale>
          ))}
        </View>
      )}

      <Reveal index={3}>
        <Card>
          <Label>Arkadaşını getir</Label>
          <Body muted style={{ fontSize: 13.5 }}>
            Davet kodunla katılan biri ücretli pakete geçerse sana 1 hafta Pro hediye.
          </Body>
          <Button title="Davet kodumu paylaş" variant="outline" arrow onPress={() => router.push('/invite')} />
        </Card>
      </Reveal>
    </Screen>
  );
}
