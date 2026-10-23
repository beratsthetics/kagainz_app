import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

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
  ScreenHeader,
  TierBadge,
  type IconName,
} from '@/components/ui';
import { colors, fonts, spacing, tierColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { hasFeature, type Feature, type Tier } from '@/lib/tiers';

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
];

export default function CommunityScreen() {
  const { tier, canPost, session } = useAuth();

  return (
    <Screen>
      <Reveal index={0}>
        <ScreenHeader eyebrow="KAGAINZ" title="Topluluk" />
        <Body muted>Gününü paylaş, başkalarından ilham al. Okumak serbest, yazmak için numaranı doğrula.</Body>
      </Reveal>

      {!canPost && (
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
                  {session ? 'Bir kullanıcı adı seç, yazmaya başla.' : '30 saniyede numaranı doğrula.'}
                </Body>
              </View>
            </Row>
            <Button
              title={session ? 'Kullanıcı adı seç' : 'Numaramı doğrula'}
              arrow
              onPress={() => router.push(session ? '/auth/username' : '/auth')}
            />
          </Card>
        </Reveal>
      )}

      {ROOMS.map((room, i) => {
        const open = hasFeature(tier, room.feature);
        const [c1] = tierColors[room.minTier === 'free' ? 'pro' : room.minTier];
        const content = (
          <>
            <Row style={{ justifyContent: 'space-between' }}>
              <IconBox name={room.icon} color={c1} bg={`${c1}22`} size={44} />
              {room.minTier === 'free' ? (
                <Row gap={6}>
                  <View style={styles.liveDot} />
                  <Text style={styles.open}>{'Açık'.toLocaleUpperCase('tr-TR')}</Text>
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
                {(open ? 'Sohbete gir' : 'Kilidi aç').toLocaleUpperCase('tr-TR')}
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
          <Reveal key={room.id} index={2 + i}>
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

const styles = StyleSheet.create({
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  open: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, color: colors.success },
  cta: { fontFamily: fonts.displayMedium, fontSize: 15, letterSpacing: 1, color: colors.text },
});
