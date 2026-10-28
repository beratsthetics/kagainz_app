import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Text } from '@/components/T';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, GridBackground, Icon, Input, LockedCard, PressScale, Row, Screen, SkeletonList } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { makeStyles, useColors } from '@/lib/theme';
import { hasFeature } from '@/lib/tiers';
import { locale, tx } from '@/lib/i18n';

// Max üyesi ile koçlar arasındaki birebir mesajlaşma. Her üyenin tek bir konuşması vardır;
// üye kendi konuşmasını "me" ile açar, koç ise üyenin kimliğiyle.
type DM = { id: number; member_id: string; sender_id: string; body: string; created_at: string; profiles: { username: string | null; role: string | null } | null };

export default function DirectMessages() {
  const colors = useColors();
  const styles = useStyles();
  const { member } = useLocalSearchParams<{ member: string }>();
  const { session, tier, isCoach } = useAuth();
  const memberId = member === 'me' ? session?.user.id : member;
  const [items, setItems] = useState<DM[] | null>(null);
  const [title, setTitle] = useState(isCoach && member !== 'me' ? 'ÜYE' : 'KOÇUN');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const list = useRef<FlatList<DM>>(null);
  const allowed = isCoach || hasFeature(tier, 'coach_dm');

  useEffect(() => {
    if (!memberId || !isSupabaseConfigured || !allowed) return;
    const select = 'id, member_id, sender_id, body, created_at, profiles:profiles!coach_messages_sender_id_fkey(username, role)';
    supabase
      .from('coach_messages')
      .select(select)
      .eq('member_id', memberId)
      .order('created_at', { ascending: true })
      .limit(300)
      .then(({ data }) => setItems((data ?? []) as unknown as DM[]));
    if (isCoach && member !== 'me') {
      supabase
        .from('profiles')
        .select('username')
        .eq('id', memberId)
        .single()
        .then(({ data }) => data?.username && setTitle(`@${data.username}`.toLocaleUpperCase(locale())));
    }
    const channel = supabase
      .channel(`dm:${memberId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coach_messages', filter: `member_id=eq.${memberId}` }, async (p) => {
        const { data } = await supabase.from('coach_messages').select(select).eq('id', p.new.id).single();
        if (data) setItems((prev) => (prev?.some((x) => x.id === (data as unknown as DM).id) ? prev : [...(prev ?? []), data as unknown as DM]));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [memberId, member, isCoach, allowed]);

  if (!allowed) {
    return (
      <Screen edges={[]}>
        <LockedCard
          tier="max"
          title="Koçla birebir"
          body="Programını, öğünlerini ve formunu koçunla birebir konuş."
          preview={[['Koçun', '14:02'], ['Sen', '14:05'], ['Koçun', '14:07']]}
          onPress={() => router.push('/plans')}
        />
      </Screen>
    );
  }

  async function send() {
    const body = text.trim();
    if (!body || !session || !memberId) return;
    setError(null);
    const { error: err } = await supabase.from('coach_messages').insert({ member_id: memberId, sender_id: session.user.id, body });
    if (err) return setError(err.message);
    setText('');
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <GridBackground glow={false} />
      <Stack.Screen options={{ title }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
          {items == null ? (
            <View style={{ flex: 1, padding: spacing.md }}>
              <SkeletonList variant="chat" count={5} />
            </View>
          ) : (
            <FlatList
              ref={list}
              data={items}
              keyExtractor={(m) => String(m.id)}
              contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, flexGrow: 1 }}
              onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <Body muted style={{ textAlign: 'center', marginTop: spacing.xl }}>
                  {isCoach ? 'Üyeye ilk mesajı yaz.' : 'Koçuna merhaba de. Genelde aynı gün içinde döner.'}
                </Body>
              }
              renderItem={({ item }) => {
                const mine = item.sender_id === session?.user.id;
                const coach = item.profiles?.role === 'coach';
                return (
                  <View style={[styles.bubble, mine ? styles.mine : styles.other]}>
                    {!mine && <Text style={styles.name}>{coach ? tx('Koç @{0}', [item.profiles?.username ?? '']) : `@${item.profiles?.username ?? ''}`}</Text>}
                    <Text raw style={[styles.text, mine && { color: colors.primaryText }]}>{item.body}</Text>
                    <Text style={[styles.time, mine && { color: colors.primaryText, opacity: 0.55 }]}>
                      {new Date(item.created_at).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                );
              }}
            />
          )}
          <View style={styles.composer}>
            <Row gap={spacing.sm} style={{ alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Input value={text} onChangeText={setText} placeholder="Mesaj yaz..." multiline maxLength={2000} style={{ maxHeight: 120 }} />
              </View>
              <PressScale onPress={send} disabled={!text.trim()} style={[styles.send, !text.trim() && { opacity: 0.4 }]}>
                <Icon name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }} size={20} color={colors.primaryText} />
              </PressScale>
            </Row>
            {error && <Text style={{ fontFamily: fonts.bodyBold, color: colors.danger }}>{error}</Text>}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  bubble: { maxWidth: '82%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  other: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 },
  name: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.fat },
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.text },
  time: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.textDim, alignSelf: 'flex-end' },
  composer: { borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md, gap: spacing.sm, backgroundColor: colors.overlay },
  send: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
}));
