import { router } from 'expo-router';
import { Text, View } from 'react-native';

import {
  Body,
  Button,
  Card,
  GradientCard,
  Heading,
  Hero,
  Icon,
  Label,
  PressScale,
  Reveal,
  Row,
  Screen,
  TierBadge,
} from '@/components/ui';
import { fonts, spacing, tierColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { TIER_INFO, type Tier } from '@/lib/tiers';
import { makeStyles, useColors } from '@/lib/theme';

const PLANS: Tier[] = ['free', 'pro', 'plus', 'max'];
const POPULAR: Tier = 'plus';

export default function PlansScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { tier } = useAuth();

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ justifyContent: 'flex-end' }}>
        <PressScale onPress={() => router.back()} style={styles.close}>
          <Icon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} />
        </PressScale>
      </Row>
      <Reveal index={0}>
        <Hero lines={['Seviyeni', 'seç']} size={52} />
      </Reveal>
      <Reveal index={1}>
        <Body muted>Aylık abonelik, istediğin zaman iptal et. Ödeme sistemi çok yakında aktif olacak.</Body>
      </Reveal>

      {PLANS.map((t, i) => {
        const current = t === tier;
        const body = (
          <>
            <Row style={{ justifyContent: 'space-between' }}>
              <TierBadge tier={t} />
              {t === POPULAR && <Text style={styles.popular}>{'★ En popüler'.toLocaleUpperCase('tr-TR')}</Text>}
              {current && <Label style={{ color: colors.success }}>Mevcut paketin</Label>}
            </Row>
            <Heading style={{ fontSize: 30 }}>{TIER_INFO[t].name}</Heading>
            <Body muted style={{ fontSize: 14, marginTop: -6 }}>
              {TIER_INFO[t].tagline}
            </Body>
            <View style={{ gap: spacing.sm }}>
              {TIER_INFO[t].perks.map((p) => (
                <Row key={p} gap={10}>
                  <Icon
                    name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                    size={16}
                    color={t === 'free' ? colors.textMuted : tierColors[t][0]}
                  />
                  <Body style={{ flex: 1, fontSize: 14 }}>{p}</Body>
                </Row>
              ))}
            </View>
            {t !== 'free' && !current && (
              <View style={{ marginTop: spacing.sm }}>
                <Button
                  title={`${TIER_INFO[t].name}'a geç · çok yakında`}
                  disabled
                  variant={t === POPULAR ? 'primary' : 'outline'}
                />
              </View>
            )}
          </>
        );
        return (
          <Reveal key={t} index={2 + i}>
            {t === 'free' ? <Card>{body}</Card> : <GradientCard colors={tierColors[t]}>{body}</GradientCard>}
          </Reveal>
        );
      })}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popular: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, color: colors.accentBright },
}));
