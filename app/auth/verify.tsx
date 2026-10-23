import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Body, Button, Input, Label, Screen, Title } from '@/components/ui';
import { colors } from '@/constants/theme';
import { normalizeTrPhone, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyCode, sendCode } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const err = await verifyCode(phone, code);
    if (err) {
      setLoading(false);
      return setError(err);
    }
    const { data: user } = await supabase.auth.getUser();
    const { data } = await supabase.from('profiles').select('username').eq('id', user.user?.id ?? '').maybeSingle();
    setLoading(false);
    router.dismissAll();
    if (!data?.username) router.push('/auth/username');
  }

  return (
    <Screen>
      <Title>Kodu Gir</Title>
      <Body muted>{normalizeTrPhone(phone ?? '')} numarasına gönderilen 6 haneli kodu yaz.</Body>
      <Input
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
        placeholder="••••••"
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
      />
      <Button title="Doğrula" onPress={submit} loading={loading} disabled={code.length !== 6} />
      <Button title="Kodu tekrar gönder" variant="outline" onPress={() => sendCode(phone)} />
      {error && <Label style={{ color: colors.danger }}>{error}</Label>}
    </Screen>
  );
}
