import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthShell } from '@/components/AuthShell';
import { Body, Button, Eyebrow, Hero, Reveal } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { formatTarget, nextAfterSignIn, useAuth, type CodeMethod } from '@/lib/auth';
import { makeStyles, useColors } from '@/lib/theme';

const LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { method = 'phone', target = '' } = useLocalSearchParams<{ method?: CodeMethod; target?: string }>();
  const { verifyCode, sendCode } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(RESEND_SECONDS);
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function submit(value = code) {
    setLoading(true);
    setError(null);
    const err = await verifyCode(method, target, value);
    if (err) {
      setLoading(false);
      setCode('');
      return setError('Kod hatalı ya da süresi dolmuş. Tekrar dene.');
    }
    const next = await nextAfterSignIn();
    setLoading(false);
    if (next) router.replace(next);
    else router.dismissAll();
  }

  function onChange(t: string) {
    const v = t.replace(/\D/g, '').slice(0, LENGTH);
    setCode(v);
    if (v.length === LENGTH) submit(v);
  }

  return (
    <AuthShell
      step={method === 'link_phone' ? undefined : 1}
      footer={
        <>
          <Button title="Doğrula" arrow onPress={() => submit()} loading={loading} disabled={code.length !== LENGTH} />
          <Button
            title={wait > 0 ? `Tekrar gönder (${wait})` : 'Kodu tekrar gönder'}
            variant="ghost"
            disabled={wait > 0}
            onPress={() => {
              sendCode(method, target);
              setWait(RESEND_SECONDS);
            }}
          />
        </>
      }>
      <Reveal index={0}>
        <Eyebrow>{method === 'link_phone' ? 'Chat için doğrulama' : 'Adım 2 / 3'}</Eyebrow>
        <Hero lines={['Kodu', 'gir']} size={48} />
      </Reveal>
      <Reveal index={1}>
        <Body muted>
          <Text style={{ color: colors.text, fontFamily: fonts.mono }}>{formatTarget(method, target)}</Text>{' '}
          {method === 'email' ? 'adresine' : 'numarasına'}
          gelen 6 haneli kodu yaz.
        </Body>
      </Reveal>
      <Reveal index={2}>
        <View>
          <Pressable onPress={() => input.current?.focus()} style={styles.boxes}>
            {Array.from({ length: LENGTH }, (_, i) => {
              const active = i === code.length;
              return (
                <View
                  key={i}
                  style={[
                    styles.box,
                    code[i] && styles.boxFilled,
                    active && styles.boxActive,
                    error && styles.boxError,
                  ]}>
                  <Text style={styles.digit}>{code[i] ?? ''}</Text>
                </View>
              );
            })}
          </Pressable>
          <TextInput
            ref={input}
            value={code}
            onChangeText={onChange}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            autoFocus
            maxLength={LENGTH}
            style={styles.hidden}
          />
        </View>
      </Reveal>
      {error && <Text style={styles.error}>{error}</Text>}
    </AuthShell>
  );
}

const useStyles = makeStyles((colors) => ({
  boxes: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  box: {
    flex: 1,
    aspectRatio: 0.82,
    maxWidth: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { borderColor: colors.borderStrong, backgroundColor: colors.surfaceHigh },
  boxActive: { borderColor: colors.accent, borderWidth: 2 },
  boxError: { borderColor: colors.danger },
  digit: { fontFamily: fonts.mono, fontSize: 26, color: colors.text },
  hidden: { ...StyleSheet.absoluteFill, opacity: 0.01, color: 'transparent' },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger },
}));
