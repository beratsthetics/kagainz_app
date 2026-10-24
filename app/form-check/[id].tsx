import { useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { BodyMap } from '@/components/BodyMap';
import { Avatar, Body, Button, Card, Input, Label, Mono, PressScale, Reveal, Row, Screen, SkeletonList, Tag } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { exerciseById } from '@/lib/exercises';
import { FORM_CHECK_SELECT, formatClock, type FormCheck, type FormComment } from '@/lib/formcheck';
import { useSignedUrl } from '@/lib/media';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { locale, tx } from '@/lib/i18n';

export default function FormCheckDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [check, setCheck] = useState<FormCheck | null>(null);
  const [comments, setComments] = useState<FormComment[]>([]);
  const url = useSignedUrl('form-checks', check?.video_path);

  const loadComments = useCallback(() => {
    supabase
      .from('form_check_comments')
      .select('id, form_check_id, author_id, body, at_seconds, created_at, profiles:profiles!form_check_comments_author_id_fkey(*)')
      .eq('form_check_id', id)
      .order('at_seconds', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments((data ?? []) as unknown as FormComment[]));
  }, [id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !id) return;
    supabase
      .from('form_checks')
      .select(FORM_CHECK_SELECT)
      .eq('id', id)
      .single()
      .then(({ data }) => setCheck(data as unknown as FormCheck));
    loadComments();
    const channel = supabase
      .channel(`form:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'form_check_comments', filter: `form_check_id=eq.${id}` }, loadComments)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadComments]);

  if (!check) {
    return (
      <Screen edges={[]}>
        <SkeletonList variant="detail" />
      </Screen>
    );
  }

  return url ? (
    <Detail check={check} url={url} comments={comments} onComment={loadComments} onReviewed={() => setCheck({ ...check, status: 'reviewed' })} />
  ) : (
    <Screen edges={[]}>
      <SkeletonList variant="detail" />
    </Screen>
  );
}

function Detail({
  check,
  url,
  comments,
  onComment,
  onReviewed,
}: {
  check: FormCheck;
  url: string;
  comments: FormComment[];
  onComment: () => void;
  onReviewed: () => void;
}) {
  const colors = useColors();
  const { session, isCoach } = useAuth();
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.25;
  });
  const [now, setNow] = useState(0);
  const [text, setText] = useState('');
  const [stamp, setStamp] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const exercise = exerciseById(check.exercise_id);

  useEffect(() => {
    const sub = player.addListener('timeUpdate', (e) => setNow(e.currentTime));
    return () => sub.remove();
  }, [player]);

  function seek(t: number) {
    player.currentTime = t;
    player.pause();
  }

  async function send() {
    const body = text.trim();
    if (!body || !session) return;
    setError(null);
    const at = isCoach && stamp ? Math.round(player.currentTime * 10) / 10 : null;
    const { error: err } = await supabase
      .from('form_check_comments')
      .insert({ form_check_id: check.id, author_id: session.user.id, body, at_seconds: at });
    if (err) return setError(err.message);
    if (isCoach && check.status !== 'reviewed') {
      await supabase.from('form_checks').update({ status: 'reviewed', reviewed_at: new Date().toISOString() }).eq('id', check.id);
      onReviewed();
    }
    setText('');
    onComment();
  }

  return (
    <Screen edges={[]}>
      <Reveal index={0}>
        <View style={{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000', aspectRatio: 9 / 12, maxHeight: 520 }}>
          <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls fullscreenOptions={{ enable: true }} />
        </View>
      </Reveal>

      <Reveal index={1}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.text }}>{exercise?.trName ?? check.exercise_id}</Text>
              <Mono style={{ color: colors.textMuted }}>
                @{check.profiles?.username ?? 'üye'} · {new Date(check.created_at).toLocaleDateString(locale(), { day: 'numeric', month: 'long' })}
              </Mono>
            </View>
            {exercise && <BodyMap primary={exercise.primary} secondary={exercise.secondary} height={90} labels={false} />}
          </Row>
          {check.note && <Body style={{ fontSize: 14 }}>“{check.note}”</Body>}
        </Card>
      </Reveal>

      <Reveal index={2}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Yorumlar</Label>
            {check.status === 'reviewed' ? (
              <Tag color={colors.success} bg={colors.successSoft}>
                Yorumlandı
              </Tag>
            ) : (
              <Tag color={colors.fat} bg={colors.surfaceHigh}>
                Koç bekleniyor
              </Tag>
            )}
          </Row>
          {comments.length === 0 && (
            <Body muted style={{ fontSize: 13.5 }}>
              {isCoach ? 'Videoyu durdur, o saniyeye yorum yaz.' : 'Koçun yorumları burada saniyeleriyle görünecek.'}
            </Body>
          )}
          {comments.map((c) => {
            const active = c.at_seconds != null && Math.abs(now - c.at_seconds) < 1;
            return (
              <PressScale key={c.id} onPress={() => c.at_seconds != null && seek(c.at_seconds)} disabled={c.at_seconds == null}>
                <Row gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
                  {c.at_seconds != null ? (
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: active ? colors.accent : colors.accentSoft,
                      }}>
                      <Mono style={{ fontSize: 12, color: active ? colors.primaryText : colors.accentBright }}>{formatClock(c.at_seconds)}</Mono>
                    </View>
                  ) : (
                    <Avatar name={c.profiles?.username} path={c.profiles?.avatar_url} size={26} />
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Row gap={6}>
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.textMuted }}>@{c.profiles?.username ?? ''}</Text>
                      {c.profiles?.role === 'coach' && (
                        <Tag color={colors.primaryText} bg={colors.fat}>
                          Koç
                        </Tag>
                      )}
                    </Row>
                    <Body raw style={{ fontSize: 14.5 }}>{c.body}</Body>
                  </View>
                </Row>
              </PressScale>
            );
          })}
        </Card>
      </Reveal>

      <Reveal index={3}>
        <Card>
          {isCoach && (
            <PressScale onPress={() => setStamp((s) => !s)}>
              <Row gap={spacing.sm}>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: colors.accent,
                    backgroundColor: stamp ? colors.accent : 'transparent',
                  }}
                />
                <Body style={{ fontSize: 13.5 }}>{tx('Videonun şu anki saniyesine ekle ({0})', [formatClock(now)])}</Body>
              </Row>
            </PressScale>
          )}
          <Input value={text} onChangeText={setText} placeholder={isCoach ? 'ör. Dizler içe kaçıyor, kalçayı geri it' : 'Koça soru sor...'} multiline maxLength={1000} />
          {error && <Text style={{ fontFamily: fonts.bodyBold, color: colors.danger }}>{error}</Text>}
          <Button title="Yorum gönder" arrow disabled={!text.trim()} onPress={send} />
        </Card>
      </Reveal>
    </Screen>
  );
}
