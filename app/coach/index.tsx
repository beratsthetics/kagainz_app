import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Avatar, Body, Card, EmptyState, Input, Label, Mono, PressScale, Reveal, Row, Screen, Segmented, SkeletonList, Tag, TierBadge } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { exerciseById } from '@/lib/exercises';
import { FORM_CHECK_SELECT, type FormCheck } from '@/lib/formcheck';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { TIER_RANK, type Tier } from '@/lib/tiers';

type Tab = 'forms' | 'dms' | 'reports' | 'members';
type Report = {
  id: number;
  message_id: number | null;
  reported_user_id: string | null;
  body_snapshot: string | null;
  created_at: string;
  reported: { username: string | null } | null;
};
type Thread = { member_id: string; body: string; created_at: string; sender_id: string; member: { username: string | null; tier: Tier; avatar_url?: string | null } | null };
type Member = { id: string; username: string | null; tier: Tier; role: string | null; created_at: string; avatar_url?: string | null };

export default function CoachPanel() {
  const colors = useColors();
  const { isCoach, session } = useAuth();
  const [tab, setTab] = useState<Tab>('forms');
  const [forms, setForms] = useState<FormCheck[] | null>(null);
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!isCoach || !isSupabaseConfigured) return;
    supabase
      .from('form_checks')
      .select(FORM_CHECK_SELECT)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => setForms((data ?? []) as unknown as FormCheck[]));
    supabase
      .from('coach_messages')
      .select('member_id, body, created_at, sender_id, member:profiles!coach_messages_member_id_fkey(*)')
      .order('created_at', { ascending: false })
      .limit(400)
      .then(({ data }) => {
        // Her üyenin en son mesajı.
        const seen = new Set<string>();
        const out: Thread[] = [];
        for (const m of (data ?? []) as unknown as Thread[]) {
          if (seen.has(m.member_id)) continue;
          seen.add(m.member_id);
          out.push(m);
        }
        setThreads(out);
      });
    supabase
      .from('reports')
      .select('id, message_id, reported_user_id, body_snapshot, created_at, reported:profiles!reports_reported_user_id_fkey(username)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => setReports((data ?? []) as unknown as Report[]));
    supabase
      .from('profiles')
      .select('*')
      .not('username', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => setMembers((data ?? []) as Member[]));
  }, [isCoach]);

  const pending = forms?.filter((f) => f.status === 'pending') ?? [];
  const shownMembers = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('tr-TR');
    return (members ?? [])
      .filter((m) => !term || m.username?.includes(term))
      .sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier]);
  }, [members, q]);

  // Şikayet: mesajı sil / kullanıcıyı sustur / mesajı geri aç / kapat. Her işlemde şikayet kapanır.
  // 3 kişinin şikayet ettiği mesaj otomatik gizlenir (0004).
  async function moderate(r: Report, what: 'delete' | 'mute' | 'restore' | 'resolve') {
    if (what === 'delete' && r.message_id != null) await supabase.from('messages').delete().eq('id', r.message_id);
    if (what === 'restore' && r.message_id != null) await supabase.from('messages').update({ hidden: false }).eq('id', r.message_id);
    if (what === 'mute' && r.reported_user_id) await supabase.rpc('mute_user', { target: r.reported_user_id, minutes: 60 * 24 });
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', r.id);
    setReports((prev) => prev?.filter((x) => x.id !== r.id) ?? null);
  }

  if (!isCoach) {
    return (
      <Screen edges={[]}>
        <EmptyState icon={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} title="Sadece koçlar" body="Bu panel koç hesaplarına açık." />
      </Screen>
    );
  }

  const unanswered = threads?.filter((t) => t.sender_id === t.member_id).length ?? 0;

  return (
    <Screen edges={[]}>
      <Reveal index={0}>
        <Row gap={spacing.sm}>
          <StatBox label="Bekleyen form" value={pending.length} color={colors.fat} />
          <StatBox label="Yanıt bekleyen" value={unanswered} color={colors.accentBright} />
          <StatBox label="Üye" value={members?.length ?? 0} color={colors.text} />
        </Row>
      </Reveal>
      <Reveal index={1}>
        <Segmented
          options={[
            { value: 'forms', label: 'Form check' },
            { value: 'dms', label: 'Mesajlar' },
            { value: 'reports', label: `Şikayet${reports?.length ? ` (${reports.length})` : ''}` },
            { value: 'members', label: 'Üyeler' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </Reveal>

      {tab === 'forms' &&
        (forms == null ? (
          <SkeletonList />
        ) : forms.length === 0 ? (
          <EmptyState icon={{ ios: 'video.fill', android: 'videocam', web: 'videocam' }} title="Video yok" />
        ) : (
          [...pending, ...forms.filter((f) => f.status !== 'pending')].map((f) => (
            <PressScale key={f.id} onPress={() => router.push({ pathname: '/form-check/[id]', params: { id: f.id } })}>
              <Card>
                <Row gap={spacing.sm}>
                  <Avatar name={f.profiles?.username} path={f.profiles?.avatar_url} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text }}>
                      {exerciseById(f.exercise_id)?.trName ?? f.exercise_id}
                    </Text>
                    <Mono style={{ fontSize: 12, color: colors.textMuted }}>
                      @{f.profiles?.username ?? ''} · {new Date(f.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </Mono>
                  </View>
                  {f.status === 'pending' ? (
                    <Tag color={colors.fat} bg={colors.surfaceHigh}>
                      Bekliyor
                    </Tag>
                  ) : (
                    <Tag color={colors.success} bg={colors.successSoft}>
                      Bitti
                    </Tag>
                  )}
                </Row>
              </Card>
            </PressScale>
          ))
        ))}

      {tab === 'dms' &&
        (threads == null ? (
          <SkeletonList />
        ) : threads.length === 0 ? (
          <EmptyState icon={{ ios: 'bubble.left.and.bubble.right', android: 'forum', web: 'forum' }} title="Mesaj yok" body="Max üyeler yazınca burada görünür." />
        ) : (
          threads.map((t) => (
            <PressScale key={t.member_id} onPress={() => router.push({ pathname: '/dm/[member]', params: { member: t.member_id } })}>
              <Card>
                <Row gap={spacing.sm}>
                  <Avatar name={t.member?.username} path={t.member?.avatar_url} size={36} />
                  <View style={{ flex: 1 }}>
                    <Row gap={6}>
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text }}>@{t.member?.username ?? 'üye'}</Text>
                      {t.sender_id === t.member_id && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />}
                    </Row>
                    <Body muted numberOfLines={1} style={{ fontSize: 13 }}>
                      {t.sender_id === session?.user.id ? 'Sen: ' : ''}
                      {t.body}
                    </Body>
                  </View>
                  <Mono style={{ fontSize: 11, color: colors.textMuted }}>
                    {new Date(t.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                  </Mono>
                </Row>
              </Card>
            </PressScale>
          ))
        ))}

      {tab === 'reports' &&
        (reports == null ? (
          <SkeletonList />
        ) : reports.length === 0 ? (
          <EmptyState icon={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }} title="Açık şikayet yok" />
        ) : (
          reports.map((r) => (
            <Card key={r.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text }}>@{r.reported?.username ?? 'silinmiş'}</Text>
                <Mono style={{ fontSize: 11.5, color: colors.textMuted }}>
                  {new Date(r.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Mono>
              </Row>
              <Body style={{ fontSize: 14 }}>“{r.body_snapshot ?? '...'}”</Body>
              <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
                {r.message_id != null && <ReportAction label="Mesajı sil" danger onPress={() => moderate(r, 'delete')} />}
                {r.reported_user_id && <ReportAction label="24 saat sustur" onPress={() => moderate(r, 'mute')} />}
                {r.message_id != null && <ReportAction label="Sorun yok, geri aç" onPress={() => moderate(r, 'restore')} />}
                <ReportAction label="Kapat" onPress={() => moderate(r, 'resolve')} />
              </Row>
            </Card>
          ))
        ))}

      {tab === 'members' && (
        <>
          <Input value={q} onChangeText={setQ} placeholder="Kullanıcı adı ara" autoCapitalize="none" />
          {members == null ? (
            <SkeletonList />
          ) : (
            shownMembers.slice(0, 100).map((m) => (
              <PressScale key={m.id} onPress={() => router.push({ pathname: '/coach/member/[id]', params: { id: m.id } })}>
                <Card style={{ paddingVertical: spacing.sm + 2 }}>
                  <Row gap={spacing.sm}>
                    <Avatar name={m.username} path={m.avatar_url} size={32} />
                    <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text }}>@{m.username}</Text>
                    {m.role === 'coach' && (
                      <Tag color={colors.primaryText} bg={colors.fat}>
                        Koç
                      </Tag>
                    )}
                    <TierBadge tier={m.tier} />
                  </Row>
                </Card>
              </PressScale>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card style={{ flex: 1, gap: 2, paddingVertical: spacing.sm + 2 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 26, color }}>{value}</Text>
      <Label>{label}</Label>
    </Card>
  );
}

function ReportAction({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  const colors = useColors();
  return (
    <PressScale onPress={onPress}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: danger ? colors.danger : colors.accentBright }}>{label}</Text>
    </PressScale>
  );
}
