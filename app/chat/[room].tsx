import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Input, Label, Mono } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
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

const KINDS: { kind: Kind; label: string }[] = [
  { kind: 'text', label: 'Mesaj' },
  { kind: 'meal', label: 'Öğün' },
  { kind: 'workout', label: 'Antrenman' },
  { kind: 'activity', label: 'Aktivite' },
];

const ROOM_NAMES: Record<string, string> = { genel: 'GENEL', pro: 'PRO KULÜP', plus: 'PLUS KULÜP' };

export default function ChatRoomScreen() {
  const { room } = useLocalSearchParams<{ room: string }>();
  const { session, canPost } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<Kind>('text');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useRef<FlatList<Message>>(null);

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` }, async (payload) => {
        const { data } = await supabase.from('messages').select(select).eq('id', payload.new.id).single();
        if (data) setMessages((m) => [...m, data as unknown as Message]);
      })
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <Stack.Screen options={{ title: ROOM_NAMES[room ?? ''] ?? 'CHAT' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Body muted style={{ textAlign: 'center', marginTop: spacing.xl }}>
              {isSupabaseConfigured ? 'Henüz mesaj yok. İlk paylaşımı sen yap!' : 'Sunucu bağlantısı henüz ayarlanmadı.'}
            </Body>
          }
          renderItem={({ item }) => <MessageBubble message={item} mine={item.user_id === session?.user.id} />}
        />

        {canPost ? (
          <View style={styles.composer}>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              {KINDS.map((k) => (
                <Pressable key={k.kind} onPress={() => setKind(k.kind)} style={[styles.chip, kind === k.kind && styles.chipActive]}>
                  <Text style={[styles.chipText, kind === k.kind && { color: colors.primaryText }]}>{k.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
              <Input
                value={text}
                onChangeText={setText}
                placeholder={kind === 'meal' ? 'ör. 3 yumurta, 100g yulaf' : 'Bir şey paylaş...'}
                multiline
                style={{ flex: 1, maxHeight: 120 }}
              />
              <Button title="Gönder" onPress={send} loading={sending} />
            </View>
            {error && <Label style={{ color: colors.danger }}>{error}</Label>}
          </View>
        ) : (
          <View style={styles.composer}>
            <Body muted>Yazmak için numaranı doğrula ve bir kullanıcı adı seç.</Body>
            <Button title={session ? 'Kullanıcı adı seç' : 'Numaramı doğrula'} onPress={() => router.push(session ? '/auth/username' : '/auth/phone')} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  const kindLabel = KINDS.find((k) => k.kind === message.kind)?.label;
  return (
    <View style={[styles.bubble, mine && { borderColor: colors.textMuted }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.username}>@{message.profiles?.username ?? 'anonim'}</Text>
        {message.kind !== 'text' && <Label>{kindLabel}</Label>}
      </View>
      <Body>{message.body}</Body>
      {message.macros && (
        <Mono style={{ color: colors.textMuted }}>
          {message.macros.kcal} kcal · P {message.macros.protein}g · K {message.macros.carb}g · Y {message.macros.fat}g
        </Mono>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
  bubble: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    gap: 4,
  },
  username: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
});
