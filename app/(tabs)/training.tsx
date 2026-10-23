import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Body, Button, Card, Heading, Label, Mono, Screen, Tag, Title } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { hasFeature } from '@/lib/tiers';

// Örnek program. Kas animasyonları ve gerçek programlar sonraki adımda eklenecek.
const PROGRAM = [
  {
    day: 'Pazartesi',
    muscle: 'Göğüs',
    exercises: [
      { name: 'Smith machine incline press', sets: '2×8' },
      { name: 'Chest press', sets: '2×8' },
      { name: 'Machine chest fly', sets: '2×8' },
    ],
  },
  {
    day: 'Çarşamba',
    muscle: 'Sırt',
    exercises: [
      { name: 'Lat pulldown', sets: '3×10' },
      { name: 'Seated cable row', sets: '3×10' },
      { name: 'Straight arm pulldown', sets: '2×12' },
    ],
  },
  {
    day: 'Cuma',
    muscle: 'Bacak',
    exercises: [
      { name: 'Hack squat', sets: '3×8' },
      { name: 'Leg extension', sets: '2×12' },
      { name: 'Lying leg curl', sets: '2×12' },
    ],
  },
];

export default function TrainingScreen() {
  const { tier } = useAuth();
  const [done, setDone] = useState<Record<string, boolean>>({});

  if (!hasFeature(tier, 'training_programs')) {
    return (
      <Screen>
        <Title>Antrenman</Title>
        <Card>
          <Heading>Pro ile açılır</Heading>
          <Body muted>Antrenman programları, yemek programı oluşturma ve Pro chat Pro üyeliğe dahil.</Body>
          <Button title="Paketleri gör" onPress={() => router.push('/plans')} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Antrenman</Title>
      {PROGRAM.map((d) => (
        <Card key={d.day}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>{d.day}</Label>
            <Tag>{d.muscle}</Tag>
          </View>
          <Heading>{d.muscle} günü</Heading>
          {d.exercises.map((e) => {
            const key = `${d.day}-${e.name}`;
            const checked = done[key];
            return (
              <Pressable
                key={key}
                onPress={() => setDone((s) => ({ ...s, [key]: !s[key] }))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius.md,
                  padding: spacing.sm + 4,
                }}>
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: checked ? colors.success : colors.textMuted,
                    backgroundColor: checked ? colors.success : 'transparent',
                  }}
                />
                <Body
                  style={{
                    flex: 1,
                    color: checked ? colors.textMuted : colors.text,
                    textDecorationLine: checked ? 'line-through' : 'none',
                  }}>
                  {e.name}
                </Body>
                <Mono style={{ color: colors.textMuted }}>{e.sets}</Mono>
              </Pressable>
            );
          })}
        </Card>
      ))}
    </Screen>
  );
}
