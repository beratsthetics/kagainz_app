import { router } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/T';

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
  Segmented,
  TierBadge,
} from '@/components/ui';
import { fonts, spacing, tierColors } from '@/constants/theme';
import { useState } from 'react';

import { useAuth } from '@/lib/auth';
import { hasFeature, PRICES, TIER_INFO, YEARLY_MONTHS, type Feature, type Tier } from '@/lib/tiers';
import { makeStyles, useColors } from '@/lib/theme';
import { locale, tx } from '@/lib/i18n';

const PLANS: Tier[] = ['free', 'pro', 'plus', 'max'];
const POPULAR: Tier = 'plus';

// Paket karşılaştırma tablosu: satır başına bir özellik, sütun başına bir paket.
const COMPARE: [string, Feature][] = [
  ['Makro hesaplama', 'macros'],
  ['Antrenman programı', 'training_programs'],
  ['Yemek planı', 'meal_plans'],
  ['Haftalık güncellenen kalori hedefi', 'adaptive_kcal'],
  ['Tüm hareket kütüphanesi', 'full_library'],
  ['Plus chat', 'plus_chat'],
  ['Ayda bir form check', 'form_check'],
  ['Koçla birebir mesaj', 'coach_dm'],
  ['Önce / sonra karşılaştırması', 'before_after'],
  ['Koçun günlük görevleri', 'habits'],
];

const money = (n: number) => n.toLocaleString(locale(), { maximumFractionDigits: 0 });

export default function PlansScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { tier } = useAuth();
  const [period, setPeriod] = useState<'month' | 'year'>('month');

  return (
    <Screen
      glow
      edges={['top', 'bottom']}
      header={
        <Row style={{ justifyContent: 'flex-end' }}>
          <PressScale onPress={() => router.back()} style={styles.close}>
            <Icon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} />
          </PressScale>
        </Row>
      }>
      <Reveal index={0}>
        <Hero lines={['Seviyeni', 'seç']} size={52} />
      </Reveal>
      <Reveal index={1}>
        <Body muted>İstediğin zaman iptal et. Ödeme sistemi çok yakında aktif olacak.</Body>
      </Reveal>
      <Reveal index={1}>
        <Segmented
          options={[
            { value: 'month', label: 'Aylık' },
            { value: 'year', label: tx('Yıllık · 2 ay bedava') },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </Reveal>

      {PLANS.map((t, i) => {
        const current = t === tier;
        const body = (
          <>
            <Row style={{ justifyContent: 'space-between' }}>
              <TierBadge tier={t} />
              {t === POPULAR && <Text style={styles.popular}>{tx('★ En popüler')}</Text>}
              {current && <Label style={{ color: colors.success }}>Mevcut paketin</Label>}
            </Row>
            <Heading style={{ fontSize: 30 }}>{TIER_INFO[t].name}</Heading>
            <Body muted style={{ fontSize: 14, marginTop: -6 }}>
              {TIER_INFO[t].tagline}
            </Body>
            {t !== 'free' && <Price monthly={PRICES[t]} period={period} />}
            <View style={{ gap: spacing.sm }}>
              {TIER_INFO[t].perks.map((p) => (
                <Row key={p} gap={8}>
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
                  title={tx('{0}\'a geç · çok yakında', [TIER_INFO[t].name])}
                  disabled
                  variant={t === POPULAR ? 'primary' : 'outline'}
                />
              </View>
            )}
          </>
        );
        return (
          <Reveal key={t} index={2 + i}>
            {t === 'free' ? <Card>{body}</Card> : <GradientCard vivid colors={tierColors[t]}>{body}</GradientCard>}
          </Reveal>
        );
      })}

      <Reveal index={6}>
        <Card>
          <Label>Paketleri karşılaştır</Label>
          <Row>
            <View style={{ flex: 1 }} />
            {PLANS.map((t) => (
              <Text key={t} numberOfLines={1} adjustsFontSizeToFit style={[styles.col, { fontFamily: fonts.bodyBold, color: colors.textMuted }]}>
                {TIER_INFO[t].name}
              </Text>
            ))}
          </Row>
          {COMPARE.map(([label, f]) => (
            <Row key={f} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Body style={{ flex: 1, fontSize: 13 }}>{label}</Body>
              {PLANS.map((t) => (
                <View key={t} style={styles.col}>
                  {hasFeature(t, f) ? (
                    <Icon name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={16} color={t === 'free' ? colors.text : tierColors[t][0]} />
                  ) : (
                    <Text raw style={{ color: colors.textDim }}>–</Text>
                  )}
                </View>
              ))}
            </Row>
          ))}
        </Card>
      </Reveal>
    </Screen>
  );
}

// Fiyat satırı: yıllıkta aylık karşılığı ve yıllık toplam gösterilir.
function Price({ monthly, period }: { monthly: number | null; period: 'month' | 'year' }) {
  const colors = useColors();
  if (monthly == null) return <Body muted style={{ fontSize: 14 }}>Fiyat çok yakında</Body>;
  const yearly = monthly * YEARLY_MONTHS;
  return (
    <View>
      <Row gap={6} style={{ alignItems: 'baseline' }}>
        <Text raw style={{ fontFamily: fonts.mono, fontSize: 26, color: colors.text }}>
          {`${money(period === 'year' ? yearly / 12 : monthly)} TL`}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>/ ay</Text>
      </Row>
      {period === 'year' && (
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>
          {tx('Yılda {0} TL, {1} TL yerine', [money(yearly), money(monthly * 12)])}
        </Text>
      )}
    </View>
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
  popular: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.accentBright },
  col: { width: 40, alignItems: 'center', textAlign: 'center', fontSize: 10.5 },
}));
