import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { AuthShell } from '@/components/AuthShell';
import { GoogleLogo, useGoogleSignIn } from '@/components/GoogleSignIn';
import { LogoMark } from '@/components/Logo';
import { Body, Hero, Icon, IconBox, PressScale, Reveal, Row, type IconName } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import { makeStyles, useColors } from '@/lib/theme';
import { locale, tx } from '@/lib/i18n';

const FEATURES: { icon: IconName; text: string; color: 'carb' | 'accentBright' | 'fat' }[] = [
  { icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }, text: 'Otomatik makro', color: 'carb' },
  {
    icon: { ios: 'bubble.left.and.bubble.right.fill', android: 'forum', web: 'forum' },
    text: 'Topluluk',
    color: 'accentBright',
  },
  {
    icon: { ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' },
    text: 'Kişiye özel program',
    color: 'fat',
  },
];

function ProviderButton({
  label,
  icon,
  primary,
  onPress,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  primary?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      style={[styles.provider, primary && styles.providerPrimary, disabled && { opacity: 0.45 }]}>
      <View style={styles.providerIcon}>{icon}</View>
      <Text style={[styles.providerText, { flex: 1 }, primary && { color: colors.primaryText }]}>{label}</Text>
      <Text style={[styles.providerText, { color: primary ? colors.primaryText : colors.textMuted }]}>→</Text>
    </PressScale>
  );
}

// Karşılama: Google, e-posta veya telefonla giriş/kayıt. Hepsi şifresiz.
export default function WelcomeScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const [error, setError] = useState<string | null>(null);
  const { google, busy } = useGoogleSignIn(setError);

  return (
    <AuthShell>
      <Reveal index={0}>
        <Row gap={10}>
          <LogoMark height={34} color={colors.text} />
          <View>
            <Text style={styles.logo}>KAGAINZ</Text>
            <Text style={styles.logoSub}>COACHING</Text>
          </View>
        </Row>
      </Reveal>

      <Reveal index={1}>
        <Hero lines={['ONLINE', 'FITNESS']} size={60} />
        <Text style={styles.subHero}>{tx('Topluluğuna katıl').toLocaleUpperCase(locale())}</Text>
      </Reveal>

      <Reveal index={2}>
        {reason === 'macros' ? (
          <View style={styles.reason}>
            <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={16} color={colors.accentBright} />
            <Body style={{ flex: 1, fontSize: 14 }}>Makro hesaplamayı kullanmak için ücretsiz hesap oluştur.</Body>
          </View>
        ) : (
          <Body muted>Ücretsiz hesap oluştur: makrolarını hesapla, programını takip et, toplulukla paylaş.</Body>
        )}
      </Reveal>

      <Reveal index={3}>
        <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.feature}>
              <IconBox name={f.icon} color={colors[f.color]} bg={`${colors[f.color]}1F`} size={26} />
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </Row>
      </Reveal>

      <Reveal index={4} style={{ gap: spacing.sm + 2 }}>
        <ProviderButton
          primary
          label="Google ile devam et"
          icon={<GoogleLogo />}
          onPress={google}
          disabled={busy || !isSupabaseConfigured}
        />
        <ProviderButton
          label="E-posta ve şifre ile devam et"
          icon={<Icon name={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }} size={20} />}
          onPress={() => router.push('/auth/email')}
          disabled={!isSupabaseConfigured}
        />
        <ProviderButton
          label="Telefon ile devam et"
          icon={<Icon name={{ ios: 'phone.fill', android: 'call', web: 'call' }} size={20} />}
          onPress={() => router.push('/auth/phone')}
          disabled={!isSupabaseConfigured}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.legal}>
          {isSupabaseConfigured
            ? 'Hesabın varsa giriş yap, yoksa birkaç saniyede oluştur.'
            : 'Sunucu bağlantısı henüz ayarlanmadı.'}
        </Text>
      </Reveal>
    </AuthShell>
  );
}

const useStyles = makeStyles((colors) => ({
  logo: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 1.5, color: colors.text, lineHeight: 24 },
  logoSub: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 3.5, color: colors.textMuted },
  subHero: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginTop: spacing.sm, marginLeft: 18 },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  featureText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.text },
  provider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  providerPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  providerIcon: { width: 28, alignItems: 'center' },
  providerText: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.text },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger },
  legal: { fontFamily: fonts.body, fontSize: 12, color: colors.textDim, textAlign: 'center', marginTop: 4 },
}));
