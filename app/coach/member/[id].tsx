import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { ProgramDaysEditor } from '@/components/ProgramEditor';
import { Avatar, Body, Button, Card, Input, Label, Mono, PressScale, Reveal, Row, Screen, Segmented, SkeletonList, TierBadge } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { DEFAULT_PROGRAM, type Program } from '@/lib/program';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { hasFeature, TIER_INFO, type Tier } from '@/lib/tiers';
import { useHabits } from '@/lib/habits';
import { locale, tx } from '@/lib/i18n';

type Member = { id: string; username: string | null; tier: Tier; role: string | null; created_at: string; avatar_url?: string | null };

export default function CoachMember() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isCoach } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [hasAssigned, setHasAssigned] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isCoach || !isSupabaseConfigured || !id) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setMember(data as Member));
    supabase
      .from('assigned_programs')
      .select('program')
      .eq('user_id', id)
      .maybeSingle()
      .then(({ data }) => {
        setHasAssigned(Boolean(data));
        setProgram(structuredClone((data?.program as Program | undefined) ?? DEFAULT_PROGRAM));
      });
  }, [id, isCoach]);

  async function setTier(tier: Tier) {
    if (!member) return;
    const { error } = await supabase.rpc('set_member_tier', { target: member.id, new_tier: tier });
    if (error) return setNotice(error.message);
    setMember({ ...member, tier });
    setNotice(tx('Paket {0} yapıldı.', [TIER_INFO[tier].name]));
  }

  async function save() {
    if (!program || !member) return;
    const clean: Program = { ...program, days: [...program.days].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7)) };
    const { error } = await supabase
      .from('assigned_programs')
      .upsert({ user_id: member.id, program: clean, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) return setNotice(error.message);
    setHasAssigned(true);
    setNotice('Program kaydedildi. Üye uygulamayı açınca görecek.');
  }

  async function unassign() {
    if (!member) return;
    const { error } = await supabase.from('assigned_programs').delete().eq('user_id', member.id);
    if (error) return setNotice(error.message);
    setHasAssigned(false);
    setProgram(structuredClone(DEFAULT_PROGRAM));
    setNotice('Atanan program kaldırıldı.');
  }

  if (!member || !program) {
    return (
      <Screen edges={[]}>
        <SkeletonList variant="detail" />
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: `@${member.username ?? 'üye'}`.toLocaleUpperCase(locale()) }} />
      <Reveal index={0}>
        <Card>
          <Row gap={spacing.md}>
            <Avatar name={member.username} path={member.avatar_url} size={56} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.text }}>@{member.username}</Text>
              <Mono style={{ fontSize: 12, color: colors.textMuted }}>{tx('Üye: {0}', [new Date(member.created_at).toLocaleDateString(locale(), { month: 'long', year: 'numeric' })])}</Mono>
            </View>
            <TierBadge tier={member.tier} />
          </Row>
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button
                title="Mesaj"
                variant="outline"
                icon={{ ios: 'bubble.left.fill', android: 'chat', web: 'chat' }}
                onPress={() => router.push({ pathname: '/dm/[member]', params: { member: member.id } })}
              />
            </View>
          </Row>
        </Card>
      </Reveal>

      <Reveal index={1}>
        <Card>
          <Label>Paket</Label>
          <Body muted style={{ fontSize: 12.5 }}>
            Ödeme sistemi açılana kadar paketleri buradan elle verebilirsin.
          </Body>
          <Segmented
            options={(['free', 'pro', 'plus', 'max'] as Tier[]).map((t) => ({ value: t, label: TIER_INFO[t].name }))}
            value={member.tier}
            onChange={setTier}
          />
        </Card>
      </Reveal>

      <Reveal index={2}>
        <NutritionEditor memberId={member.id} />
      </Reveal>

      <Reveal index={2}>
        <HabitsEditor memberId={member.id} tier={member.tier} />
      </Reveal>

      {notice && (
        <PressScale onPress={() => setNotice(null)}>
          <Card style={{ borderColor: colors.accent }}>
            <Body style={{ fontSize: 13.5 }}>{notice}</Body>
          </Card>
        </PressScale>
      )}

      <Reveal index={2}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>{hasAssigned ? 'Atanmış program' : 'Program ata (örnekten başla)'}</Label>
          {hasAssigned && (
            <PressScale onPress={unassign}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.danger }}>Kaldır</Text>
            </PressScale>
          )}
        </Row>
        <Card style={{ marginTop: spacing.sm }}>
          <Label>Program adı</Label>
          <Input value={program.name} onChangeText={(name) => setProgram({ ...program, name })} />
          <Label>Koç notu</Label>
          <Input value={program.note ?? ''} onChangeText={(note) => setProgram({ ...program, note })} placeholder="ör. Her hafta 2,5 kg ekle" multiline />
        </Card>
      </Reveal>

      <ProgramDaysEditor program={program} onChange={setProgram} />
      <Button title="Programı kaydet" arrow onPress={save} />
    </Screen>
  );
}

// Koçun atadığı günlük makro hedefi; üyenin kendi hesapladığı hedefin yerine geçer (0008).
// Günlük alışkanlıklar (Max): koç görev ekler ya da kaldırır, son 7 günde kaç gün yapıldığını görür.
function HabitsEditor({ memberId, tier }: { memberId: string; tier: Tier }) {
  const colors = useColors();
  const { habits, weekCount, reload } = useHabits(memberId);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const t = title.trim();
    if (!t) return;
    const { error: err } = await supabase.from('habits').insert({ user_id: memberId, title: t });
    if (err) return setError(/habits|schema cache/.test(err.message) ? "Sunucu güncel değil: 0019 SQL dosyasını Supabase'de çalıştır." : err.message);
    setError(null);
    setTitle('');
    reload();
  }

  async function remove(id: string) {
    await supabase.from('habits').delete().eq('id', id);
    reload();
  }

  return (
    <Card>
      <Label>Günlük alışkanlıklar</Label>
      {!hasFeature(tier, 'habits') && (
        <Body muted style={{ fontSize: 13 }}>
          Üye bu görevleri Max pakete geçince görür.
        </Body>
      )}
      {habits?.map((h) => (
        <Row key={h.id} style={{ justifyContent: 'space-between' }}>
          <Text raw style={{ flex: 1, fontFamily: fonts.body, fontSize: 14.5, color: colors.text }}>
            {h.title}
          </Text>
          <Mono style={{ color: colors.textMuted, fontSize: 12 }}>{tx('{0}/7 gün', [weekCount(h.id)])}</Mono>
          <PressScale onPress={() => remove(h.id)} style={{ paddingLeft: spacing.sm }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.danger }}>Kaldır</Text>
          </PressScale>
        </Row>
      ))}
      <Input value={title} onChangeText={setTitle} placeholder="ör. 10 bin adım, 3 litre su" maxLength={60} />
      {error && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger }}>{error}</Text>}
      <Button title="Görev ekle" variant="outline" disabled={!title.trim()} onPress={add} />
    </Card>
  );
}

function NutritionEditor({ memberId }: { memberId: string }) {
  const colors = useColors();
  const [form, setForm] = useState({ kcal: '', protein: '', carbs: '', fat: '', note: '' });
  const [has, setHas] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    supabase
      .from('assigned_nutrition')
      .select('kcal, protein, carbs, fat, note')
      .eq('user_id', memberId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setHas(true);
        setForm({ kcal: String(data.kcal), protein: String(data.protein), carbs: String(data.carbs), fat: String(data.fat), note: data.note ?? '' });
      });
  }, [memberId]);

  const n = (v: string) => Math.round(Number(v.replace(',', '.')));
  const fromMacros = n(form.protein) * 4 + n(form.carbs) * 4 + n(form.fat) * 9;

  async function save() {
    const row = { user_id: memberId, kcal: n(form.kcal), protein: n(form.protein), carbs: n(form.carbs), fat: n(form.fat), note: form.note.trim() || null, updated_at: new Date().toISOString() };
    if ([row.kcal, row.protein, row.carbs, row.fat].some((v) => !Number.isFinite(v))) return setMsg({ ok: false, text: 'Dört alanı da sayı olarak gir.' });
    const { error } = await supabase.from('assigned_nutrition').upsert(row, { onConflict: 'user_id' });
    if (error) {
      return setMsg({ ok: false, text: /assigned_nutrition|schema cache/.test(error.message) ? "Sunucu güncel değil: 0008 SQL dosyasını Supabase'de çalıştır." : error.message });
    }
    setHas(true);
    setMsg({ ok: true, text: 'Makro hedefi kaydedildi. Üye uygulamayı açınca hedefi bu olur.' });
  }

  async function remove() {
    const { error } = await supabase.from('assigned_nutrition').delete().eq('user_id', memberId);
    if (error) return setMsg({ ok: false, text: error.message });
    setHas(false);
    setForm({ kcal: '', protein: '', carbs: '', fat: '', note: '' });
    setMsg({ ok: true, text: 'Makro hedefi kaldırıldı; üye kendi hesapladığı hedefe döner.' });
  }

  const field = (key: 'kcal' | 'protein' | 'carbs' | 'fat', label: string) => (
    <View style={{ width: '48%', gap: 4 }}>
      <Mono style={{ fontSize: 12, color: colors.textMuted }}>{label}</Mono>
      <Input value={form[key]} onChangeText={(v) => setForm({ ...form, [key]: v })} keyboardType="number-pad" placeholder="–" />
    </View>
  );

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Label>Makro hedefi</Label>
        {has && (
          <PressScale onPress={remove}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.danger }}>Kaldır</Text>
          </PressScale>
        )}
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {field('kcal', 'Kalori')}
        {field('protein', 'Protein (g)')}
        {field('carbs', 'Karbonhidrat (g)')}
        {field('fat', 'Yağ (g)')}
      </View>
      {fromMacros > 0 && (
        <Mono style={{ fontSize: 12, color: colors.textMuted }}>{tx('Makrolardan: {0} kcal', [fromMacros.toLocaleString(locale())])}</Mono>
      )}
      <Input value={form.note} onChangeText={(note) => setForm({ ...form, note })} placeholder="Not (ör. Kesim, haftada 0,5 kg)" multiline maxLength={500} />
      {msg && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: msg.ok ? colors.success : colors.danger }}>{msg.text}</Text>}
      <Button title={has ? 'Hedefi güncelle' : 'Hedef ata'} variant="outline" onPress={save} />
    </Card>
  );
}
