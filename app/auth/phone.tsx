import { router } from 'expo-router';
import { useState } from 'react';

import { Body, Button, Input, Label, Screen, Title } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function PhoneScreen() {
  const { sendCode } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const err = await sendCode(phone);
    setLoading(false);
    if (err) return setError(err);
    router.push({ pathname: '/auth/verify', params: { phone } });
  }

  return (
    <Screen>
      <Title>Numaranı{'\n'}Doğrula</Title>
      <Body muted>Telefonuna 6 haneli bir kod göndereceğiz. Şifre yok, sadece kod.</Body>
      <Input
        value={phone}
        onChangeText={setPhone}
        placeholder="0532 123 45 67"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <Button title="Kod gönder" onPress={submit} loading={loading} disabled={phone.replace(/\D/g, '').length < 10 || !isSupabaseConfigured} />
      {!isSupabaseConfigured && <Label>Sunucu bağlantısı henüz ayarlanmadı.</Label>}
      {error && <Label style={{ color: colors.danger }}>{error}</Label>}
    </Screen>
  );
}
