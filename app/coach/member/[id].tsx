import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import {
  Avatar,
  Body,
  Button,
  Card,
  Chip,
  Icon,
  Input,
  Label,
  Mono,
  PressScale,
  Reveal,
  Row,
  Screen,
  Segmented,
  Sheet,
  SkeletonList,
  Stepper,
  TierBadge,
} from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { EXERCISES, exerciseById, GROUPS, MUSCLES, type Muscle } from '@/lib/exercises';
import { DEFAULT_PROGRAM, WEEKDAYS, type Program, type ProgramDay } from '@/lib/program';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { makeStyles, useColors } from '@/lib/theme';
import { TIER_INFO, type Tier } from '@/lib/tiers';

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
    setNotice(`Paket ${TIER_INFO[tier].name} yapıldı.`);
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

  const patchDay = (i: number, fn: (d: ProgramDay) => ProgramDay) =>
    setProgram((p) => (p ? { ...p, days: p.days.map((d, j) => (j === i ? fn(d) : d)) } : p));

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: `@${member.username ?? 'üye'}`.toLocaleUpperCase('tr-TR') }} />
      <Reveal index={0}>
        <Card>
          <Row gap={spacing.md}>
            <Avatar name={member.username} path={member.avatar_url} size={56} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.text }}>@{member.username}</Text>
              <Mono style={{ fontSize: 12, color: colors.textMuted }}>
                Üye: {new Date(member.created_at).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
              </Mono>
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

      {program.days.map((d, i) => (
        <DayEditor
          key={`${i}-${d.weekday}`}
          day={d}
          onChange={(fn) => patchDay(i, fn)}
          onRemove={() => setProgram({ ...program, days: program.days.filter((_, j) => j !== i) })}
          taken={program.days.filter((_, j) => j !== i).map((x) => x.weekday)}
        />
      ))}

      <Button
        title="Gün ekle"
        variant="outline"
        icon={{ ios: 'plus', android: 'add', web: 'add' }}
        disabled={program.days.length >= 7}
        onPress={() => {
          const used = program.days.map((x) => x.weekday);
          const wd = [1, 2, 3, 4, 5, 6, 0].find((w) => !used.includes(w)) ?? 1;
          setProgram({ ...program, days: [...program.days, { ...WEEKDAYS[wd], weekday: wd, focus: 'Tüm vücut', exercises: [] }] });
        }}
      />
      <Button title="Programı kaydet" arrow onPress={save} />
    </Screen>
  );
}

function DayEditor({
  day,
  onChange,
  onRemove,
  taken,
}: {
  day: ProgramDay;
  onChange: (fn: (d: ProgramDay) => ProgramDay) => void;
  onRemove: () => void;
  taken: number[];
}) {
  const colors = useColors();
  const styles = useStyles();
  const [picking, setPicking] = useState(false);
  const [group, setGroup] = useState<(typeof GROUPS)[number]>(GROUPS[0]);
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.text }}>{day.day}</Text>
        <PressScale onPress={onRemove}>
          <Icon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={18} color={colors.danger} />
        </PressScale>
      </Row>
      <Row gap={4} style={{ flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5, 6, 0].map((w) => (
          <Chip
            key={w}
            label={WEEKDAYS[w].short}
            active={day.weekday === w}
            onPress={() => !taken.includes(w) && onChange((d) => ({ ...d, weekday: w, ...WEEKDAYS[w] }))}
          />
        ))}
      </Row>
      <Input value={day.focus} onChangeText={(focus) => onChange((d) => ({ ...d, focus }))} placeholder="Odak (ör. Göğüs)" />
      {day.exercises.map((e, j) => (
        <View key={`${e.exerciseId}-${j}`} style={styles.exRow}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text }}>
              {exerciseById(e.exerciseId)?.trName ?? e.exerciseId}
            </Text>
            <PressScale onPress={() => onChange((d) => ({ ...d, exercises: d.exercises.filter((_, k) => k !== j) }))}>
              <Icon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={14} color={colors.textMuted} />
            </PressScale>
          </Row>
          <Row gap={spacing.sm} style={{ justifyContent: 'space-between' }}>
            <Stepper
              value={e.sets}
              min={1}
              max={10}
              suffix="set"
              onChange={(sets) => onChange((d) => ({ ...d, exercises: d.exercises.map((x, k) => (k === j ? { ...x, sets } : x)) }))}
            />
            <View style={{ width: 96 }}>
              <Input
                value={e.reps}
                onChangeText={(reps) => onChange((d) => ({ ...d, exercises: d.exercises.map((x, k) => (k === j ? { ...x, reps } : x)) }))}
                placeholder="8-10"
              />
            </View>
          </Row>
        </View>
      ))}
      <Button title="Hareket ekle" variant="ghost" icon={{ ios: 'plus', android: 'add', web: 'add' }} onPress={() => setPicking(true)} />

      <Sheet visible={picking} onClose={() => setPicking(false)} title="Hareket seç">
        <Row gap={4} style={{ flexWrap: 'wrap' }}>
          {GROUPS.map((g) => (
            <Chip key={g} label={g} active={group === g} onPress={() => setGroup(g)} />
          ))}
        </Row>
        {EXERCISES.filter((x) => exerciseGroup(x.primary[0]) === group).map((x) => (
          <PressScale
            key={x.id}
            onPress={() => {
              onChange((d) => ({ ...d, exercises: [...d.exercises, { exerciseId: x.id, sets: 3, reps: '8-12' }] }));
              setPicking(false);
            }}
            style={styles.pickRow}>
            <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text }}>{x.trName}</Text>
            <Mono style={{ fontSize: 11.5, color: colors.textMuted }}>{x.equipment}</Mono>
          </PressScale>
        ))}
      </Sheet>
    </Card>
  );
}

function exerciseGroup(m: Muscle) {
  return MUSCLES[m].group;
}

const useStyles = makeStyles((colors) => ({
  exRow: { gap: spacing.sm, padding: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.surfaceHigh },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.border },
}));
