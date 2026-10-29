import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { Body, Button, Card, Chip, EmptyState, GradientCard, Hero, Label, Mono, Reveal, Row, Screen, Stat } from '@/components/ui';
import { fonts, spacing, tierColors } from '@/constants/theme';
import { useAuth, useJoinStep } from '@/lib/auth';
import { useProgress } from '@/lib/progress';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { hasFeature } from '@/lib/tiers';
import { useWorkouts, workoutMeta } from '@/lib/workouts';
import { locale, tx } from '@/lib/i18n';

export default function SummaryScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { history } = useWorkouts();
  const { session, tier, canPost, isCoach } = useAuth();
  const join = useJoinStep();
  const { bump } = useProgress();
  const [room, setRoom] = useState('genel');
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = history.find((x) => x.id === id);

  if (!s) {
    return (
      <Screen full edges={['top', 'bottom']}>
        <EmptyState icon={{ ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' }} title="Antrenman bulunamadı" body="Bu antrenman kaydı bu telefonda yok." />
        <Button title="Kapat" onPress={() => router.back()} />
      </Screen>
    );
  }
  const meta = workoutMeta(s);
  const rooms = [
    { id: 'genel', label: 'Genel', ok: true },
    { id: 'pro', label: 'Pro', ok: isCoach || hasFeature(tier, 'pro_chat') },
    { id: 'plus', label: 'Plus', ok: isCoach || hasFeature(tier, 'plus_chat') },
    { id: 'max', label: 'Max', ok: isCoach || hasFeature(tier, 'max_chat') },
  ].filter((r) => r.ok);

  async function share() {
    if (!session || !isSupabaseConfigured) return;
    setError(null);
    const body = tx('{0} bitti: {1} set, {2} kg, {3} dk{4}', [meta.title, meta.sets, meta.volume.toLocaleString(locale()), meta.minutes, meta.prs.length ? ` · ${meta.prs.length} rekor 🏆` : '']);
    const { error: err } = await supabase.from('messages').insert({ room_id: room, user_id: session.user.id, body, kind: 'workout', meta });
    if (err) return setError(err.message);
    bump('posts');
    setShared(true);
  }

  return (
    <Screen full edges={['top', 'bottom']}>
      <Reveal index={0}>
        <Text style={{ fontSize: 56 }}>{meta.prs.length ? '🏆' : '💪'}</Text>
        <Hero lines={['Antrenman', 'tamam']} size={48} />
      </Reveal>
      <Reveal index={1}>
        <GradientCard colors={tierColors.pro}>
          <Label>{meta.title}</Label>
          <Row gap={spacing.sm}>
            <Stat label="Süre" value={tx('{0} dk', [meta.minutes])} />
            <Stat label="Set" value={`${meta.sets}`} />
            <Stat label="Hacim" value={tx('{0} kg', [meta.volume.toLocaleString(locale())])} />
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
      <Button
        title="Hikâyede paylaş"
        variant="outline"
        icon={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
        onPress={() => router.push({ pathname: '/share', params: { kind: 'workout', id: s.id } })}
      />
      <Button title="Bitti" arrow onPress={() => router.back()} />
    </Screen>
  );
}
