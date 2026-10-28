import { router } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/T';

import {
  Body,
  Button,
  Card,
  GradientCard,
  Heading,
  Icon,
  IconBox,
  PressScale,
  Reveal,
  Row,
  Screen,
  ProgressBar,
  ScreenHeader,
  Tag,
  TierBadge,
  type IconName,
} from '@/components/ui';
import { fonts, spacing, tierColors } from '@/constants/theme';
import { useAuth, useJoinStep } from '@/lib/auth';
import { challengeProgress } from '@/lib/challenges';
import { useProgress } from '@/lib/progress';
import { hasFeature, type Feature, type Tier } from '@/lib/tiers';
import { makeStyles, useColors } from '@/lib/theme';
import { tx } from '@/lib/i18n';

const ROOMS: { id: string; name: string; description: string; feature: Feature; minTier: Tier; icon: IconName }[] = [
  {
    id: 'genel',
    name: 'Genel',
    description: 'Öğünlerini, antrenmanlarını ve gününü paylaş. Herkese açık.',
    feature: 'general_chat',
    minTier: 'free',
    icon: { ios: 'globe', android: 'public', web: 'public' },
  },
  {
    id: 'pro',
    name: 'Pro Kulüp',
    description: 'Program takip eden Pro üyelerle birebir motivasyon.',
    feature: 'pro_chat',
    minTier: 'pro',
    icon: { ios: 'bolt.fill', android: 'bolt', web: 'bolt' },
  },
  {
    id: 'plus',
    name: 'Plus Kulüp',
    description: 'En kararlı ekip. Form check sonuçları ve ileri seviye sohbet.',
    feature: 'plus_chat',
    minTier: 'plus',
    icon: { ios: 'crown.fill', android: 'workspace_premium', web: 'workspace_premium' },
  },
  {
    id: 'max',
    name: 'Max Salonu',
    description: 'Koçlarla aynı odada. Soru sor, canlı geri bildirim al.',
    feature: 'max_chat',
    minTier: 'max',
    icon: { ios: 'diamond.fill', android: 'diamond', web: 'diamond' },
  },
];

export default function CommunityScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { tier, isCoach } = useAuth();
  const join = useJoinStep();
  const { activity } = useProgress();
  const ch = challengeProgress(activity);
  const dmOpen = hasFeature(tier, 'coach_dm') || isCoach;

  return (
    <Screen>
      <Reveal index={0}>
        <ScreenHeader eyebrow="KAGAINZ" title="Topluluk" />
        <Body muted>Gününü paylaş, başkalarından ilham al. Okumak serbest, yazmak için kullanıcı adı seçmen yeterli.</Body>
      </Reveal>

      {join && (
        <Reveal index={1}>
          <Card style={{ borderColor: colors.accent }}>
            <Row gap={spacing.md}>
              <IconBox
                name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }}
                color={colors.accentBright}
                bg={colors.accentSoft}
              />
              <View style={{ flex: 1 }}>
                <Heading style={{ fontSize: 17 }}>Sohbete katıl</Heading>
                <Body muted style={{ fontSize: 13 }}>
                  {join.hint}
                </Body>
              </View>
            </Row>
            <Button title={join.title} arrow onPress={() => router.push(join.href)} />
          </Card>
        </Reveal>
      )}

      <Reveal index={2}>
        <PressScale onPress={() => router.push('/challenges')}>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={styles.eyebrow}>Haftanın meydan okuması</Text>
              {ch.done && (
                <Tag color={colors.success} bg={colors.successSoft}>
                  Tamam
                </Tag>
              )}
            </Row>
            <Row gap={spacing.md}>
              <Text style={{ fontSize: 34 }}>{ch.challenge.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Heading style={{ fontSize: 19 }}>{ch.challenge.title}</Heading>
                <Body muted style={{ fontSize: 13 }}>
                  {ch.challenge.description}
                </Body>
              </View>
            </Row>
            <ProgressBar value={ch.value / ch.challenge.target} color={ch.done ? colors.success : colors.accent} height={5} />
          </Card>
        </PressScale>
      </Reveal>

      <Reveal index={2}>
        <PressScale onPress={() => router.push('/leaderboard')}>
          <Card>
            <Row gap={spacing.md}>
              <Text style={{ fontSize: 30 }}>🏆</Text>
              <View style={{ flex: 1 }}>
                <Heading style={{ fontSize: 19 }}>Sıralama</Heading>
                <Body muted style={{ fontSize: 13 }}>
                  En uzun seri, bu haftanın en çok antrenman yapanları.
                </Body>
              </View>
              <Text style={[styles.eyebrow, { fontSize: 18 }]}>›</Text>
            </Row>
          </Card>
        </PressScale>
      </Reveal>

      <Reveal index={3}>
        <PressScale onPress={() => router.push(isCoach ? '/coach' : dmOpen ? '/dm/me' : '/plans')}>
          <GradientCard colors={tierColors.max}>
            <Row gap={spacing.md}>
              <IconBox
                name={{ ios: 'bubble.left.and.text.bubble.right.fill', android: 'forum', web: 'forum' }}
                color={colors.accentBright}
                bg={colors.accentSoft}
              />
              <View style={{ flex: 1 }}>
                <Heading style={{ fontSize: 18 }}>{isCoach ? 'Koç paneli' : 'Koçuna yaz'}</Heading>
                <Body muted style={{ fontSize: 13 }}>
                  {isCoach
                    ? 'Form check, mesajlar ve üyeler.'
                    : dmOpen
                      ? 'Birebir mesajlaş, programını ve öğünlerini sor.'
                      : 'Max üyelere koçla birebir mesajlaşma.'}
                </Body>
              </View>
              {dmOpen ? (
                <Icon name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={16} />
              ) : (
                <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={16} color={colors.textMuted} />
              )}
            </Row>
          </GradientCard>
        </PressScale>
      </Reveal>

      {ROOMS.map((room, i) => {
        const open = isCoach || hasFeature(tier, room.feature);
        const c1 = colors.accentBright;
        const content = (
          <>
            <Row style={{ justifyContent: 'space-between' }}>
              <IconBox name={room.icon} color={c1} bg={`${c1}22`} size={44} />
              {room.minTier === 'free' ? (
                <Row gap={8}>
                  <View style={styles.liveDot} />
                  <Text style={styles.open}>{tx('Açık')}</Text>
                </Row>
              ) : (
                <TierBadge tier={room.minTier} />
              )}
            </Row>
            <Heading style={{ fontSize: 24, marginTop: spacing.xs }}>{room.name}</Heading>
            <Body muted style={{ fontSize: 14 }}>
              {room.description}
            </Body>
            <Row style={{ justifyContent: 'space-between', marginTop: spacing.xs }}>
              <Text style={[styles.cta, !open && { color: colors.textMuted }]}>
                {tx(open ? 'Sohbete gir' : 'Kilidi aç')}
              </Text>
              <Icon
                name={
                  open
                    ? { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }
                    : { ios: 'lock.fill', android: 'lock', web: 'lock' }
                }
                size={16}
                color={open ? colors.text : colors.textMuted}
              />
            </Row>
          </>
        );
        return (
          <Reveal key={room.id} index={4 + i}>
            <PressScale onPress={() => router.push(open ? `/chat/${room.id}` : '/plans')}>
              {room.minTier === 'free' ? (
                <Card glow>{content}</Card>
              ) : (
                <GradientCard colors={tierColors[room.minTier]}>{content}</GradientCard>
              )}
            </PressScale>
          </Reveal>
        );
      })}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentBright },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  open: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.success },
  cta: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
}));
