import { Body, Button, Card, Heading, Label, Screen, Title } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { TIER_INFO, type Tier } from '@/lib/tiers';

const PLANS: Tier[] = ['free', 'pro', 'plus', 'max'];

export default function PlansScreen() {
  const { tier } = useAuth();

  return (
    <Screen>
      <Title>Paketler</Title>
      <Body muted>Aylık abonelik. Ödeme altyapısı yakında eklenecek.</Body>
      {PLANS.map((t) => (
        <Card key={t} style={t === tier ? { borderColor: colors.text } : undefined}>
          <Label>{t === tier ? 'Mevcut paketin' : t === 'free' ? 'Ücretsiz' : 'Aylık'}</Label>
          <Heading>{TIER_INFO[t].name}</Heading>
          {TIER_INFO[t].perks.map((p) => (
            <Body key={p} muted>
              • {p}
            </Body>
          ))}
          {t !== 'free' && t !== tier && <Button title="Yakında" disabled />}
        </Card>
      ))}
    </Screen>
  );
}
