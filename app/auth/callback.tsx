import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AuthShell } from '@/components/AuthShell';
import { Body, Button } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { nextAfterSignIn } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';

// Web'de Google girişinden dönülen sayfa: URL'deki kodu oturuma çevirir.
export default function AuthCallbackScreen() {
  const colors = useColors();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return setError('Giriş bilgisi bulunamadı.');
    supabase.auth.exchangeCodeForSession(code).then(async ({ error: err }) => {
      if (err) return setError(err.message);
      const next = await nextAfterSignIn();
      router.replace(next ?? '/');
    });
  }, [code]);

  return (
    <AuthShell>
      <View style={{ alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl * 2 }}>
        {error ? (
          <>
            <Body style={{ color: colors.danger, textAlign: 'center' }}>{error}</Body>
            <Button title="Tekrar dene" onPress={() => router.replace('/auth')} />
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.text} />
            <Body muted>Giriş yapılıyor...</Body>
          </>
        )}
      </View>
    </AuthShell>
  );
}
