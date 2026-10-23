import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
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
  Tag,
  type IconName,
} from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useAuth, useJoinStep } from '@/lib/auth';
import { parseMeal, sumMacros, type Macros } from '@/lib/macros';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type Kind = 'text' | 'meal' | 'workout' | 'activity';
type Message = {
  id: number;
  body: string;
  kind: Kind;
  macros: Macros | null;
  created_at: string;
  user_id: string;
  profiles: { username: string | null } | null;
};

const KINDS: { kind: Kind; label: string; icon: IconName; placeholder: string }[] = [
  {
    kind: 'text',
    label: 'Mesaj',
    icon: { ios: 'text.bubble', android: 'chat', web: 'chat' },
    placeholder: 'Bir şey paylaş...',
  },
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

const ROOM_NAMES: Record<string, string> = { genel: 'GENEL', pro: 'PRO KULÜP', plus: 'PLUS KULÜP' };

export default function ChatRoomScreen() {
  const { room } = useLocalSearchParams<{ room: string }>();
  const { session, canPost } = useAuth();
  const join = useJoinStep();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<Kind>('text');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useRef<FlatList<Message>>(null);
  const preview = useMemo(() => sumMacros(parseMeal(text)), [text]);

  useEffect(() => {
    if (!isSupabaseConfigured || !room) return;
    const select = 'id, body, kind, macros, created_at, user_id, profiles(username)';

    supabase
      .from('messages')
      .select(select)
      .eq('room_id', room)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setMessages(((data ?? []) as unknown as Message[]).reverse()));

    const channel = supabase
      .channel(`room:${room}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` },
        async (payload) => {
          const { data } = await supabase.from('messages').select(select).eq('id', payload.new.id).single();
          if (data) setMessages((m) => [...m, data as unknown as Message]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [room]);

  async function send() {
    const body = text.trim();
    if (!body || !session) return;
    setSending(true);
    setError(null);
    // Öğün paylaşımında makrolar otomatik hesaplanıp mesaja eklenir.
    const macros = kind === 'meal' ? sumMacros(parseMeal(body)) : null;
    const { error: err } = await supabase
      .from('messages')
      .insert({ room_id: room, user_id: session.user.id, body, kind, macros });
    setSending(false);
    if (err) return setError(err.message);
    setText('');
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <GridBackground glow={false} />
      <Stack.Screen options={{ title: ROOM_NAMES[room ?? ''] ?? 'CHAT', headerTransparent: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={90}>
          <FlatList
            ref={list}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={{ padding: spacing.md, gap: spacing.md, flexGrow: 1 }}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.empty}>
                <IconBox
                  name={{ ios: 'bubble.left.and.bubble.right.fill', android: 'forum', web: 'forum' }}
                  color={colors.accentBright}
                  bg={colors.accentSoft}
                  size={64}
                />
                <Heading style={{ textAlign: 'center' }}>
                  {isSupabaseConfigured ? 'İlk paylaşımı sen yap' : 'Bağlantı bekleniyor'}
                </Heading>
                <Body muted style={{ textAlign: 'center', maxWidth: 280 }}>
                  {isSupabaseConfigured
                    ? 'Bugün ne yedin, nasıl antrenman yaptın? Topluluğa anlat.'
                    : 'Sunucu bağlantısı henüz ayarlanmadı.'}
                </Body>
              </View>
            }
            renderItem={({ item }) => <MessageBubble message={item} mine={item.user_id === session?.user.id} />}
          />

          {canPost ? (
            <View style={styles.composer}>
              <Row gap={spacing.xs}>
                {KINDS.map((k) => (
                  <Chip
                    key={k.kind}
                    label={k.label}
                    icon={k.icon}
                    active={kind === k.kind}
                    onPress={() => setKind(k.kind)}
                  />
                ))}
              </Row>
              {kind === 'meal' && preview.kcal > 0 && (
                <Mono style={{ color: colors.textMuted, fontSize: 12 }}>
                  ≈ {preview.kcal} kcal · <Text style={{ color: colors.protein }}>P {preview.protein}</Text> ·{' '}
                  <Text style={{ color: colors.carb }}>K {preview.carb}</Text> ·{' '}
                  <Text style={{ color: colors.fat }}>Y {preview.fat}</Text>
                </Mono>
              )}
              <Row gap={spacing.sm} style={{ alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Input
                    value={text}
                    onChangeText={setText}
                    placeholder={KINDS.find((k) => k.kind === kind)?.placeholder}
                    multiline
                    style={{ maxHeight: 120 }}
                  />
                </View>
                <PressScale
                  onPress={send}
                  disabled={sending || !text.trim()}
                  style={[styles.send, !text.trim() && { opacity: 0.4 }]}>
                  <Icon
                    name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }}
                    size={20}
                    color={colors.primaryText}
                  />
                </PressScale>
              </Row>
              {error && <Label style={{ color: colors.danger }}>{error}</Label>}
            </View>
          ) : (
            <View style={styles.composer}>
              <Row gap={spacing.sm}>
                <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={16} color={colors.textMuted} />
                <Body muted style={{ flex: 1, fontSize: 13.5 }}>
                  {join?.hint}
                </Body>
              </Row>
              <Button title={join?.title ?? ''} arrow onPress={() => join && router.push(join.href)} />
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  const meta = KINDS.find((k) => k.kind === message.kind);
  const time = new Date(message.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return (
    <Row gap={spacing.sm} style={{ alignItems: 'flex-end', flexDirection: mine ? 'row-reverse' : 'row' }}>
      {!mine && <Avatar name={message.profiles?.username} size={32} />}
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        <Row style={{ justifyContent: 'space-between', gap: spacing.md }}>
          {!mine && <Text style={styles.username}>@{message.profiles?.username ?? 'anonim'}</Text>}
          {message.kind !== 'text' && meta && (
            <Tag
              color={mine ? colors.primaryText : colors.accentBright}
              bg={mine ? 'rgba(0,0,0,0.08)' : colors.accentSoft}>
              {meta.label}
            </Tag>
          )}
        </Row>
        <Text style={[styles.text, mine && { color: colors.primaryText }]}>{message.body}</Text>
        {message.macros && (
          <Row gap={6} style={{ flexWrap: 'wrap', marginTop: 4 }}>
            <MacroPill label="kcal" value={message.macros.kcal} color={mine ? colors.primaryText : colors.text} />
            <MacroPill label="P" value={message.macros.protein} color={colors.protein} />
            <MacroPill label="K" value={message.macros.carb} color={colors.carb} />
            <MacroPill label="Y" value={message.macros.fat} color={colors.fat} />
          </Row>
        )}
        <Text style={[styles.time, mine && { color: 'rgba(8,9,11,0.5)' }]}>{time}</Text>
      </View>
    </Row>
  );
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.pill}>
      <Text style={[styles.pillText, { color }]}>{label === 'kcal' ? `${value} kcal` : `${label} ${value}g`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xl * 2 },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm + 2,
    backgroundColor: 'rgba(8,9,11,0.96)',
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
    maxWidth: '80%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: 4,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  username: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.textMuted },
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.text },
  time: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.textDim, alignSelf: 'flex-end' },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(127,127,140,0.16)' },
  pillText: { fontFamily: fonts.mono, fontSize: 11 },
});
