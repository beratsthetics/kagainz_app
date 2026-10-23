import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Body, Card, Heading, Label, Screen, Title } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { hasFeature, TIER_INFO, type Feature, type Tier } from '@/lib/tiers';

const ROOMS: { id: string; name: string; description: string; feature: Feature; minTier: Tier }[] = [
  { id: 'genel', name: 'Genel', description: 'Öğünlerini, antrenmanlarını ve gününü paylaş', feature: 'general_chat', minTier: 'free' },
  { id: 'pro', name: 'Pro Kulüp', description: 'Sadece Pro ve üstü üyeler', feature: 'pro_chat', minTier: 'pro' },
  { id: 'plus', name: 'Plus Kulüp', description: 'Sadece Plus ve üstü üyeler', feature: 'plus_chat', minTier: 'plus' },
];

export default function ChatRoomsScreen() {
  const { tier } = useAuth();

  return (
    <Screen>
      <Title>Topluluk</Title>
      <Body muted>Gününü, öğünlerini ve antrenmanlarını paylaş. Herkes okuyabilir, yazmak için numaranı doğrula.</Body>
      {ROOMS.map((room) => {
        const open = hasFeature(tier, room.feature);
        return (
          <Pressable
            key={room.id}
            onPress={() => (open ? router.push(`/chat/${room.id}`) : router.push('/plans'))}>
            <Card style={{ opacity: open ? 1 : 0.6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Heading>{room.name}</Heading>
                <Label style={{ color: open ? colors.success : colors.textMuted }}>
                  {open ? 'Açık' : `${TIER_INFO[room.minTier].name} gerekli`}
                </Label>
              </View>
              <Body muted style={{ marginTop: spacing.xs }}>
                {room.description}
              </Body>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
