import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Avatar, Body, Card, GradientCard, Heading, Label, Mono, ProgressBar, Reveal, Row, Screen, Tag } from '@/components/ui';
import { fonts, spacing, tierColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { challengeProgress, CHALLENGES, currentChallenge, weekDays } from '@/lib/challenges';
import { useProgress } from '@/lib/progress';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';

const DAY_SHORT = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
type Finisher = { user_id: string; created_at: string; profiles: { username: string | null } | null };

export default function ChallengesScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const { activity } = useProgress();
  const ch = challengeProgress(activity);
  const days = weekDays();
  const [finishers, setFinishers] = useState<Finisher[]>([]);
  const left = 7 - ((new Date().getDay() + 6) % 7) - 1;

  // Tamamlayınca topluluk listesine yazılır (aynı hafta için bir kez).
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const load = () =>
      supabase
        .from('challenge_completions')
        .select('user_id, created_at, profiles(username)')
        .eq('challenge_key', ch.key)
        .order('created_at', { ascending: true })
        .limit(100)
        .then(({ data }) => setFinishers((data ?? []) as unknown as Finisher[]));
    if (ch.done && session) {
      supabase
        .from('challenge_completions')
        .upsert({ user_id: session.user.id, challenge_key: ch.key }, { onConflict: 'user_id,challenge_key', ignoreDuplicates: true })
        .then(load);
    } else load();
  }, [ch.key, ch.done, session]);

  const next = [1, 2, 3].map((w) => {
    const d = new Date();
    d.setDate(d.getDate() + 7 * w);
    return currentChallenge(d).challenge;
  });

  return (
    <Screen edges={[]}>
      <Reveal index={0}>
        <GradientCard colors={ch.done ? [colors.success, colors.success] : tierColors.pro}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>{ch.weekId.replace('-W', ' · Hafta ')}</Label>
            {ch.done ? (
              <Tag color={colors.success} bg={colors.successSoft}>
                Tamamlandı
              </Tag>
            ) : (
              <Mono style={{ color: colors.textMuted }}>{left > 0 ? `${left} gün kaldı` : 'Son gün'}</Mono>
            )}
          </Row>
          <Text style={{ fontSize: 56 }}>{ch.challenge.emoji}</Text>
          <Heading style={{ fontSize: 30 }}>{ch.challenge.title}</Heading>
          <Body muted>{ch.challenge.description}</Body>
          <Row style={{ justifyContent: 'space-between' }}>
            <Mono>
              {ch.value}/{ch.challenge.target} {ch.challenge.unit}
            </Mono>
            <Mono style={{ color: colors.textMuted }}>%{Math.round((ch.value / ch.challenge.target) * 100)}</Mono>
          </Row>
          <ProgressBar value={ch.value / ch.challenge.target} color={ch.done ? colors.success : colors.fat} />
          <Row style={{ justifyContent: 'space-between', marginTop: spacing.xs }}>
            {days.map((d, i) => {
              const a = activity[d] ?? {};
              const active = (a.m ?? 0) > 0 || (a.w ?? 0) > 0;
              const today = i === (new Date().getDay() + 6) % 7;
              return (
                <View key={d} style={{ alignItems: 'center', gap: 4 }}>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active ? colors.fat : colors.surfaceHigh,
                      borderWidth: today ? 2 : 0,
                      borderColor: colors.text,
                    }}>
                    <Text style={{ fontSize: 12 }}>{(a.w ?? 0) > 0 ? '💪' : active ? '✓' : ''}</Text>
                  </View>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10.5, color: colors.textMuted }}>{DAY_SHORT[i]}</Text>
                </View>
              );
            })}
          </Row>
        </GradientCard>
      </Reveal>

      <Reveal index={1}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Bu hafta tamamlayanlar</Label>
            <Mono style={{ color: colors.textMuted }}>{finishers.length}</Mono>
          </Row>
          {finishers.length ? (
            finishers.map((f, i) => (
              <Row key={f.user_id} gap={spacing.sm}>
                <Mono style={{ width: 22, color: i < 3 ? colors.fat : colors.textMuted }}>{i + 1}</Mono>
                <Avatar name={f.profiles?.username} size={28} />
                <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: f.user_id === session?.user.id ? colors.accentBright : colors.text }}>
                  @{f.profiles?.username ?? 'anonim'}
                </Text>
                <Mono style={{ fontSize: 11.5, color: colors.textMuted }}>
                  {new Date(f.created_at).toLocaleDateString('tr-TR', { weekday: 'short' })}
                </Mono>
              </Row>
            ))
          ) : (
            <Body muted style={{ fontSize: 13.5 }}>
              Henüz kimse bitirmedi. İlk sen ol.
            </Body>
          )}
        </Card>
      </Reveal>

      <Reveal index={2}>
        <Card>
          <Label>Sıradaki haftalar</Label>
          {next.map((c, i) => (
            <Row key={`${c.code}-${i}`} gap={spacing.md}>
              <Text style={{ fontSize: 24 }}>{c.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text }}>{c.title}</Text>
                <Body muted style={{ fontSize: 12.5 }}>
                  {c.description}
                </Body>
              </View>
            </Row>
          ))}
          <Body muted style={{ fontSize: 12 }}>
            {CHALLENGES.length} görev her hafta sırayla döner.
          </Body>
        </Card>
      </Reveal>
    </Screen>
  );
}
