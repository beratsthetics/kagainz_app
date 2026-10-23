import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/AuthShell';
import { Body, Button, Hero, IconBox, Reveal, Row, type IconName } from '@/components/ui';
import { colors, fonts, spacing } from '@/constants/theme';

const FEATURES: { icon: IconName; title: string; text: string; color: string }[] = [
  {
    icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
    title: 'Otomatik makro',
    text: '"2 yumurta" yaz, protein, karb ve yağ anında hesaplansın.',
    color: colors.carb,
  },
  {
    icon: { ios: 'bubble.left.and.bubble.right.fill', android: 'forum', web: 'forum' },
    title: 'Topluluk',
    text: 'Öğününü ve antrenmanını paylaş, motivasyonunu koru.',
    color: colors.accentBright,
  },
  {
    icon: { ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' },
    title: 'Kişiye özel program',
    text: 'Antrenman, yemek planı ve form check tek yerde.',
    color: colors.fat,
  },
];

// Karşılama: giriş ve kayıt aynı akış, telefon numarasıyla başlar.
export default function WelcomeScreen() {
  return (
    <AuthShell
      footer={
        <>
          <Button title="Hemen başla" arrow onPress={() => router.push('/auth/phone')} />
          <Button title="Zaten hesabım var" variant="outline" onPress={() => router.push('/auth/phone')} />
          <Text style={styles.legal}>Şifre yok. Numarana gelen kodla saniyeler içinde giriş yap.</Text>
        </>
      }>
      <Reveal index={0}>
        <Row gap={10}>
          <Text style={styles.logoMark}>✦</Text>
          <View>
            <Text style={styles.logo}>KAGAINZ</Text>
            <Text style={styles.logoSub}>COACHING</Text>
          </View>
        </Row>
      </Reveal>

      <Reveal index={1}>
        <Hero lines={['ONLINE', 'FITNESS']} size={64} />
        <Text style={styles.subHero}>{'Topluluğuna katıl'.toLocaleUpperCase('tr-TR')}</Text>
      </Reveal>

      <Reveal index={2}>
        <Body muted>
          Antrenman ve beslenmen tek uygulamada. Makrolarını takip et, programını uygula, gelişimini toplulukla paylaş.
        </Body>
      </Reveal>

      <View style={{ gap: spacing.sm + 2 }}>
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} index={3 + i}>
            <View style={styles.feature}>
              <IconBox name={f.icon} color={f.color} bg={`${f.color}1F`} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title.toLocaleUpperCase('tr-TR')}</Text>
                <Body muted style={{ fontSize: 13.5, lineHeight: 19 }}>
                  {f.text}
                </Body>
              </View>
            </View>
          </Reveal>
        ))}
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  logoMark: { fontSize: 26, color: colors.text },
  logo: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 1.5, color: colors.text, lineHeight: 24 },
  logoSub: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 3.5, color: colors.textMuted },
  subHero: { fontFamily: fonts.display, fontSize: 26, color: colors.text, marginTop: spacing.sm, marginLeft: 18 },
  feature: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(16,17,20,0.85)',
  },
  featureTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.text, letterSpacing: 0.5, marginBottom: 2 },
  legal: { fontFamily: fonts.body, fontSize: 12, color: colors.textDim, textAlign: 'center', marginTop: 4 },
});
