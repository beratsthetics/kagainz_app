import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/AuthShell';
import { Body, Button, Eyebrow, Hero, Icon, Input, Reveal, Row } from '@/components/ui';
import { colors, fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

// "5321234567" -> "532 123 45 67"
function formatPhone(digits: string) {
  const d = digits.slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(' ');
}

export default function PhoneScreen() {
  const { sendCode } = useAuth();
  const [digits, setDigits] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = digits.length === 10 && digits.startsWith('5');

  async function submit() {
    setLoading(true);
    setError(null);
    const err = await sendCode(digits);
    setLoading(false);
    if (err) return setError(err);
    router.push({ pathname: '/auth/verify', params: { phone: digits } });
  }

  return (
    <AuthShell
      step={0}
      footer={
        <>
          {!isSupabaseConfigured && <Text style={styles.note}>Sunucu bağlantısı henüz ayarlanmadı.</Text>}
          <Button
            title="Kod gönder"
            arrow
            onPress={submit}
            loading={loading}
            disabled={!valid || !isSupabaseConfigured}
          />
        </>
      }>
      <Reveal index={0}>
        <Eyebrow>Adım 1 / 3</Eyebrow>
        <Hero lines={['Numaranı', 'gir']} size={48} />
      </Reveal>
      <Reveal index={1}>
        <Body muted>Giriş ve kayıt aynı: numarana 6 haneli bir kod göndereceğiz. Şifre hatırlamana gerek yok.</Body>
      </Reveal>
      <Reveal index={2}>
        <Input
          value={formatPhone(digits)}
          onChangeText={(t) => setDigits(t.replace(/\D/g, '').replace(/^0/, '').slice(0, 10))}
          placeholder="5XX XXX XX XX"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          autoFocus
          prefix={
            <View style={styles.prefix}>
              <Text style={{ fontSize: 18 }}>🇹🇷</Text>
              <Text style={styles.prefixText}>+90</Text>
            </View>
          }
          style={{ paddingLeft: spacing.sm }}
        />
      </Reveal>
      <Reveal index={3}>
        <View style={{ gap: spacing.sm }}>
          {['Numaran kimseyle paylaşılmaz', "Chat'e yazmak için doğrulama zorunlu, spam yok"].map((t) => (
            <Row key={t} gap={10}>
              <Icon
                name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }}
                size={16}
                color={colors.success}
              />
              <Body muted style={{ fontSize: 13.5 }}>
                {t}
              </Body>
            </Row>
          ))}
        </View>
      </Reveal>
      {error && <Text style={styles.error}>{error}</Text>}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: spacing.sm + 4,
    marginRight: 2,
    borderRightWidth: 1,
    borderRightColor: colors.borderStrong,
  },
  prefixText: { fontFamily: fonts.mono, fontSize: 16, color: colors.text },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.textDim, textAlign: 'center' },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger },
});
