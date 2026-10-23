import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Body, Button, Card, Chip, GradientCard, Hero, Label, Mono, Reveal, Row, Screen, Stat } from '@/components/ui';
import { fonts, spacing, tierColors } from '@/constants/theme';
import { useAuth, useJoinStep } from '@/lib/auth';
import { useProgress } from '@/lib/progress';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { hasFeature } from '@/lib/tiers';
import { useWorkouts, workoutMeta } from '@/lib/workouts';

export default function SummaryScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { history } = useWorkouts();
  const { session, tier, canPost } = useAuth();
  const join = useJoinStep();
  const { bump } = useProgress();
  const [room, setRoom] = useState('genel');
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = history.find((x) => x.id === id);

  if (!s) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Button title="Kapat" onPress={() => router.back()} />
      </Screen>
    );
  }
  const meta = workoutMeta(s);
  const rooms = [
    { id: 'genel', label: 'Genel', ok: true },
    { id: 'pro', label: 'Pro', ok: hasFeature(tier, 'pro_chat') },
    { id: 'plus', label: 'Plus', ok: hasFeature(tier, 'plus_chat') },
    { id: 'max', label: 'Max', ok: hasFeature(tier, 'max_chat') },
  ].filter((r) => r.ok);

  async function share() {
    if (!session || !isSupabaseConfigured) return;
    setError(null);
    const body = `${meta.title} bitti: ${meta.sets} set, ${meta.volume.toLocaleString('tr-TR')} kg, ${meta.minutes} dk${meta.prs.length ? ` · ${meta.prs.length} rekor 🏆` : ''}`;
    const { error: err } = await supabase.from('messages').insert({ room_id: room, user_id: session.user.id, body, kind: 'workout', meta });
    if (err) return setError(err.message);
    bump('posts');
    setShared(true);
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Reveal index={0}>
        <Text style={{ fontSize: 56 }}>{meta.prs.length ? '🏆' : '💪'}</Text>
        <Hero lines={['Antrenman', 'tamam']} size={48} />
      </Reveal>
      <Reveal index={1}>
        <GradientCard colors={tierColors.pro}>
          <Label>{meta.title}</Label>
          <Row gap={spacing.sm}>
            <Stat label="Süre" value={`${meta.minutes} dk`} />
            <Stat label="Set" value={`${meta.sets}`} />
            <Stat label="Hacim" value={`${meta.volume.toLocaleString('tr-TR')} kg`} color={colors.fat} />
          </Row>
          {meta.exercises.map((e) => (
            <Row key={e.name} style={{ justifyContent: 'space-between' }}>
              <Body style={{ fontSize: 14 }}>{e.name}</Body>
              <Mono style={{ color: colors.textMuted }}>{e.best}</Mono>
            </Row>
          ))}
        </GradientCard>
      </Reveal>

      {meta.prs.length > 0 && (
        <Reveal index={2}>
          <Card>
            <Label>Yeni rekorlar</Label>
            {meta.prs.map((p) => (
              <Row key={p} gap={spacing.sm}>
                <Text>🏆</Text>
                <Body style={{ fontSize: 14 }}>{p}</Body>
              </Row>
            ))}
          </Card>
        </Reveal>
      )}

      <Reveal index={3}>
        <Card>
          <Label>Toplulukla paylaş</Label>
          {canPost ? (
            <>
              <Row gap={spacing.sm}>
                {rooms.map((r) => (
                  <Chip key={r.id} label={r.label} active={room === r.id} onPress={() => setRoom(r.id)} />
                ))}
              </Row>
              <Button
                title={shared ? 'Paylaşıldı' : 'Kart olarak paylaş'}
                icon={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
                disabled={shared}
                onPress={share}
              />
              {error && <Text style={{ fontFamily: fonts.bodyBold, color: colors.danger }}>{error}</Text>}
            </>
          ) : (
            <>
              <Body muted style={{ fontSize: 13.5 }}>
                {join?.hint}
              </Body>
              <Button title={join?.title ?? ''} variant="outline" onPress={() => join && router.push(join.href)} />
            </>
          )}
        </Card>
      </Reveal>

      <View style={{ height: spacing.sm }} />
      <Button title="Bitti" arrow onPress={() => router.back()} />
    </Screen>
  );
}
