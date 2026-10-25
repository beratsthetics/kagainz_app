import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { AuthShell } from '@/components/AuthShell';
import { GoogleLogo, useGoogleSignIn } from '@/components/GoogleSignIn';
import { Body, Button, Card, Eyebrow, Hero, Icon, Input, Label, PressScale, Reveal, Row } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { leaveAuth, sendPasswordReset, useAuth } from '@/lib/auth';
import { rememberRef } from '@/lib/refcode';
import { makeStyles, useColors } from '@/lib/theme';
import { locale, tx } from '@/lib/i18n';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 6;

// Giriş/kayıt ekranı: e-posta + şifre formu, altında Google ve telefon seçenekleri.
export default function EmailScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { passwordAuth, signOut } = useAuth();
  const params = useLocalSearchParams<{ mode?: string; reason?: string; ref?: string }>();
  const [mode, setMode] = useState<'signup' | 'signin'>(params.mode === 'signin' ? 'signin' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Influencer linkinden gelince kod dolu gelir; kayıtta elle de girilebilir.
  const [ref, setRef] = useState(params.ref ?? '');
  const [showRef, setShowRef] = useState(Boolean(params.ref));
  const { google, busy: googleBusy } = useGoogleSignIn(setError);
  const signup = mode === 'signup';
  const mismatch = signup && repeat.length > 0 && repeat !== password;
  const valid = EMAIL.test(email.trim()) && password.length >= MIN_PASSWORD && (!signup || repeat === password);

  async function submit() {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    keepRef();
    const { error: err, needsConfirm } = await passwordAuth(mode, email, password);
    if (err) {
      setLoading(false);
      return setError(err);
    }
    if (signup) {
      // Kayıttan sonra form giriş moduna geçer; kişi şifresiyle giriş yapar.
      if (!needsConfirm) await signOut();
      setLoading(false);
      setMode('signin');
      setRepeat('');
      return setInfo(
        needsConfirm
          ? tx('Hesabın oluşturuldu. {0} adresine gelen onay linkine tıkla, sonra giriş yap.', [email.trim()])
          : 'Hesabın oluşturuldu. Şimdi giriş yap.',
      );
    }
    setLoading(false);
    leaveAuth();
  }

  function keepRef() {
    if (signup && ref.trim()) rememberRef(ref);
  }

  async function forgot() {
    setError(null);
    setInfo(null);
    if (!EMAIL.test(email.trim())) return setError('Önce e-posta adresini yaz.');
    const err = await sendPasswordReset(email);
    if (err) return setError(err);
    setInfo('Şifre sıfırlama linkini e-postana gönderdik. Gelmezse spam klasörüne bak.');
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

  function switchMode() {
    setMode(signup ? 'signin' : 'signup');
    setError(null);
    setInfo(null);
  }

  return (
    <AuthShell step={0}>
      <Reveal index={0}>
        <Eyebrow>{signup ? 'Ücretsiz hesap' : 'Tekrar hoş geldin'}</Eyebrow>
        <Hero lines={signup ? ['Hesabını', 'oluştur'] : ['Giriş', 'yap']} size={48} />
        <Body muted style={{ marginTop: spacing.sm }}>
          {signup ? 'E-posta ve şifrenle saniyeler içinde kayıt ol.' : 'E-posta ve şifrenle hesabına gir.'}
        </Body>
        {params.reason === 'macros' && (
          <Row gap={spacing.sm} style={styles.reason}>
            <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={16} color={colors.accentBright} />
            <Body style={{ flex: 1, fontSize: 14 }}>Makro hesaplamayı kullanmak için ücretsiz hesap oluştur.</Body>
          </Row>
        )}
      </Reveal>

      <Reveal index={1}>
        <Card glow style={styles.sheet}>
          <View style={styles.field}>
            <Label>E-posta</Label>
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
          </View>
          <View style={styles.field}>
            <Label>Şifre</Label>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder={signup ? tx('En az {0} karakter', [MIN_PASSWORD]) : '••••••'}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={signup ? 'new-password' : 'current-password'}
              textContentType={signup ? 'newPassword' : 'password'}
              onSubmitEditing={() => !signup && submit()}
              prefix={lock}
              suffix={eye}
            />
          </View>
          {signup && (
            <View style={styles.field}>
              <Label>Şifre tekrar</Label>
              <Input
                value={repeat}
                onChangeText={setRepeat}
                placeholder="••••••"
                secureTextEntry={!show}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                onSubmitEditing={submit}
                prefix={lock}
              />
            </View>
          )}
          {mismatch && <Text style={styles.error}>Şifreler aynı değil.</Text>}
          {signup &&
            (showRef ? (
              <View style={styles.field}>
                <Label>Davet kodu (isteğe bağlı)</Label>
                <Input value={ref} onChangeText={setRef} placeholder="ör. ahmet" autoCapitalize="none" autoCorrect={false} />
              </View>
            ) : (
              <PressScale onPress={() => setShowRef(true)} style={{ alignSelf: 'flex-start' }}>
                <Text style={styles.link}>Davet kodun var mı?</Text>
              </PressScale>
            ))}
          {!signup && (
            <PressScale onPress={forgot} style={{ alignSelf: 'flex-end' }}>
              <Text style={styles.link}>Şifremi unuttum</Text>
            </PressScale>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
          {info && <Text style={[styles.error, { color: colors.success }]}>{info}</Text>}

          <Button title={signup ? 'Kayıt ol' : 'Giriş yap'} arrow onPress={submit} loading={loading} disabled={!valid} />

          <Row gap={spacing.sm} style={{ marginVertical: spacing.xs }}>
            <View style={styles.rule} />
            <Text style={styles.or}>{tx('veya').toLocaleUpperCase(locale())}</Text>
            <View style={styles.rule} />
          </Row>

          <PressScale onPress={() => { keepRef(); google(); }} disabled={googleBusy} style={[styles.social, googleBusy && { opacity: 0.5 }]}>
            <GoogleLogo size={18} />
            <Text style={styles.socialText}>Google ile devam et</Text>
          </PressScale>
          <PressScale onPress={() => { keepRef(); router.push('/auth/phone'); }} style={styles.social}>
            <Icon name={{ ios: 'phone.fill', android: 'call', web: 'call' }} size={18} />
            <Text style={styles.socialText}>Telefon ile devam et</Text>
          </PressScale>

          <Row style={{ justifyContent: 'center', marginTop: spacing.xs }}>
            <Text style={styles.switchText}>{signup ? 'Hesabın var mı?' : 'Hesabın yok mu?'} </Text>
            <PressScale onPress={switchMode}>
              <Text style={styles.link}>{signup ? 'Giriş yap' : 'Kayıt ol'}</Text>
            </PressScale>
          </Row>
        </Card>
      </Reveal>

      <Reveal index={2}>
        <Row gap={10} style={{ justifyContent: 'center' }}>
          <Icon name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }} size={14} color={colors.success} />
          <Text style={styles.switchText}>E-postan sadece giriş için kullanılır, kimseyle paylaşılmaz.</Text>
        </Row>
      </Reveal>
    </AuthShell>
  );
}

const useStyles = makeStyles((colors) => ({
  sheet: { borderRadius: 28, padding: spacing.lg, gap: spacing.md },
  reason: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  field: { gap: 6 },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger },
  link: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.accentBright },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.6, color: colors.textDim },
  social: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm + 2,
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
  },
  socialText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  switchText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
}));
