import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Text } from '@/components/T';

import { AuthShell } from '@/components/AuthShell';
import { Body, Button, Hero, Icon, Input, Reveal } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';

const MIN_PASSWORD = 6;

// Şifre sıfırlama linkinden açılan sayfa: linkteki kodla oturum açar, yeni şifreyi kaydeder.
export default function ResetPasswordScreen() {
  const colors = useColors();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = password.length >= MIN_PASSWORD && repeat === password;

  useEffect(() => {
    const expired = 'Link geçersiz ya da süresi dolmuş. Giriş ekranından yeniden şifre sıfırlama iste.';
    if (!code) return setError(expired);
    supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => (err ? setError(expired) : setReady(true)));
  }, [code]);

  async function save() {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) return setError(/different/i.test(err.message) ? 'Yeni şifre eskisinden farklı olmalı.' : err.message);
    router.replace('/');
  }

  if (!ready) {
    return (
      <AuthShell>
        <View style={{ alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl * 2 }}>
          {error ? (
            <>
              <Body style={{ color: colors.danger, textAlign: 'center' }}>{error}</Body>
              <Button title="Giriş ekranına dön" onPress={() => router.replace('/auth/email')} />
            </>
          ) : (
            <ActivityIndicator color={colors.text} />
          )}
        </View>
      </AuthShell>
    );
  }

  const lock = <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={18} color={colors.textMuted} />;
  return (
    <AuthShell footer={<Button title="Şifreyi kaydet" arrow onPress={save} loading={loading} disabled={!valid} />}>
      <Reveal index={0}>
        <Hero lines={['Yeni', 'şifre']} size={48} />
      </Reveal>
      <Reveal index={1}>
        <View style={{ gap: spacing.sm }}>
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Yeni şifre (en az 6 karakter)"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            prefix={lock}
          />
          <Input
            value={repeat}
            onChangeText={setRepeat}
            placeholder="Şifre tekrar"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={save}
            prefix={lock}
          />
          {repeat.length > 0 && repeat !== password && (
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger }}>Şifreler aynı değil.</Text>
          )}
        </View>
      </Reveal>
      {error && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger }}>{error}</Text>}
    </AuthShell>
  );
}
