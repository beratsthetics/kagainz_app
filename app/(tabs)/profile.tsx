import { router } from 'expo-router';

import { Body, Button, Card, Heading, Label, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { TIER_INFO } from '@/lib/tiers';

export default function ProfileScreen() {
  const { session, profile, tier, signOut } = useAuth();

  return (
    <Screen>
      <Title>Profil</Title>
      {session ? (
        <Card>
          <Label>Kullanıcı adı</Label>
          <Heading>@{profile?.username ?? 'seçilmedi'}</Heading>
          <Label>Telefon</Label>
          <Body>{session.user.phone ? `+${session.user.phone.replace(/^\+/, '')}` : '-'}</Body>
          {!profile?.username && <Button title="Kullanıcı adı seç" onPress={() => router.push('/auth/username')} />}
        </Card>
      ) : (
        <Card>
          <Heading>Giriş yapmadın</Heading>
          <Body muted>Telefon numaranla saniyeler içinde giriş yap.</Body>
          <Button title="Giriş yap" onPress={() => router.push('/auth/phone')} />
        </Card>
      )}

      <Card>
        <Label>Üyelik</Label>
        <Heading>{TIER_INFO[tier].name}</Heading>
        {TIER_INFO[tier].perks.map((p) => (
          <Body key={p} muted>
            • {p}
          </Body>
        ))}
        <Button title="Paketleri gör" variant="outline" onPress={() => router.push('/plans')} />
      </Card>

      {session && <Button title="Çıkış yap" variant="outline" onPress={signOut} />}
    </Screen>
  );
}
