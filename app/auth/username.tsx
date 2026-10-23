import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/AuthShell';
import { Avatar, Body, Button, Eyebrow, Hero, Icon, Input, Label, Reveal, Row } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { makeStyles, useColors } from '@/lib/theme';

const RULES = [
  { text: '3-20 karakter', test: (s: string) => s.length >= 3 && s.length <= 20 },
  { text: 'Küçük harf, rakam, nokta veya alt çizgi', test: (s: string) => s.length > 0 && /^[a-z0-9_.]+$/.test(s) },
];

export default function UsernameScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { setUsername } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = RULES.every((r) => r.test(name));

  async function submit() {
    setLoading(true);
    setError(null);
    const err = await setUsername(name);
    setLoading(false);
    if (err) return setError(err);
    // Yeni hesap: kısa karşılama akışıyla hedefleri belirle.
    router.replace('/onboarding');
  }

  return (
    <AuthShell step={2} footer={<Button title="Hazırım" arrow onPress={submit} loading={loading} disabled={!valid} />}>
      <Reveal index={0}>
        <Eyebrow>Adım 3 / 3</Eyebrow>
        <Hero lines={['Kullanıcı', 'adın']} size={48} />
      </Reveal>
      <Reveal index={1}>
        <Body muted>Toplulukta bu isimle görüneceksin. Sonra değiştirebilirsin.</Body>
      </Reveal>
      <Reveal index={2}>
        <Input
          value={name}
          onChangeText={(t) => setName(t.toLocaleLowerCase('tr-TR').replace(/\s/g, ''))}
          placeholder="kagainzz"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          prefix={<Text style={styles.at}>@</Text>}
        />
      </Reveal>
      <Reveal index={3} style={{ gap: spacing.sm }}>
        {RULES.map((r) => {
          const ok = r.test(name);
          return (
            <Row key={r.text} gap={10}>
              <Icon
                name={
                  ok
                    ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
                    : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }
                }
                size={16}
                color={ok ? colors.success : colors.textDim}
              />
              <Body muted style={{ fontSize: 13.5, color: ok ? colors.text : colors.textMuted }}>
                {r.text}
              </Body>
            </Row>
          );
        })}
      </Reveal>
      <Reveal index={4}>
        <Label style={{ marginBottom: spacing.sm }}>Önizleme</Label>
        <View style={styles.preview}>
          <Avatar name={name || '?'} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={styles.previewName}>@{name || 'kullaniciadi'}</Text>
            <Body style={{ fontSize: 14 }}>Bugün göğüs günü, hadi bakalım 💪</Body>
          </View>
        </View>
      </Reveal>
      {error && <Text style={styles.error}>{error}</Text>}
    </AuthShell>
  );
}

const useStyles = makeStyles((colors) => ({
  at: { fontFamily: fonts.mono, fontSize: 18, color: colors.textMuted },
  preview: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  previewName: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger },
}));
