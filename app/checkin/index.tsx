import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { CheckinPhoto } from '@/components/CheckinPhoto';
import {
  Body,
  Button,
  Card,
  EmptyState,
  Heading,
  Input,
  Label,
  LockedCard,
  Mono,
  PressScale,
  Reveal,
  Row,
  Screen,
  Sheet,
  SkeletonList,
  Tag,
} from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  fmt,
  MEASURES,
  parseNum,
  removeCheckinPhotos,
  serverError,
  thisWeekKey,
  uploadCheckinPhoto,
  useMyCheckins,
  weekTitle,
  type Checkin,
  type Measure,
} from '@/lib/checkins';
import type { WeightLog } from '@/lib/goals';
import { pickImage } from '@/lib/media';
import { useProgress } from '@/lib/progress';
import { dayKey, useStored } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { TIER_RANK } from '@/lib/tiers';
import { tx } from '@/lib/i18n';

type NewPhoto = { uri: string; base64: string; mime?: string };
type Form = { weight: string; note: string; photos: string[]; added: NewPhoto[] } & Record<Measure, string>;

const EMPTY: Form = { weight: '', waist: '', chest: '', hip: '', arm: '', thigh: '', note: '', photos: [], added: [] };
const str = (n: number | null) => (n == null ? '' : String(n).replace('.', ','));

export default function CheckinScreen() {
  const colors = useColors();
  const { session, tier } = useAuth();
  const { bump } = useProgress();
  const userId = session?.user.id;
  const { items, error: loadError, reload } = useMyCheckins(userId);
  const [, setWeights] = useStored<WeightLog[]>('weights', []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (TIER_RANK[tier] < TIER_RANK.max) {
    return (
      <Screen edges={[]}>
        <LockedCard
          tier="max"
          title="Haftalık check-in"
          body="Her hafta kilonu ve fotoğrafını kaydet, koçun yorumlasın, ilk haftanla bugünü yan yana gör."
          preview={[['1. hafta', '82,4 kg'], ['Bu hafta', '79,1 kg'], ['Koçun yorumu', '✓']]}
          onPress={() => router.push('/plans')}
        />
      </Screen>
    );
  }

  const week = thisWeekKey();
  const current = items?.find((c) => c.week_start === week);
  const coachReviews = TIER_RANK[tier] >= TIER_RANK.plus;

  function edit(c?: Checkin) {
    setError(null);
    setForm(
      c
        ? { weight: str(c.weight), waist: str(c.waist), chest: str(c.chest), hip: str(c.hip), arm: str(c.arm), thigh: str(c.thigh), note: c.note ?? '', photos: c.photos, added: [] }
        : EMPTY,
    );
    setOpen(true);
  }

  async function addPhoto(camera: boolean) {
    const a = await pickImage(camera);
    if (!a?.base64) return;
    setForm((f) => ({ ...f, added: [...f.added, { uri: a.uri, base64: a.base64!, mime: a.mimeType }] }));
  }

  async function save() {
    if (!userId) return;
    const weight = parseNum(form.weight);
    const measures = Object.fromEntries(MEASURES.map((m) => [m.key, parseNum(form[m.key])])) as Record<Measure, number | null>;
    if (weight == null && Object.values(measures).every((v) => v == null) && !form.photos.length && !form.added.length) {
      return setError('En az kilo, bir ölçü ya da bir fotoğraf gir.');
    }
    setBusy(true);
    setError(null);
    const uploaded: string[] = [];
    try {
      for (const p of form.added) uploaded.push(await uploadCheckinPhoto(userId, p.base64, p.mime));
      const row = { weight, ...measures, note: form.note.trim() || null, photos: [...form.photos, ...uploaded] };
      const { error: err } = current
        ? await supabase.from('checkins').update(row).eq('id', current.id)
        : await supabase.from('checkins').insert({ user_id: userId, ...row });
      if (err) throw new Error(serverError(err.message));
      if (current) await removeCheckinPhotos(current.photos.filter((p) => !form.photos.includes(p)));
      else bump('checkins');
      if (weight != null) setWeights((prev) => [...prev.filter((w) => w.day !== dayKey()), { day: dayKey(), kg: weight }].slice(-365));
      setOpen(false);
      reload();
    } catch (e) {
      await removeCheckinPhotos(uploaded);
      setError(e instanceof Error ? serverError(e.message) : 'Kaydedilemedi');
    } finally {
      setBusy(false);
    }
  }

  const first = items && items.length >= 2 ? items[items.length - 1] : null;
  const last = items?.[0];
  const photoCount = form.photos.length + form.added.length;

  return (
    <Screen edges={[]}>
      <Reveal index={0}>
        <Card glow>
          <Label>{weekTitle(week)}</Label>
          <Heading style={{ fontSize: 24 }}>{current ? 'Bu haftayı kaydettin ✓' : 'Bu haftanın check-in\'i'}</Heading>
          <Body muted style={{ fontSize: 13.5 }}>
            {current
              ? coachReviews
                ? current.coach_note
                  ? 'Koçun yorum yazdı, aşağıdan açıp okuyabilirsin.'
                  : 'Koçun check-in\'ini görecek ve yorum yazacak.'
                : 'Hafta bitene kadar düzenleyebilirsin.'
              : 'Sabah aç karnına tartıl, ölçüleri aynı yerden al, fotoğrafı aynı ışıkta çek. Her hafta aynı koşullar karşılaştırmayı doğru yapar.'}
          </Body>
          <Button title={current ? 'Düzenle' : 'Check-in yap'} variant={current ? 'outline' : 'primary'} arrow onPress={() => edit(current)} />
        </Card>
      </Reveal>

      {loadError && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger }}>{loadError}</Text>}

      {first && last && (
        <Reveal index={1}>
          <Card>
            <Label>İlk hafta ve son hafta</Label>
            {first.photos[0] && last.photos[0] && (
              <Row gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <CheckinPhoto path={first.photos[0]} width="100%" />
                  <Mono style={{ fontSize: 11.5, color: colors.textMuted }}>{weekTitle(first.week_start)}</Mono>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <CheckinPhoto path={last.photos[0]} width="100%" />
                  <Mono style={{ fontSize: 11.5, color: colors.textMuted }}>{weekTitle(last.week_start)}</Mono>
                </View>
              </Row>
            )}
            <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
              <Delta label="Kilo" unit="kg" a={first.weight} b={last.weight} />
              {MEASURES.map((m) => (
                <Delta key={m.key} label={m.label} unit="cm" a={first[m.key]} b={last[m.key]} />
              ))}
            </Row>
          </Card>
        </Reveal>
      )}

      <Reveal index={2}>
        <Label>Geçmiş</Label>
      </Reveal>
      {items == null ? (
        <SkeletonList count={3} />
      ) : items.length === 0 ? (
        <EmptyState icon={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} title="Henüz check-in yok" body="İlk check-in'in başlangıç noktan olur. Haftalar geçtikçe farkı burada göreceksin." />
      ) : (
        items.map((c, i) => (
          <Reveal key={c.id} index={3 + i}>
            <PressScale onPress={() => router.push({ pathname: '/checkin/[id]', params: { id: c.id } })}>
              <Card>
                <Row gap={spacing.sm}>
                  {c.photos[0] ? (
                    <CheckinPhoto path={c.photos[0]} width={48} aspect={1} />
                  ) : (
                    <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20 }}>📏</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text }}>{weekTitle(c.week_start)}</Text>
                    <Mono style={{ fontSize: 12.5, color: colors.textMuted }}>{tx('{0} kg · bel {1} cm', [fmt(c.weight), fmt(c.waist)])}</Mono>
                  </View>
                  {c.coach_note && (
                    <Tag color={colors.success} bg={colors.successSoft}>
                      Koç yorumu
                    </Tag>
                  )}
                </Row>
              </Card>
            </PressScale>
          </Reveal>
        ))
      )}

      <Sheet visible={open} onClose={() => !busy && setOpen(false)} title={current ? 'Check-in\'i düzenle' : 'Haftalık check-in'}>
        <Label>Kilo (kg)</Label>
        <Input value={form.weight} onChangeText={(weight) => setForm({ ...form, weight })} keyboardType="decimal-pad" placeholder="ör. 78,4" />
        <Label>Ölçüler (cm)</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {MEASURES.map((m) => (
            <View key={m.key} style={{ width: '48%', gap: 4 }}>
              <Mono style={{ fontSize: 12, color: colors.textMuted }}>{m.label}</Mono>
              <Input value={form[m.key]} onChangeText={(v) => setForm({ ...form, [m.key]: v })} keyboardType="decimal-pad" placeholder="–" />
            </View>
          ))}
        </View>
        <Label>Fotoğraflar (en fazla 3: önden, yandan, arkadan)</Label>
        {photoCount > 0 && (
          <Row gap={spacing.sm}>
            {form.photos.map((p) => (
              <PressScale key={p} onPress={() => setForm({ ...form, photos: form.photos.filter((x) => x !== p) })}>
                <CheckinPhoto path={p} width={84} />
                <RemoveBadge />
              </PressScale>
            ))}
            {form.added.map((p) => (
              <PressScale key={p.uri} onPress={() => setForm({ ...form, added: form.added.filter((x) => x !== p) })}>
                <CheckinPhoto uri={p.uri} width={84} />
                <RemoveBadge />
              </PressScale>
            ))}
          </Row>
        )}
        {photoCount < 3 && (
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button title="Çek" variant="outline" icon={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} onPress={() => addPhoto(true)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Galeriden" variant="outline" icon={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' }} onPress={() => addPhoto(false)} />
            </View>
          </Row>
        )}
        <Mono style={{ fontSize: 11.5, color: colors.textMuted }}>{tx('Fotoğrafları sadece sen{0} görebilir.', [coachReviews ? tx(' ve koçun') : ''])}</Mono>
        <Label>Not (isteğe bağlı)</Label>
        <Input value={form.note} onChangeText={(note) => setForm({ ...form, note })} placeholder="ör. Bu hafta 2 antrenman kaçırdım, uykum iyiydi" multiline maxLength={1000} />
        {error && <Text style={{ fontFamily: fonts.bodyBold, color: colors.danger }}>{error}</Text>}
        <Button title={busy ? 'Kaydediliyor...' : 'Kaydet'} arrow disabled={busy} onPress={save} />
      </Sheet>
    </Screen>
  );
}

function RemoveBadge() {
  const colors = useColors();
  return (
    <View style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 15 }}>×</Text>
    </View>
  );
}

function Delta({ label, unit, a, b }: { label: string; unit: string; a: number | null; b: number | null }) {
  const colors = useColors();
  if (a == null || b == null) return null;
  const d = Math.round((b - a) * 10) / 10;
  return (
    <View style={{ minWidth: '30%', flexGrow: 1, padding: spacing.sm, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, gap: 2 }}>
      <Label>{label}</Label>
      <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.text }}>
        {d > 0 ? '+' : ''}
        {fmt(d)} {unit}
      </Text>
      <Mono style={{ fontSize: 11, color: colors.textMuted }}>
        {fmt(a)} → {fmt(b)}
      </Mono>
    </View>
  );
}
