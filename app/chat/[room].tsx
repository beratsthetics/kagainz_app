import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Avatar,
  Body,
  Button,
  Chip,
  GridBackground,
  Heading,
  Icon,
  IconBox,
  Input,
  Label,
  Mono,
  PressScale,
  Row,
  Sheet,
  Tag,
  type IconName,
} from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth, useJoinStep } from '@/lib/auth';
import { parseMeal, sumMacros, type Macros } from '@/lib/macros';
import { pickImage, uploadBase64, useSignedUrl } from '@/lib/media';
import { useProgress } from '@/lib/progress';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { makeStyles, useColors } from '@/lib/theme';
import type { WorkoutMeta } from '@/lib/workouts';

type Kind = 'text' | 'meal' | 'workout' | 'activity' | 'photo';
type Message = {
  id: number;
  body: string;
  kind: Kind;
  macros: Macros | null;
  meta: WorkoutMeta | null;
  image_path: string | null;
  reply_to: number | null;
  pinned: boolean;
  hidden: boolean;
  created_at: string;
  user_id: string;
  profiles: { username: string | null; role: string | null } | null;
};
type Reaction = { message_id: number; user_id: string; emoji: string };

const SELECT = 'id, body, kind, macros, meta, image_path, reply_to, pinned, hidden, created_at, user_id, profiles:profiles!messages_user_id_fkey(username, role)';
const PAGE = 50;
const EMOJIS = ['💪', '🔥', '👏', '❤️', '😂'];

const KINDS: { kind: Kind; label: string; icon: IconName; placeholder: string }[] = [
  { kind: 'text', label: 'Mesaj', icon: { ios: 'text.bubble', android: 'chat', web: 'chat' }, placeholder: 'Bir şey paylaş...' },
  {
    kind: 'meal',
    label: 'Öğün',
    icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
    placeholder: 'ör. 3 yumurta, 100g yulaf',
  },
  {
    kind: 'workout',
    label: 'Antrenman',
    icon: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' },
    placeholder: 'ör. Göğüs günü, bench 4x8 80kg',
  },
  {
    kind: 'activity',
    label: 'Aktivite',
    icon: { ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' },
    placeholder: 'ör. 12.000 adım, 30 dk koşu',
  },
];

const ROOM_NAMES: Record<string, string> = { genel: 'GENEL', pro: 'PRO KULÜP', plus: 'PLUS KULÜP', max: 'MAX SALONU' };

export default function ChatRoomScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { room } = useLocalSearchParams<{ room: string }>();
  const { session, profile, canPost, isCoach } = useAuth();
  const { bump } = useProgress();
  const join = useJoinStep();
  const me = session?.user.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<Kind>('text');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [photo, setPhoto] = useState<{ base64: string; uri: string; mime: string } | null>(null);
  const [action, setAction] = useState<Message | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const list = useRef<FlatList<Message>>(null);
  const atBottom = useRef(true);
  const preview = useMemo(() => sumMacros(parseMeal(text)), [text]);
  const mutedUntil = profile?.muted_until ? new Date(profile.muted_until) : null;
  const muted = mutedUntil != null && mutedUntil > new Date();

  const visible = useMemo(() => messages.filter((m) => !blocked.includes(m.user_id)), [messages, blocked]);
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const pinned = useMemo(() => [...visible].reverse().find((m) => m.pinned), [visible]);

  const loadReactions = useCallback(async (ids: number[]) => {
    if (!ids.length) return;
    const { data } = await supabase.from('message_reactions').select('message_id, user_id, emoji').in('message_id', ids);
    if (data) setReactions((prev) => [...prev.filter((r) => !ids.includes(r.message_id)), ...(data as Reaction[])]);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !room) return;

    supabase
      .from('messages')
      .select(SELECT)
      .eq('room_id', room)
      .order('created_at', { ascending: false })
      .limit(PAGE)
      .then(({ data, error: err }) => {
        if (err) return setLoadError(describeError(err));
        setLoadError(null);
        const rows = ((data ?? []) as unknown as Message[]).reverse();
        setMessages(rows);
        setHasMore(rows.length === PAGE);
        loadReactions(rows.map((m) => m.id));
      });

    if (me) {
      supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', me)
        .then(({ data }) => setBlocked((data ?? []).map((b) => b.blocked_id as string)));
    }

    const fetchOne = async (id: number) => {
      const { data } = await supabase.from('messages').select(SELECT).eq('id', id).single();
      return data as unknown as Message | null;
    };

    const channel = supabase
      .channel(`room:${room}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` }, async (p) => {
        const m = await fetchOne(p.new.id as number);
        if (m) setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` }, (p) => {
        setMessages((prev) => prev.map((x) => (x.id === p.new.id ? { ...x, pinned: Boolean(p.new.pinned), hidden: Boolean(p.new.hidden) } : x)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (p) => {
        setMessages((prev) => prev.filter((x) => x.id !== p.old.id));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions', filter: `room_id=eq.${room}` }, (p) => {
        const r = p.new as Reaction;
        setReactions((prev) =>
          prev.some((x) => x.message_id === r.message_id && x.user_id === r.user_id && x.emoji === r.emoji) ? prev : [...prev, r],
        );
      })
      // Silme olayları filtrelenemiyor; anahtar (mesaj, kullanıcı, emoji) olduğu için tamamı gelir.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, (p) => {
        const r = p.old as Partial<Reaction>;
        setReactions((prev) => prev.filter((x) => !(x.message_id === r.message_id && x.user_id === r.user_id && x.emoji === r.emoji)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [room, me, loadReactions]);

  async function loadOlder() {
    const first = messages[0];
    if (!first || loadingMore) return;
    setLoadingMore(true);
    const { data } = await supabase
      .from('messages')
      .select(SELECT)
      .eq('room_id', room)
      .lt('created_at', first.created_at)
      .order('created_at', { ascending: false })
      .limit(PAGE);
    const rows = ((data ?? []) as unknown as Message[]).reverse();
    atBottom.current = false;
    setMessages((prev) => [...rows, ...prev]);
    setHasMore(rows.length === PAGE);
    setLoadingMore(false);
    loadReactions(rows.map((m) => m.id));
  }

  async function attach(camera: boolean) {
    const asset = await pickImage(camera);
    if (asset?.base64) setPhoto({ base64: asset.base64, uri: asset.uri, mime: asset.mimeType ?? 'image/jpeg' });
  }

  async function send() {
    const body = text.trim();
    if ((!body && !photo) || !session || !room) return;
    setSending(true);
    setError(null);
    try {
      let image_path: string | null = null;
      if (photo) {
        const ext = photo.mime.includes('png') ? 'png' : 'jpg';
        image_path = await uploadBase64('chat', `${room}/${session.user.id}/${Date.now()}.${ext}`, photo.base64, photo.mime);
      }
      // Öğün paylaşımında makrolar otomatik hesaplanıp mesaja eklenir.
      const macros = kind === 'meal' && body ? sumMacros(parseMeal(body)) : null;
      const { data: sent, error: err } = await supabase.from('messages').insert({
        room_id: room,
        user_id: session.user.id,
        body: body || '📷',
        kind: photo && kind === 'text' ? 'photo' : kind,
        macros,
        image_path,
        reply_to: replyTo?.id ?? null,
      }).select(SELECT).single();
      if (err) throw err;
      // Canlı güncelleme gecikse bile kendi mesajın hemen görünsün.
      const m = sent as unknown as Message;
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      atBottom.current = true;
      bump('posts');
      setText('');
      setPhoto(null);
      setReplyTo(null);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSending(false);
    }
  }

  async function toggleReaction(m: Message, emoji: string) {
    if (!me || !canPost) return;
    const mine = reactions.find((r) => r.message_id === m.id && r.user_id === me && r.emoji === emoji);
    if (mine) {
      setReactions((prev) => prev.filter((r) => r !== mine));
      await supabase.from('message_reactions').delete().match({ message_id: m.id, user_id: me, emoji });
    } else {
      const r = { message_id: m.id, user_id: me, emoji };
      setReactions((prev) => [...prev, r]);
      await supabase.from('message_reactions').insert({ ...r, room_id: room });
    }
  }

  // Mesaj işlemleri: tepki, yanıt, şikayet, engelle; koç için sabitle, sil, sustur.
  async function run(what: 'reply' | 'report' | 'block' | 'pin' | 'unhide' | 'delete' | 'mute', m: Message) {
    setAction(null);
    if (!me) return;
    if (what === 'reply') return setReplyTo(m);
    let err: { message: string } | null = null;
    if (what === 'report') {
      ({ error: err } = await supabase.from('reports').insert({ message_id: m.id, reporter_id: me, reason: 'uygunsuz' }));
      // Aynı mesajı ikinci kez şikayet etmek hata değil.
      if (err && 'code' in err && err.code === '23505') err = null;
      if (!err) setNotice('Şikayetin moderatörlere iletildi. Teşekkürler.');
    } else if (what === 'block') {
      ({ error: err } = await supabase.from('blocks').insert({ blocker_id: me, blocked_id: m.user_id }));
      if (!err) {
        setBlocked((b) => [...b, m.user_id]);
        setNotice(`@${m.profiles?.username ?? 'kullanıcı'} engellendi. Mesajlarını artık görmeyeceksin.`);
      }
    } else if (what === 'pin') {
      ({ error: err } = await supabase.from('messages').update({ pinned: !m.pinned }).eq('id', m.id));
      if (!err) setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: !m.pinned } : x)));
    } else if (what === 'unhide') {
      ({ error: err } = await supabase.from('messages').update({ hidden: false }).eq('id', m.id));
      if (!err) setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, hidden: false } : x)));
    } else if (what === 'delete') {
      ({ error: err } = await supabase.from('messages').delete().eq('id', m.id));
      if (!err) setMessages((prev) => prev.filter((x) => x.id !== m.id));
    } else if (what === 'mute') {
      ({ error: err } = await supabase.rpc('mute_user', { target: m.user_id, minutes: 60 * 24 }));
      if (!err) setNotice(`@${m.profiles?.username ?? 'kullanıcı'} 24 saat susturuldu.`);
    }
    if (err) setNotice(err.message);
  }

  function scrollTo(id: number) {
    const index = visible.findIndex((m) => m.id === id);
    if (index >= 0) list.current?.scrollToIndex({ index, viewPosition: 0.3, animated: true });
  }

  const canSend = (text.trim().length > 0 || photo != null) && !sending;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <GridBackground glow={false} />
      <Stack.Screen options={{ title: ROOM_NAMES[room ?? ''] ?? 'CHAT', headerTransparent: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
          {pinned && (
            <PressScale onPress={() => scrollTo(pinned.id)} style={styles.pinned}>
              <Icon name={{ ios: 'pin.fill', android: 'push_pin', web: 'push_pin' }} size={15} color={colors.fat} />
              <View style={{ flex: 1 }}>
                <Label style={{ color: colors.fat }}>Sabitlenmiş</Label>
                <Text numberOfLines={1} style={styles.pinnedText}>
                  {pinned.body}
                </Text>
              </View>
            </PressScale>
          )}
          <FlatList
            ref={list}
            data={visible}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={{ padding: spacing.md, gap: spacing.md, flexGrow: 1 }}
            onScrollToIndexFailed={() => {}}
            onScroll={(e) => {
              const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
              atBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 120;
            }}
            scrollEventThrottle={64}
            onContentSizeChange={() => atBottom.current && list.current?.scrollToEnd({ animated: false })}
            ListHeaderComponent={
              hasMore ? (
                <View style={{ alignItems: 'center' }}>
                  {loadingMore ? (
                    <ActivityIndicator color={colors.textMuted} />
                  ) : (
                    <Chip label="Daha eski mesajlar" icon={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }} onPress={loadOlder} />
                  )}
                </View>
              ) : undefined
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <IconBox
                  name={{ ios: 'bubble.left.and.bubble.right.fill', android: 'forum', web: 'forum' }}
                  color={colors.accentBright}
                  bg={colors.accentSoft}
                  size={64}
                />
                <Heading style={{ textAlign: 'center' }}>{isSupabaseConfigured ? 'İlk paylaşımı sen yap' : 'Bağlantı bekleniyor'}</Heading>
                <Body muted style={{ textAlign: 'center', maxWidth: 280 }}>
                  {isSupabaseConfigured
                    ? 'Bugün ne yedin, nasıl antrenman yaptın? Topluluğa anlat.'
                    : 'Sunucu bağlantısı henüz ayarlanmadı.'}
                </Body>
              </View>
            }
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                mine={item.user_id === me}
                reply={item.reply_to ? (byId.get(item.reply_to) ?? null) : null}
                hasReply={item.reply_to != null}
                reactions={reactions.filter((r) => r.message_id === item.id)}
                me={me}
                onReact={(e) => toggleReaction(item, e)}
                onLongPress={() => me && setAction(item)}
                onReplyPress={() => item.reply_to && scrollTo(item.reply_to)}
              />
            )}
          />

          {loadError && (
            <View style={styles.notice}>
              <Body style={{ flex: 1, fontSize: 13, color: colors.danger }}>{loadError}</Body>
            </View>
          )}

          {notice && (
            <PressScale onPress={() => setNotice(null)} style={styles.notice}>
              <Body style={{ flex: 1, fontSize: 13 }}>{notice}</Body>
              <Icon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={14} color={colors.textMuted} />
            </PressScale>
          )}

          {canPost && !muted ? (
            <View style={styles.composer}>
              {replyTo && (
                <Row gap={spacing.sm} style={styles.replyBar}>
                  <View style={{ flex: 1 }}>
                    <Label style={{ color: colors.accentBright }}>@{replyTo.profiles?.username ?? 'anonim'} yanıtlanıyor</Label>
                    <Text numberOfLines={1} style={styles.replyText}>
                      {replyTo.body}
                    </Text>
                  </View>
                  <PressScale onPress={() => setReplyTo(null)}>
                    <Icon name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} size={18} color={colors.textMuted} />
                  </PressScale>
                </Row>
              )}
              {photo && (
                <Row gap={spacing.sm}>
                  <Image source={{ uri: photo.uri }} style={{ width: 64, height: 64, borderRadius: radius.md }} contentFit="cover" />
                  <Body muted style={{ flex: 1, fontSize: 13 }}>
                    Fotoğraf eklendi. İstersen açıklama yaz.
                  </Body>
                  <PressScale onPress={() => setPhoto(null)}>
                    <Icon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={18} color={colors.danger} />
                  </PressScale>
                </Row>
              )}
              <Row gap={spacing.xs} style={{ flexWrap: 'wrap' }}>
                {KINDS.map((k) => (
                  <Chip key={k.kind} label={k.label} icon={k.icon} active={kind === k.kind} onPress={() => setKind(k.kind)} />
                ))}
              </Row>
              {kind === 'meal' && preview.kcal > 0 && (
                <Mono style={{ color: colors.textMuted, fontSize: 12 }}>
                  ≈ {preview.kcal} kcal · <Text style={{ color: colors.protein }}>P {preview.protein}</Text> ·{' '}
                  <Text style={{ color: colors.carb }}>K {preview.carb}</Text> · <Text style={{ color: colors.fat }}>Y {preview.fat}</Text>
                </Mono>
              )}
              <Row gap={spacing.sm} style={{ alignItems: 'flex-end' }}>
                <PressScale onPress={() => attach(false)} onLongPress={() => attach(true)} style={styles.attach}>
                  <Icon name={{ ios: 'photo.on.rectangle', android: 'add_photo_alternate', web: 'add_photo_alternate' }} size={20} color={colors.text} />
                </PressScale>
                <View style={{ flex: 1 }}>
                  <Input
                    value={text}
                    onChangeText={setText}
                    placeholder={KINDS.find((k) => k.kind === kind)?.placeholder}
                    multiline
                    maxLength={2000}
                    style={{ maxHeight: 120 }}
                  />
                </View>
                <PressScale onPress={send} disabled={!canSend} style={[styles.send, !canSend && { opacity: 0.4 }]}>
                  {sending ? (
                    <ActivityIndicator color={colors.primaryText} />
                  ) : (
                    <Icon name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }} size={20} color={colors.primaryText} />
                  )}
                </PressScale>
              </Row>
              {error && <Label style={{ color: colors.danger }}>{error}</Label>}
            </View>
          ) : (
            <View style={styles.composer}>
              <Row gap={spacing.sm}>
                <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={16} color={colors.textMuted} />
                <Body muted style={{ flex: 1, fontSize: 13.5 }}>
                  {muted
                    ? `Bir moderatör seni ${mutedUntil!.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} saatine kadar susturdu.`
                    : join?.hint}
                </Body>
              </Row>
              {!muted && <Button title={join?.title ?? ''} arrow onPress={() => join && router.push(join.href)} />}
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Sheet visible={action != null} onClose={() => setAction(null)}>
        {action && (
          <>
            {canPost && (
              <Row style={{ justifyContent: 'space-around' }}>
                {EMOJIS.map((e) => (
                  <PressScale
                    key={e}
                    onPress={() => {
                      toggleReaction(action, e);
                      setAction(null);
                    }}
                    style={styles.emojiBtn}>
                    <Text style={{ fontSize: 26 }}>{e}</Text>
                  </PressScale>
                ))}
              </Row>
            )}
            <View>
              {canPost && <ActionRow icon={{ ios: 'arrowshape.turn.up.left.fill', android: 'reply', web: 'reply' }} label="Yanıtla" onPress={() => run('reply', action)} />}
              {isCoach && (
                <>
                  <ActionRow
                    icon={{ ios: 'pin.fill', android: 'push_pin', web: 'push_pin' }}
                    label={action.pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}
                    onPress={() => run('pin', action)}
                  />
                  {action.hidden && (
                    <ActionRow icon={{ ios: 'eye.fill', android: 'visibility', web: 'visibility' }} label="Gizlemeyi kaldır" onPress={() => run('unhide', action)} />
                  )}
                  {action.user_id !== me && (
                    <ActionRow icon={{ ios: 'speaker.slash.fill', android: 'volume_off', web: 'volume_off' }} label="24 saat sustur" onPress={() => run('mute', action)} />
                  )}
                </>
              )}
              {(isCoach || action.user_id === me) && (
                <ActionRow icon={{ ios: 'trash.fill', android: 'delete', web: 'delete' }} label="Mesajı sil" danger onPress={() => run('delete', action)} />
              )}
              {action.user_id !== me && (
                <>
                  <ActionRow icon={{ ios: 'flag.fill', android: 'flag', web: 'flag' }} label="Şikayet et" danger onPress={() => run('report', action)} />
                  <ActionRow icon={{ ios: 'hand.raised.fill', android: 'block', web: 'block' }} label="Kullanıcıyı engelle" danger onPress={() => run('block', action)} />
                </>
              )}
            </View>
          </>
        )}
      </Sheet>
    </View>
  );
}

// Supabase hatalarını okunur hale getirir; eksik sütun hatası 0002 SQL'inin çalıştırılmadığını gösterir.
function describeError(e: unknown) {
  const message = typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : 'Bir hata oldu';
  if (/column .* does not exist|could not find .* column|schema cache/i.test(message)) {
    return "Sunucu güncel değil: supabase/migrations klasöründeki son SQL dosyasını Supabase'de çalıştır.";
  }
  if (/row-level security/i.test(message)) return 'Bu odaya yazma iznin yok. Kullanıcı adı seçtiğinden emin ol.';
  return message;
}

function ActionRow({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <PressScale onPress={onPress} style={styles.actionRow}>
      <Icon name={icon} size={18} color={danger ? colors.danger : colors.text} />
      <Text style={[styles.actionText, danger && { color: colors.danger }]}>{label}</Text>
    </PressScale>
  );
}

function MessageBubble({
  message,
  mine,
  reply,
  hasReply,
  reactions,
  me,
  onReact,
  onLongPress,
  onReplyPress,
}: {
  message: Message;
  mine: boolean;
  reply: Message | null;
  hasReply: boolean;
  reactions: Reaction[];
  me?: string;
  onReact: (emoji: string) => void;
  onLongPress: () => void;
  onReplyPress: () => void;
}) {
  const colors = useColors();
  const styles = useStyles();
  const meta = KINDS.find((k) => k.kind === message.kind);
  const coach = message.profiles?.role === 'coach';
  const time = new Date(message.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const ink = mine ? colors.primaryText : colors.text;
  const grouped = EMOJIS.map((e) => ({
    emoji: e,
    count: reactions.filter((r) => r.emoji === e).length,
    mine: reactions.some((r) => r.emoji === e && r.user_id === me),
  })).filter((g) => g.count > 0);

  return (
    <Row gap={spacing.sm} style={{ alignItems: 'flex-end', flexDirection: mine ? 'row-reverse' : 'row' }}>
      {!mine && <Avatar name={message.profiles?.username} size={32} />}
      <View style={{ maxWidth: '80%', gap: 4, alignItems: mine ? 'flex-end' : 'flex-start' }}>
        <PressScale onLongPress={onLongPress} delayLongPress={300} style={[message.hidden && { opacity: 0.55 }, styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther, coach && !mine && styles.bubbleCoach]}>
          <Row style={{ justifyContent: 'space-between', gap: spacing.md }}>
            {!mine && (
              <Row gap={6}>
                <Text style={styles.username}>@{message.profiles?.username ?? 'anonim'}</Text>
                {coach && (
                  <Tag color={colors.primaryText} bg={colors.fat}>
                    Koç
                  </Tag>
                )}
              </Row>
            )}
            {message.hidden && (
              <Tag color={colors.danger} bg={colors.dangerSoft}>
                Şikayetle gizlendi
              </Tag>
            )}
            {message.pinned && <Icon name={{ ios: 'pin.fill', android: 'push_pin', web: 'push_pin' }} size={12} color={mine ? colors.primaryText : colors.fat} />}
            {message.kind !== 'text' && message.kind !== 'photo' && meta && (
              <Tag color={mine ? colors.primaryText : colors.accentBright} bg={mine ? colors.overlay : colors.accentSoft}>
                {meta.label}
              </Tag>
            )}
          </Row>
          {hasReply && (
            <PressScale onPress={onReplyPress} style={[styles.quote, mine && { borderLeftColor: colors.primaryText }]}>
              <Text style={[styles.quoteUser, mine && { color: colors.primaryText }]}>@{reply?.profiles?.username ?? '...'}</Text>
              <Text numberOfLines={2} style={[styles.quoteText, mine && { color: colors.primaryText }]}>
                {reply?.body ?? 'Önceki bir mesaj'}
              </Text>
            </PressScale>
          )}
          {message.image_path && <ChatImage path={message.image_path} />}
          {message.kind === 'workout' && message.meta ? (
            <WorkoutCard meta={message.meta} mine={mine} />
          ) : message.body !== '📷' || !message.image_path ? (
            <Text style={[styles.text, { color: ink }]}>{message.body}</Text>
          ) : null}
          {message.macros && (
            <Row gap={6} style={{ flexWrap: 'wrap', marginTop: 4 }}>
              <MacroPill label="kcal" value={message.macros.kcal} color={ink} />
              <MacroPill label="P" value={message.macros.protein} color={colors.protein} />
              <MacroPill label="K" value={message.macros.carb} color={colors.carb} />
              <MacroPill label="Y" value={message.macros.fat} color={colors.fat} />
            </Row>
          )}
          <Text style={[styles.time, mine && { color: colors.primaryText, opacity: 0.55 }]}>{time}</Text>
        </PressScale>
        {grouped.length > 0 && (
          <Row gap={4} style={{ flexWrap: 'wrap' }}>
            {grouped.map((g) => (
              <PressScale key={g.emoji} onPress={() => onReact(g.emoji)} style={[styles.reaction, g.mine && styles.reactionMine]}>
                <Text style={{ fontSize: 13 }}>{g.emoji}</Text>
                <Text style={styles.reactionCount}>{g.count}</Text>
              </PressScale>
            ))}
          </Row>
        )}
      </View>
    </Row>
  );
}

function ChatImage({ path }: { path: string }) {
  const colors = useColors();
  const url = useSignedUrl('chat', path);
  return (
    <View style={{ width: 240, maxWidth: '100%', aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceHigh }}>
      {url ? <Image source={{ uri: url }} style={{ flex: 1 }} contentFit="cover" transition={200} /> : <ActivityIndicator style={{ flex: 1 }} color={colors.textMuted} />}
    </View>
  );
}

function WorkoutCard({ meta, mine }: { meta: WorkoutMeta; mine: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  const ink = mine ? colors.primaryText : colors.text;
  return (
    <View style={[styles.workout, mine && { borderColor: colors.overlay }]}>
      <Text style={[styles.workoutTitle, { color: ink }]}>{meta.title}</Text>
      <Row gap={spacing.md}>
        <Mono style={{ color: ink }}>{meta.minutes} dk</Mono>
        <Mono style={{ color: ink }}>{meta.sets} set</Mono>
        <Mono style={{ color: ink }}>{meta.volume.toLocaleString('tr-TR')} kg</Mono>
      </Row>
      {meta.exercises.slice(0, 5).map((e) => (
        <Row key={e.name} style={{ justifyContent: 'space-between', gap: spacing.md }}>
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.body, fontSize: 13, color: ink }}>
            {e.name}
          </Text>
          <Mono style={{ fontSize: 12, color: ink, opacity: 0.75 }}>{e.best}</Mono>
        </Row>
      ))}
      {meta.prs.map((p) => (
        <Text key={p} style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: mine ? colors.primaryText : colors.fat }}>
          🏆 {p}
        </Text>
      ))}
    </View>
  );
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.pill}>
      <Text style={[styles.pillText, { color }]}>{label === 'kcal' ? `${value} kcal` : `${label} ${value}g`}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xl * 2 },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm + 2,
    backgroundColor: colors.overlay,
  },
  pinned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.overlay,
  },
  pinnedText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.text },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  replyBar: { paddingLeft: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.accent },
  replyText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  attach: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  send: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: 6,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  bubbleCoach: { borderColor: colors.fat },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  username: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.textMuted },
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.text },
  time: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.textDim, alignSelf: 'flex-end' },
  quote: { borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: spacing.sm, gap: 2 },
  quoteUser: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.accentBright },
  quoteText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  workout: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm + 2, gap: 6, minWidth: 220 },
  workoutTitle: { fontFamily: fonts.display, fontSize: 18, letterSpacing: 0.3 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.surfaceHigh },
  pillText: { fontFamily: fonts.mono, fontSize: 11 },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reactionMine: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  reactionCount: { fontFamily: fonts.mono, fontSize: 11.5, color: colors.text },
  emojiBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md - 2 },
  actionText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
}));
