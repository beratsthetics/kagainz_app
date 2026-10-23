import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  Avatar,
  Body,
  Button,
  Card,
  GradientCard,
  Heading,
  Hero,
  Icon,
  Label,
  Mono,
  PressScale,
  Reveal,
  Row,
  Screen,
  TierBadge,
  type IconName,
} from '@/components/ui';
import { colors, fonts, spacing, tierColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useDaily } from '@/lib/daily';
import { TIER_INFO } from '@/lib/tiers';

const CHECK: IconName = { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' };

export default function ProfileScreen() {
  const { session, profile, tier, signOut } = useAuth();
  const { goals } = useDaily();

  if (!session) {
    return (
      <Screen>
        <Reveal index={0}>
          <Hero lines={['Hesabını', 'oluştur']} size={52} />
        </Reveal>
        <Reveal index={1}>
          <Body muted>Topluluğa yazmak, ilerlemeni kaydetmek ve paketlere geçmek için numaranla giriş yap.</Body>
        </Reveal>
        <Reveal index={2}>
          <Card glow>
            {['Şifre yok, sadece SMS kodu', 'Makro günlüğün her cihazda', 'Toplulukta kendi kullanıcı adın'].map(
              (t) => (
                <Row key={t} gap={10}>
                  <Icon name={CHECK} size={16} color={colors.success} />
                  <Body style={{ fontSize: 14 }}>{t}</Body>
                </Row>
              ),
            )}
            <View style={{ marginTop: spacing.sm }}>
              <Button title="Giriş yap / Kayıt ol" arrow onPress={() => router.push('/auth')} />
            </View>
          </Card>
        </Reveal>
        <Reveal index={3}>
          <MembershipCard />
        </Reveal>
      </Screen>
    );
  }

  return (
    <Screen>
      <Reveal index={0}>
        <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md }}>
          <Avatar name={profile?.username} size={88} />
          <Text style={styles.username}>@{profile?.username ?? 'kullanıcı adı yok'}</Text>
          <TierBadge tier={tier} />
          <Mono style={{ color: colors.textMuted }}>
            {session.user.phone ? `+${session.user.phone.replace(/^\+/, '')}` : ''}
          </Mono>
        </View>
      </Reveal>

      {!profile?.username && (
        <Reveal index={1}>
          <Button title="Kullanıcı adı seç" arrow onPress={() => router.push('/auth/username')} />
        </Reveal>
      )}

      <Reveal index={2}>
        <Card>
          <Label>Günlük hedefler</Label>
          <Row style={{ justifyContent: 'space-between' }}>
            <Goal label="Kalori" value={`${goals.kcal}`} />
            <Goal label="Protein" value={`${goals.protein}g`} color={colors.protein} />
            <Goal label="Karb." value={`${goals.carb}g`} color={colors.carb} />
            <Goal label="Yağ" value={`${goals.fat}g`} color={colors.fat} />
          </Row>
        </Card>
      </Reveal>

      <Reveal index={3}>
        <MembershipCard />
      </Reveal>

      <Reveal index={4}>
        <PressScale onPress={signOut} style={styles.signOut}>
          <Icon
            name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
            size={18}
            color={colors.danger}
          />
          <Text style={styles.signOutText}>{'Çıkış yap'.toLocaleUpperCase('tr-TR')}</Text>
        </PressScale>
      </Reveal>
    </Screen>
  );
}

function Goal({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 22, color }}>{value}</Text>
      <Label>{label}</Label>
    </View>
  );
}

function MembershipCard() {
  const { tier } = useAuth();
  return (
    <GradientCard colors={tierColors[tier === 'free' ? 'pro' : tier]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Label>Üyeliğin</Label>
        <TierBadge tier={tier} />
      </Row>
      <Heading style={{ fontSize: 26 }}>{TIER_INFO[tier].name}</Heading>
      {TIER_INFO[tier].perks.map((p) => (
        <Row key={p} gap={10}>
          <Icon name={CHECK} size={15} color={colors.success} />
          <Body muted style={{ flex: 1, fontSize: 14 }}>
            {p}
          </Body>
        </Row>
      ))}
      <View style={{ marginTop: spacing.sm }}>
        <Button title={tier === 'free' ? "Pro'ya geç" : 'Paketleri gör'} arrow onPress={() => router.push('/plans')} />
      </View>
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  username: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  signOutText: { fontFamily: fonts.displayMedium, fontSize: 15, letterSpacing: 1, color: colors.danger },
});
