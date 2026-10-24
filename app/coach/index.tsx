import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { Avatar, Body, Card, EmptyState, Icon, IconBox, Input, Label, Mono, PressScale, Reveal, Row, Screen, SkeletonList, Tag, TierBadge, type IconName } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { exerciseById } from '@/lib/exercises';
import { CHECKIN_SELECT, fmt, weekTitle, type Checkin } from '@/lib/checkins';
import { FORM_CHECK_SELECT, type FormCheck } from '@/lib/formcheck';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { TIER_RANK, type Tier } from '@/lib/tiers';
import { locale, tx } from '@/lib/i18n';

type Tab = 'forms' | 'checkins' | 'dms' | 'reports' | 'members';
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
  const [checkins, setCheckins] = useState<Checkin[] | null>(null);
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
    // Koç Plus ve Max üyelerin check-in'lerine yorum yazar.
    supabase
      .from('checkins')
      .select(CHECKIN_SELECT)
      .order('created_at', { ascending: false })
      .limit(150)
      .then(({ data }) =>
        setCheckins(((data ?? []) as Checkin[]).filter((c) => c.profiles && TIER_RANK[c.profiles.tier] >= TIER_RANK.plus)),
      );
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
  const waitingCheckins = checkins?.filter((c) => !c.coach_note).length ?? 0;
  const paid = members?.filter((m) => m.tier !== 'free').length ?? 0;
  const todo = pending.length + unanswered + waitingCheckins + (reports?.length ?? 0);
  const TITLES: Record<Tab, string> = { forms: 'Form check videoları', checkins: "Check-in'ler", dms: 'Mesajlar', reports: 'Şikayetler', members: 'Üyeler' };

  return (
    <Screen edges={[]}>
      {/* Özet: bugün bekleyen işler ve üye sayıları. Kutucuğa dokununca alttaki liste o konuya geçer. */}
      <Reveal index={0}>
        <View style={{ gap: 4, paddingTop: spacing.xs }}>
          <Label>{new Date().toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })}</Label>
          <Text style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.text }}>
            {todo ? tx('{0} iş seni bekliyor', [todo]) : tx('Her şey yolunda')}
          </Text>
        </View>
      </Reveal>

      <Reveal index={1}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 4 }}>
          <Kpi tab="forms" active={tab} onPress={setTab} icon={{ ios: 'video.fill', android: 'videocam', web: 'videocam' }} label="Bekleyen form" value={pending.length} color={colors.fat} />
          <Kpi tab="dms" active={tab} onPress={setTab} icon={{ ios: 'bubble.left.fill', android: 'chat', web: 'chat' }} label="Yanıt bekleyen" value={unanswered} color={colors.accentBright} />
          <Kpi tab="checkins" active={tab} onPress={setTab} icon={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} label="Bekleyen check-in" value={waitingCheckins} color={colors.success} />
          <Kpi tab="reports" active={tab} onPress={setTab} icon={{ ios: 'exclamationmark.shield.fill', android: 'report', web: 'report' }} label="Açık şikayet" value={reports?.length ?? 0} color={colors.danger} />
          <Kpi
            tab="members"
            active={tab}
            onPress={setTab}
            icon={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
            label="Üye"
            value={members?.length ?? 0}
            sub={tx('{0} ücretli', [paid])}
            color="#A78BFA"
            wide
          />
        </View>
      </Reveal>

      <Reveal index={2}>
        <Row gap={spacing.sm + 4}>
          <Shortcut
            icon={{ ios: 'list.bullet.rectangle.fill', android: 'view_list', web: 'view_list' }}
            title="Şablonlar"
            sub="3-6 günlük programlar"
            onPress={() => router.push('/coach/templates')}
          />
          <Shortcut
            icon={{ ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' }}
            title="Hareketler"
            sub="Video yükle, düzenle"
            onPress={() => router.push('/library')}
          />
        </Row>
      </Reveal>

      <Reveal index={3}>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.text, marginTop: spacing.sm }}>{tx(TITLES[tab])}</Text>
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
                      @{f.profiles?.username ?? ''} · {new Date(f.created_at).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })}
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

      {tab === 'checkins' &&
        (checkins == null ? (
          <SkeletonList />
        ) : checkins.length === 0 ? (
          <EmptyState icon={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} title="Check-in yok" body="Plus ve Max üyeler haftalık check-in gönderince burada görünür." />
        ) : (
          [...checkins.filter((c) => !c.coach_note), ...checkins.filter((c) => c.coach_note)].map((c) => (
            <PressScale key={c.id} onPress={() => router.push({ pathname: '/checkin/[id]', params: { id: c.id } })}>
              <Card>
                <Row gap={spacing.sm}>
                  <Avatar name={c.profiles?.username} path={c.profiles?.avatar_url} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text }}>@{c.profiles?.username ?? 'üye'}</Text>
                    <Mono style={{ fontSize: 12, color: colors.textMuted }}>{tx('{0} · {1} kg{2}', [weekTitle(c.week_start), fmt(c.weight), c.photos.length ? ` · ${c.photos.length} foto` : ''])}</Mono>
                  </View>
                  {c.coach_note ? (
                    <Tag color={colors.success} bg={colors.successSoft}>
                      Bitti
                    </Tag>
                  ) : (
                    <Tag color={colors.fat} bg={colors.surfaceHigh}>
                      Bekliyor
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
                    {new Date(t.created_at).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })}
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
                  {new Date(r.created_at).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
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

// Özet kutucuğu: sayı, başlık ve dokununca açılan liste.
function Kpi({
  tab,
  active,
  onPress,
  icon,
  label,
  value,
  sub,
  color,
  wide,
}: {
  tab: Tab;
  active: Tab;
  onPress: (t: Tab) => void;
  icon: IconName;
  label: string;
  value: number;
  sub?: string;
  color: string;
  wide?: boolean;
}) {
  const colors = useColors();
  const on = tab === active;
  return (
    <View style={{ width: wide ? '100%' : '46%', flexGrow: 1 }}>
      <PressScale onPress={() => onPress(tab)}>
      <Card style={[{ gap: spacing.sm, padding: spacing.md }, on && { borderColor: color, backgroundColor: `${color}12` }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconBox name={icon} color={color} bg={`${color}22`} size={38} />
          {value > 0 && tab !== 'members' && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />}
        </Row>
        <Row gap={spacing.sm} style={{ alignItems: 'baseline' }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.text }}>{value}</Text>
          {sub && <Mono style={{ fontSize: 12, color: colors.textMuted }}>{sub}</Mono>}
        </Row>
        <Label>{label}</Label>
      </Card>
      </PressScale>
    </View>
  );
}

function Shortcut({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <PressScale flex onPress={onPress}>
      <Card style={{ gap: spacing.sm, padding: spacing.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconBox name={icon} color={colors.accentBright} bg={colors.accentSoft} size={38} />
          <Icon name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }} size={14} color={colors.textDim} />
        </Row>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text }}>{title}</Text>
        <Body muted style={{ fontSize: 12.5 }}>
          {sub}
        </Body>
      </Card>
    </PressScale>
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
