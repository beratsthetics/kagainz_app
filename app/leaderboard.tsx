import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Avatar, Body, Button, Card, Chip, EmptyState, Eyebrow, Hero, PressScale, Reveal, Row, Screen, Segmented, SkeletonList, TierBadge } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useLeaderboard, useLeaderboardVisible, type Board, type LeaderRow } from '@/lib/leaderboard';
import { makeStyles, useColors } from '@/lib/theme';

const BOARDS: Record<Board, { label: string; unit: string; hint: string }> = {
  streak: { label: 'Seri', unit: 'gün', hint: 'Üst üste kayıt girilen gün sayısı.' },
  week: { label: 'Bu hafta', unit: 'antrenman', hint: 'Pazartesiden beri bitirilen antrenmanlar.' },
  challenge: { label: 'Meydan okuma', unit: 'tamamlandı', hint: 'Bugüne kadar tamamlanan haftalık meydan okumalar.' },
};
const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const styles = useStyles();
  const colors = useColors();
  const { session, profile } = useAuth();
  const [board, setBoard] = useState<Board>('streak');
  const [friends, setFriends] = useState(false);
  const { rows, error } = useLeaderboard(board, friends);
  const [visible, setVisible] = useLeaderboardVisible();
  const info = BOARDS[board];

  if (!session || !profile?.username) {
    return (
      <Screen edges={[]}>
        <EmptyState
          icon={{ ios: 'trophy.fill', android: 'trophy', web: 'trophy' }}
          title="Sıralamaya katıl"
          body="Sıralamada yer almak için giriş yap ve bir kullanıcı adı seç."
        />
        <Button title={session ? 'Kullanıcı adı seç' : 'Giriş yap'} arrow onPress={() => router.push(session ? '/auth/username' : '/auth')} />
      </Screen>
    );
  }

  const top = rows?.filter((r) => r.rank <= 3).slice(0, 3) ?? [];
  const rest = rows?.filter((r) => !top.includes(r) && r.rank <= 50) ?? [];
  const me = rows?.find((r) => r.is_me);

  return (
    <Screen edges={[]}>
      <Reveal index={0}>
        <Eyebrow>Topluluk</Eyebrow>
        <Hero lines={['Sıralama']} size={48} />
      </Reveal>
      <Reveal index={1}>
        <Segmented
          options={(Object.keys(BOARDS) as Board[]).map((b) => ({ value: b, label: BOARDS[b].label }))}
          value={board}
          onChange={setBoard}
        />
        <Row gap={spacing.xs} style={{ marginTop: spacing.sm }}>
          <Chip label="Herkes" active={!friends} onPress={() => setFriends(false)} />
          <Chip label="Takip ettiklerim" active={friends} onPress={() => setFriends(true)} />
          <View style={{ flex: 1 }} />
          <PressScale onPress={() => router.push('/friends')}>
            <Text style={styles.link}>Arkadaş bul →</Text>
          </PressScale>
        </Row>
        <Body muted style={{ fontSize: 13, marginTop: spacing.sm }}>
          {info.hint}
        </Body>
      </Reveal>

      {!visible && (
        <Card style={{ borderColor: colors.fat }}>
          <Body style={{ fontSize: 14 }}>Sıralamada gizlisin. Başkaları seni listede görmüyor.</Body>
          <Button title="Beni göster" variant="outline" onPress={() => setVisible(true)} />
        </Card>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {rows == null ? (
        <SkeletonList count={6} />
      ) : rows.length === 0 && !error ? (
        <EmptyState
          icon={{ ios: 'trophy.fill', android: 'trophy', web: 'trophy' }}
          title="Henüz kimse yok"
          body={friends ? 'Takip ettiğin kimse bu listede değil. Arkadaş bul ve takip et.' : 'İlk sırayı kapmak için bugün bir öğün gir ya da antrenman bitir.'}
        />
      ) : (
        <View key={`${board}-${friends}`} style={{ gap: spacing.md }}>
          {top.length > 0 && <Podium rows={top} unit={info.unit} />}
          <View style={{ gap: spacing.xs }}>
            {rest.map((r, i) => (
              <Animated.View key={r.user_id} entering={FadeInDown.delay(i * 35).duration(260)}>
                <RowItem row={r} unit={info.unit} />
              </Animated.View>
            ))}
          </View>
          {me && me.rank > 50 && (
            <View style={{ gap: spacing.xs }}>
              <Text style={styles.gap}>···</Text>
              <RowItem row={me} unit={info.unit} />
            </View>
          )}
          {!me && visible && (
            <Body muted style={{ fontSize: 13, textAlign: 'center' }}>
              Henüz bu listede değilsin. {board === 'week' ? 'Bu hafta bir antrenman bitir.' : board === 'streak' ? 'Bugün kayıt gir, serin başlasın.' : 'Bu haftanın meydan okumasını tamamla.'}
            </Body>
          )}
        </View>
      )}
    </Screen>
  );
}

function openProfile(r: LeaderRow) {
  router.push({ pathname: '/u/[username]', params: { username: r.username } });
}

function Podium({ rows, unit }: { rows: LeaderRow[]; unit: string }) {
  const styles = useStyles();
  const colors = useColors();
  // 2. solda, 1. ortada, 3. sağda.
  const order = [rows[1], rows[0], rows[2]];
  const heights = [96, 128, 76];
  return (
    <Row style={{ alignItems: 'flex-end', gap: spacing.sm }}>
      {order.map((r, i) =>
        r ? (
          <Animated.View key={r.user_id} entering={FadeInUp.delay(120 + i * 90).springify()} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <PressScale onPress={() => openProfile(r)}>
              <Avatar name={r.username} path={r.avatar_url} size={i === 1 ? 68 : 54} />
              <Text style={styles.medal}>{MEDAL[r.rank - 1] ?? ''}</Text>
            </PressScale>
            <Text style={[styles.podiumName, r.is_me && { color: colors.accentBright }]} numberOfLines={1}>
              @{r.username}
            </Text>
            <View style={[styles.step, { height: heights[i] }, i === 1 && { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}>
              <Text style={styles.stepValue}>{r.value}</Text>
              <Text style={styles.stepUnit}>{unit.toLocaleUpperCase('tr-TR')}</Text>
            </View>
          </Animated.View>
        ) : (
          <View key={i} style={{ flex: 1 }} />
        ),
      )}
    </Row>
  );
}

function RowItem({ row, unit }: { row: LeaderRow; unit: string }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <PressScale onPress={() => openProfile(row)}>
      <View style={[styles.row, row.is_me && { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}>
        <Text style={styles.rank}>{row.rank}</Text>
        <Avatar name={row.username} path={row.avatar_url} size={36} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name} numberOfLines={1}>
            @{row.username}
            {row.is_me ? ' (sen)' : ''}
          </Text>
          {row.tier !== 'free' && <TierBadge tier={row.tier} />}
        </View>
        <Text style={styles.value}>
          {row.value} <Text style={styles.unit}>{unit}</Text>
        </Text>
      </View>
    </PressScale>
  );
}

const useStyles = makeStyles((colors) => ({
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger },
  link: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentBright },
  gap: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textMuted, textAlign: 'center' },
  medal: { position: 'absolute', right: -6, bottom: -4, fontSize: 22 },
  podiumName: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.text, maxWidth: '100%' },
  step: {
    alignSelf: 'stretch',
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  stepValue: { fontFamily: fonts.display, fontSize: 30, color: colors.text },
  stepUnit: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1.2, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rank: { width: 26, fontFamily: fonts.display, fontSize: 18, color: colors.textMuted, textAlign: 'center' },
  name: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  value: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  unit: { fontFamily: fonts.body, fontSize: 11.5, color: colors.textMuted },
}));
