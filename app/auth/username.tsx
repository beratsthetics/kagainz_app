import { router } from 'expo-router';
import { useState } from 'react';

import { Body, Button, Input, Label, Screen, Title } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

const VALID = /^[a-z0-9_.]{3,20}$/;

export default function UsernameScreen() {
  const { setUsername } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const err = await setUsername(name);
    setLoading(false);
    if (err) return setError(err);
    router.back();
  }

  return (
    <Screen>
      <Title>Kullanıcı{'\n'}Adın</Title>
      <Body muted>Chat'te bu isimle görüneceksin. 3-20 karakter; küçük harf, rakam, nokta ve alt çizgi.</Body>
      <Input
        value={name}
        onChangeText={(t) => setName(t.toLowerCase().replace(/\s/g, ''))}
        placeholder="ör. kagainzz"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button title="Kaydet" onPress={submit} loading={loading} disabled={!VALID.test(name)} />
      {error && <Label style={{ color: colors.danger }}>{error}</Label>}
    </Screen>
  );
}
