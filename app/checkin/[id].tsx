import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { CheckinPhoto } from '@/components/CheckinPhoto';
import { Avatar, Body, Button, Card, EmptyState, Input, Label, Mono, Reveal, Row, Screen, SkeletonList, TierBadge } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { CHECKIN_SELECT, fmt, MEASURES, serverError, weekTitle, type Checkin } from '@/lib/checkins';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { locale, translate } from '@/lib/i18n';

export default function CheckinDetail() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, isCoach } = useAuth();
  const [item, setItem] = useState<Checkin | null | undefined>(undefined);
  const [prev, setPrev] = useState<Checkin | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !isSupabaseConfigured) return setItem(null);
    const { data } = await supabase.from('checkins').select(CHECKIN_SELECT).eq('id', id).maybeSingle();
    const c = (data as Checkin | null) ?? null;
    setItem(c);
    setReply(c?.coach_note ?? '');
    if (!c) return;
    const { data: before } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', c.user_id)
      .lt('week_start', c.week_start)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle();
    setPrev((before as Checkin | null) ?? null);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (item === undefined) {
    return (
      <Screen edges={[]}>
        <SkeletonList variant="detail" />
      </Screen>
    );
  }
  if (!item) {
    return (
      <Screen edges={[]}>
        <EmptyState icon={{ ios: 'questionmark.circle', android: 'help', web: 'help' }} title="Check-in bulunamadı" />
      </Screen>
    );
  }

  const mine = item.user_id === session?.user.id;
  const canReply = isCoach && !mine;

  async function saveReply() {
    if (!item) return;
    setBusy(true);
    setNotice(null);
    const { error } = await supabase.from('checkins').update({ coach_note: reply.trim() || null }).eq('id', item.id);
    setBusy(false);
    if (error) return setNotice(serverError(error.message));
    setNotice('Yorum kaydedildi, üyeye bildirim gitti.');
    load();
  }

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: translate('CHECK-IN') }} />
      <Reveal index={0}>
        <Row gap={spacing.sm}>
          {!mine && <Avatar name={item.profiles?.username} path={item.profiles?.avatar_url} size={40} />}
          <View style={{ flex: 1 }}>
            {!mine && (
              <Row gap={8}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text }}>@{item.profiles?.username ?? 'üye'}</Text>
                {item.profiles?.tier && item.profiles.tier !== 'free' && <TierBadge tier={item.profiles.tier} />}
              </Row>
            )}
            <Label>{weekTitle(item.week_start)}</Label>
          </View>
        </Row>
      </Reveal>

      {item.photos.length > 0 && (
        <Reveal index={1}>
          <Row gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
            {item.photos.map((p) => (
              <View key={p} style={{ flex: 1 }}>
                <CheckinPhoto path={p} width="100%" />
              </View>
            ))}
          </Row>
        </Reveal>
      )}

      <Reveal index={2}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Ölçüm</Label>
            {prev && <Mono style={{ fontSize: 11.5, color: colors.textMuted }}>önceki hafta ile</Mono>}
          </Row>
          <Line label="Kilo" unit="kg" now={item.weight} before={prev?.weight} />
          {MEASURES.map((m) => (
            <Line key={m.key} label={m.label} unit="cm" now={item[m.key]} before={prev?.[m.key]} />
          ))}
        </Card>
      </Reveal>

      {item.note && (
        <Reveal index={3}>
          <Card>
            <Label>{mine ? 'Notun' : 'Üyenin notu'}</Label>
            <Body raw style={{ fontSize: 14.5 }}>{item.note}</Body>
          </Card>
        </Reveal>
      )}

      <Reveal index={4}>
        {canReply ? (
          <Card style={{ borderColor: colors.accent }}>
            <Label>Koç yorumu</Label>
            <Input value={reply} onChangeText={setReply} placeholder="ör. Bel 2 cm inmiş, kaloriyi böyle tut. Bacak gününe bir set ekle." multiline maxLength={2000} />
            {notice && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: notice.startsWith('Yorum') ? colors.success : colors.danger }}>{notice}</Text>}
            <Button title={busy ? 'Kaydediliyor...' : item.coach_note ? 'Yorumu güncelle' : 'Yorumu gönder'} arrow disabled={busy || !reply.trim()} onPress={saveReply} />
          </Card>
        ) : item.coach_note ? (
          <Card style={{ borderColor: colors.accent }}>
            <Label>Koçun yorumu</Label>
            <Body raw style={{ fontSize: 14.5 }}>{item.coach_note}</Body>
            {item.reviewed_at && (
              <Mono style={{ fontSize: 11.5, color: colors.textMuted }}>
                {new Date(item.reviewed_at).toLocaleDateString(locale(), { day: 'numeric', month: 'long' })}
              </Mono>
            )}
          </Card>
        ) : null}
      </Reveal>
    </Screen>
  );
}

function Line({ label, unit, now, before }: { label: string; unit: string; now: number | null; before?: number | null }) {
  const colors = useColors();
  const d = now != null && before != null ? Math.round((now - before) * 10) / 10 : null;
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
      <Body style={{ fontSize: 14.5 }}>{label}</Body>
      <Row gap={8}>
        {d != null && d !== 0 && (
          <Mono style={{ fontSize: 12.5, color: colors.textMuted }}>
            {d > 0 ? '▲' : '▼'} {fmt(Math.abs(d))}
          </Mono>
        )}
        <Text style={{ fontFamily: fonts.mono, fontSize: 15, color: colors.text }}>
          {fmt(now)} {now != null ? unit : ''}
        </Text>
      </Row>
    </Row>
  );
}
