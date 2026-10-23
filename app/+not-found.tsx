import { Link, Stack } from 'expo-router';

import { Body, Screen, Title } from '@/components/ui';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'BULUNAMADI' }} />
      <Screen>
        <Title>Sayfa yok</Title>
        <Link href="/">
          <Body>Ana sayfaya dön →</Body>
        </Link>
      </Screen>
    </>
  );
}
