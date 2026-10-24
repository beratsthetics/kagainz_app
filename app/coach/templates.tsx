import { useEffect, useState } from 'react';
import { Text } from '@/components/T';

import { ProgramDaysEditor } from '@/components/ProgramEditor';
import { Body, Button, Card, EmptyState, Input, Label, PressScale, Reveal, Row, Screen, Segmented, SkeletonList, Tag } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { tx } from '@/lib/i18n';
import { starterTemplate, TEMPLATE_DAYS, type Program } from '@/lib/program';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';

// Koçun hazır antrenman şablonları (3, 4, 5, 6 gün). Ücretli üyeler Antrenman sekmesinden seçer.
export default function CoachTemplates() {
  const colors = useColors();
  const { isCoach } = useAuth();
  const [saved, setSaved] = useState<Record<number, Program> | null>(null);
  const [days, setDays] = useState(3);
  const [program, setProgram] = useState<Program>(() => starterTemplate(3));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!isCoach || !isSupabaseConfigured) return;
    supabase
      .from('program_templates')
      .select('days, program')
      .then(({ data, error }) => {
        if (error) setMsg({ ok: false, text: serverError(error.message) });
        const all = Object.fromEntries((data ?? []).map((r) => [r.days, r.program as Program]));
        setSaved(all);
        setProgram(structuredClone(all[3] ?? starterTemplate(3)));
      });
  }, [isCoach]);

  function pick(d: number) {
    setDays(d);
    setMsg(null);
    setProgram(structuredClone(saved?.[d] ?? starterTemplate(d)));
  }

  async function save() {
    const clean: Program = { ...program, days: [...program.days].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7)) };
    if (clean.days.some((d) => d.exercises.length === 0)) return setMsg({ ok: false, text: 'Her güne en az bir hareket ekle.' });
    const { error } = await supabase.from('program_templates').upsert({ days, program: clean, updated_at: new Date().toISOString() }, { onConflict: 'days' });
    if (error) return setMsg({ ok: false, text: serverError(error.message) });
    setSaved({ ...saved, [days]: clean });
    setProgram(clean);
    setMsg({ ok: true, text: 'Şablon kaydedildi. Pro, Plus ve Max üyeler Antrenman sekmesinden seçebilir.' });
  }

  async function remove() {
    const { error } = await supabase.from('program_templates').delete().eq('days', days);
    if (error) return setMsg({ ok: false, text: error.message });
    const rest = { ...saved };
    delete rest[days];
    setSaved(rest);
    setProgram(starterTemplate(days));
    setMsg({ ok: true, text: 'Şablon kaldırıldı; üyeler artık bunu seçemez.' });
  }

  if (!isCoach) {
    return (
      <Screen edges={[]}>
        <EmptyState icon={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} title="Sadece koçlar" body="Bu panel koç hesaplarına açık." />
      </Screen>
    );
  }
  if (!saved) {
    return (
      <Screen edges={[]}>
        <SkeletonList variant="detail" />
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <Reveal index={0}>
        <Body muted style={{ fontSize: 13.5 }}>
          Hazırladığın şablonları ücretli üyeler Antrenman sekmesinden seçer. Bir üyeye özel program atarsan o üye için özel program önce gelir.
        </Body>
      </Reveal>
      <Reveal index={1}>
        <Segmented
          options={TEMPLATE_DAYS.map((d) => ({ value: String(d), label: `${tx('{0} gün', [d])}${saved[d] ? ' ✓' : ''}` }))}
          value={String(days)}
          onChange={(v) => pick(Number(v))}
        />
      </Reveal>

      <Reveal index={2}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>{tx('{0} günlük şablon', [days])}</Label>
            {saved[days] ? (
              <Row gap={spacing.sm}>
                <Tag color={colors.success} bg={colors.successSoft}>
                  Yayında
                </Tag>
                <PressScale onPress={remove}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.danger }}>Kaldır</Text>
                </PressScale>
              </Row>
            ) : (
              <Tag color={colors.textMuted} bg={colors.surfaceHigh}>
                Taslak
              </Tag>
            )}
          </Row>
          <Label>Program adı</Label>
          <Input value={program.name} onChangeText={(name) => setProgram({ ...program, name })} />
          <Label>Koç notu</Label>
          <Input value={program.note ?? ''} onChangeText={(note) => setProgram({ ...program, note })} placeholder="ör. Her hafta 2,5 kg ekle" multiline />
        </Card>
      </Reveal>

      <ProgramDaysEditor program={program} onChange={setProgram} />

      {msg && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: msg.ok ? colors.success : colors.danger }}>{msg.text}</Text>}
      <Button title={saved[days] ? 'Şablonu güncelle' : 'Şablonu yayınla'} arrow onPress={save} />
    </Screen>
  );
}

function serverError(message: string) {
  return /program_templates|schema cache/.test(message) ? "Sunucu güncel değil: 0010 SQL dosyasını Supabase'de çalıştır." : message;
}
