import { Link, Stack } from 'expo-router';

import { Body, Screen, Title } from '@/components/ui';
import { translate } from '@/lib/i18n';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: translate('BULUNAMADI') }} />
      <Screen>
        <Title>Sayfa yok</Title>
        <Link href="/">
          <Body>Ana sayfaya dön →</Body>
        </Link>
      </Screen>
    </>
  );
}
