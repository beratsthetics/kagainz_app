import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AuthShell } from '@/components/AuthShell';
import { Body, Button, Eyebrow, Hero, Icon, Input, Reveal, Row } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { makeStyles, useColors } from '@/lib/theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function EmailScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { sendCode } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = EMAIL.test(email.trim());

  async function submit() {
    setLoading(true);
    setError(null);
    const err = await sendCode('email', email);
    setLoading(false);
    if (err) return setError(err);
    router.push({ pathname: '/auth/verify', params: { method: 'email', target: email.trim() } });
  }

  return (
    <AuthShell
      step={0}
      footer={<Button title="Kod gönder" arrow onPress={submit} loading={loading} disabled={!valid} />}>
      <Reveal index={0}>
        <Eyebrow>Adım 1 / 3</Eyebrow>
        <Hero lines={['E-postanı', 'gir']} size={48} />
      </Reveal>
      <Reveal index={1}>
        <Body muted>E-postana 6 haneli bir kod göndereceğiz. Şifre oluşturmana gerek yok.</Body>
      </Reveal>
      <Reveal index={2}>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="ornek@mail.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          autoFocus
          onSubmitEditing={() => valid && submit()}
          prefix={
            <Icon name={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }} size={18} color={colors.textMuted} />
          }
        />
      </Reveal>
      <Reveal index={3}>
        <Row gap={10}>
          <Icon
            name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }}
            size={16}
            color={colors.success}
          />
          <Body muted style={{ fontSize: 13.5, flex: 1 }}>
            E-postan sadece giriş için kullanılır, kimseyle paylaşılmaz.
          </Body>
        </Row>
      </Reveal>
      {error && <Text style={styles.error}>{error}</Text>}
    </AuthShell>
  );
}

const useStyles = makeStyles((colors) => ({
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger, marginTop: spacing.xs },
}));
