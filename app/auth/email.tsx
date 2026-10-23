import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AuthShell } from '@/components/AuthShell';
import { Body, Button, Eyebrow, Hero, Icon, Input, PressScale, Reveal, Row, Segmented } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { nextAfterSignIn, useAuth } from '@/lib/auth';
import { makeStyles, useColors } from '@/lib/theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 6;

// E-posta + şifre ile kayıt ve giriş.
export default function EmailScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { passwordAuth } = useAuth();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const signup = mode === 'signup';
  const mismatch = signup && repeat.length > 0 && repeat !== password;
  const valid = EMAIL.test(email.trim()) && password.length >= MIN_PASSWORD && (!signup || repeat === password);

  async function submit() {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    const { error: err, needsConfirm } = await passwordAuth(mode, email, password);
    if (err) {
      setLoading(false);
      return setError(err);
    }
    if (needsConfirm) {
      setLoading(false);
      return setSent(true);
    }
    const next = await nextAfterSignIn();
    setLoading(false);
    if (next) router.replace(next);
    else router.dismissAll();
  }

  const eye = (
    <PressScale onPress={() => setShow((s) => !s)}>
      <Icon
        name={show ? { ios: 'eye.slash.fill', android: 'visibility_off', web: 'visibility_off' } : { ios: 'eye.fill', android: 'visibility', web: 'visibility' }}
        size={18}
        color={colors.textMuted}
      />
    </PressScale>
  );
  const lock = <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={18} color={colors.textMuted} />;

  if (sent) {
    return (
      <AuthShell step={0} footer={<Button title="Onayladım, giriş yap" arrow onPress={() => (setSent(false), setMode('signin'))} />}>
        <Reveal index={0}>
          <Hero lines={['Mailini', 'onayla']} size={48} />
        </Reveal>
        <Reveal index={1}>
          <Body muted>
            {email.trim()} adresine bir onay linki gönderdik. Linke tıkla, sonra buraya dönüp şifrenle giriş yap. Gelmezse spam klasörüne bak.
          </Body>
        </Reveal>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      step={0}
      footer={<Button title={signup ? 'Hesap oluştur' : 'Giriş yap'} arrow onPress={submit} loading={loading} disabled={!valid} />}>
      <Reveal index={0}>
        <Eyebrow>{signup ? 'E-posta ve şifre' : 'Tekrar hoş geldin'}</Eyebrow>
        <Hero lines={signup ? ['Hesabını', 'oluştur'] : ['Giriş', 'yap']} size={48} />
      </Reveal>
      <Reveal index={1}>
        <Segmented
          options={[
            { value: 'signup', label: 'Kayıt ol' },
            { value: 'signin', label: 'Giriş yap' },
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
          }}
        />
      </Reveal>
      <Reveal index={2}>
        <View style={{ gap: spacing.sm }}>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@mail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            prefix={<Icon name={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }} size={18} color={colors.textMuted} />}
          />
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder={signup ? `Şifre (en az ${MIN_PASSWORD} karakter)` : 'Şifre'}
                secureTextEntry={!show}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={signup ? 'new-password' : 'current-password'}
                textContentType={signup ? 'newPassword' : 'password'}
                onSubmitEditing={() => !signup && submit()}
                prefix={lock}
              />
            </View>
            {eye}
          </Row>
          {signup && (
            <Input
              value={repeat}
              onChangeText={setRepeat}
              placeholder="Şifre tekrar"
              secureTextEntry={!show}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              onSubmitEditing={submit}
              prefix={lock}
            />
          )}
          {mismatch && <Text style={styles.error}>Şifreler aynı değil.</Text>}
        </View>
      </Reveal>
      <Reveal index={3}>
        <Row gap={10}>
          <Icon name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }} size={16} color={colors.success} />
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
