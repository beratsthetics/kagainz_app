import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { BodyMap } from '@/components/BodyMap';
import { ExerciseMediaView } from '@/components/ExerciseMediaView';
import { LineChart } from '@/components/Charts';
import { MovementAnim } from '@/components/MovementAnim';
import { Body, Button, Card, EmptyState, Input, Label, LockedCard, Mono, Reveal, Row, Screen, Sheet, Stat, Tag, Title } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { deleteExerciseMedia, pickExerciseMedia, saveExerciseMedia, useExerciseMedia, type ExerciseMedia as ExerciseMediaRow } from '@/lib/exerciseMedia';
import { removeExercise, renameExercise, restoreExercise, useExercises } from '@/lib/exerciseCatalog';
import { exerciseById, isCustom, isHidden, isUnlocked, MUSCLES } from '@/lib/exercises';
import { makeStyles, useColors } from '@/lib/theme';
import { hasFeature } from '@/lib/tiers';
import { e1rm, useWorkouts } from '@/lib/workouts';
import { locale, tx } from '@/lib/i18n';

export default function ExerciseScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tier, isCoach } = useAuth();
  const { records, history, active, addExercise } = useWorkouts();
  // Koçun eklediği hareketler sunucudan gelince sayfa yenilensin.
  const all = useExercises(true);
  const ex = all.find((e) => e.id === id) ?? exerciseById(id ?? '');
  // Koçun animasyonu ücretli üyelere ve koça gösterilir; diğerleri çizim animasyonunu görür.
  const { media, view, hasVideo } = useExerciseMedia(ex?.id, isCoach || tier !== 'free');
  const [animWidth, setAnimWidth] = useState(0);

  if (!ex) {
    return (
      <Screen edges={[]}>
        <EmptyState icon={{ ios: 'questionmark.circle', android: 'help', web: 'help' }} title="Hareket bulunamadı" />
      </Screen>
    );
  }

  const open = isUnlocked(ex, hasFeature(tier, 'full_library'));
  const rec = records[ex.id];
  // Her antrenmandaki en iyi tahmini 1RM.
  const points = history
    .map((s) => {
      const e = s.exercises.find((x) => x.exerciseId === ex.id);
      if (!e) return null;
      const best = Math.max(0, ...e.sets.filter((x) => x.done).map((x) => e1rm(x.kg ?? 0, x.reps ?? 0)));
      return best > 0 ? { date: new Date(s.startedAt), v: best } : null;
    })
    .filter((x): x is { date: Date; v: number } => x != null)
    .slice(-12);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <Reveal index={0}>
        {/* Adlar İngilizce: büyük harfe İngilizce kuralıyla çevir ("LYING", "LYİNG" değil). */}
        <Title style={{ fontSize: 34, lineHeight: 38 }}>{ex.trName.toLocaleUpperCase('en-US')}</Title>
        <Row gap={6} style={{ marginTop: spacing.xs, flexWrap: 'wrap' }}>
          <Tag>{MUSCLES[ex.primary[0]].group}</Tag>
          <Tag color={colors.textMuted} bg={colors.surfaceAlt}>
            {ex.equipment}
          </Tag>
          {/* Türkçe adı, sadece Türkçe arayüzde. */}
          {ex.name !== ex.trName && locale() === 'tr-TR' && <Text raw style={styles.en}>{ex.name}</Text>}
        </Row>
      </Reveal>

      {!open ? (
        <LockedCard
          tier="pro"
          title="Bu hareket Pro'da"
          body="Tüm hareket kütüphanesi, animasyonlar ve kas haritası Pro ile açılır."
          preview={[['Hedef kas', MUSCLES[ex.primary[0]].group], ['Set × tekrar', '4 × 8-10'], ['Dinlenme', '90 sn']]}
          onPress={() => router.push('/plans')}
        />
      ) : (
        <>
          <Reveal index={1}>
            <View style={styles.anim} onLayout={(ev) => setAnimWidth(Math.round(ev.nativeEvent.layout.width))}>
              {/* Koçun videosu kartın tüm genişliğini kullanır. */}
              {view ? (
                animWidth > 0 && <ExerciseMediaView url={view.source} kind={view.kind} size={animWidth - 2} height={Math.round(animWidth * 0.8)} />
              ) : (
                <MovementAnim pattern={ex.pattern} size={300} />
              )}
            </View>
            {hasVideo && !view && tier === 'free' && !isCoach && (
              <PressLink onPress={() => router.push('/plans')}>Koçun hazırladığı gerçek hareket videosu Pro üyelerde açılır →</PressLink>
            )}
            {isCoach && <CoachMediaControls exerciseId={ex.id} media={media} />}
            {isCoach && <CoachCatalogControls exerciseId={ex.id} />}
          </Reveal>

          <Reveal index={2}>
            <Card>
              <Label>Çalışan kaslar</Label>
              <BodyMap primary={ex.primary} secondary={ex.secondary} height={230} />
              <Row gap={spacing.md} style={{ justifyContent: 'center' }}>
                <Row gap={6}>
                  <View style={[styles.dot, { backgroundColor: colors.accentBright }]} />
                  <Text style={styles.legend}>{ex.primary.map((m) => tx(MUSCLES[m].name)).join(', ')}</Text>
                </Row>
              </Row>
              {ex.secondary.length > 0 && (
                <Row gap={6} style={{ justifyContent: 'center' }}>
                  <View style={[styles.dot, { backgroundColor: colors.accent, opacity: 0.5 }]} />
                  <Text style={[styles.legend, { color: colors.textMuted }]}>{tx('Yardımcı: {0}', [ex.secondary.map((m) => tx(MUSCLES[m].name)).join(', ')])}</Text>
                </Row>
              )}
            </Card>
          </Reveal>

          <Reveal index={3}>
            <Card>
              <Label>Nasıl yapılır</Label>
              {ex.steps.map((s, i) => (
                <Row key={i} gap={spacing.md} style={{ alignItems: 'flex-start' }}>
                  <View style={styles.step}>
                    <Text style={styles.stepText}>{i + 1}</Text>
                  </View>
                  <Body style={{ flex: 1, fontSize: 14.5 }}>{s}</Body>
                </Row>
              ))}
              <View style={styles.tip}>
                <Text style={styles.tipLabel}>İPUCU</Text>
                <Body style={{ fontSize: 14 }}>{ex.tip}</Body>
              </View>
            </Card>
          </Reveal>

          <Reveal index={4}>
            <Card>
              <Label>Senin rekorların</Label>
              {rec ? (
                <>
                  <Row gap={spacing.sm}>
                    <Stat label="En ağır" value={tx('{0} kg × {1}', [rec.kg, rec.reps])} />
                    <Stat label="Tahmini 1RM" value={tx('{0} kg', [Math.round(rec.e1rm)])} color={colors.fat} />
                  </Row>
                  {points.length > 1 && (
                    <LineChart
                      values={points.map((p) => p.v)}
                      labels={points.map((p) => p.date.toLocaleDateString(locale(), { day: 'numeric', month: 'short' }))}
                      unit="kg 1RM"
                      color={colors.fat}
                    />
                  )}
                </>
              ) : (
                <Body muted style={{ fontSize: 13.5 }}>
                  Bu hareketi kaydettiğinde en iyi kilon ve gelişim grafiğin burada görünecek.
                </Body>
              )}
              {active && !active.exercises.some((e) => e.exerciseId === ex.id) && (
                <Button
                  title="Antrenmana ekle"
                  variant="outline"
                  icon={{ ios: 'plus', android: 'add', web: 'add' }}
                  onPress={() => {
                    addExercise(ex.id);
                    router.push('/workout');
                  }}
                />
              )}
              {!rec && <Mono style={{ color: colors.textDim, fontSize: 11 }}>1RM: Epley formülüyle tahmin edilir.</Mono>}
            </Card>
          </Reveal>
        </>
      )}
    </Screen>
  );
}

function PressLink({ children, onPress }: { children: string; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Text onPress={onPress} style={styles.link}>
      {children}
    </Text>
  );
}

// Sadece koçta görünür: hareketi kütüphaneden kaldır ya da geri ekle. Koçun eklediği hareket silinir,
// uygulamayla gelen hareket gizlenir. Üyelerin geçmişi ve programları etkilenmez.
function CoachCatalogControls({ exerciseId }: { exerciseId: string }) {
  const styles = useStyles();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [trName, setTrName] = useState('');
  const [name, setName] = useState('');
  const hidden = isHidden(exerciseId);
  const custom = isCustom(exerciseId);

  function openRename() {
    const ex = exerciseById(exerciseId);
    setTrName(ex?.trName ?? '');
    setName(ex?.name ?? '');
    setNotice(null);
    setRenaming(true);
  }

  async function saveName() {
    if (trName.trim().length < 2) return setNotice('Hareketin adını yaz.');
    setBusy(true);
    const err = await renameExercise(exerciseId, custom, trName.trim(), name.trim());
    setBusy(false);
    setRenaming(false);
    setNotice(err ?? 'Hareketin adı değişti.');
  }

  async function run(fn: () => Promise<string | null>, done: string, leave = false) {
    setBusy(true);
    const err = await fn();
    setBusy(false);
    setConfirm(false);
    if (err) return setNotice(err);
    if (leave) return router.back();
    setNotice(done);
  }

  return (
    <View style={styles.coach}>
      <Text style={styles.coachLabel}>KOÇ · KÜTÜPHANE</Text>
      <Button title="Adını değiştir" variant="outline" onPress={openRename} />
      {hidden ? (
        <Button
          title="Listeye geri ekle"
          variant="outline"
          loading={busy}
          onPress={() => run(() => restoreExercise(exerciseId), 'Hareket tekrar listede.')}
        />
      ) : (
        <Button title="Hareketi kaldır" variant="ghost" onPress={() => setConfirm(true)} />
      )}
      {notice && <Text style={styles.notice}>{notice}</Text>}
      <Sheet visible={confirm} onClose={() => setConfirm(false)} title="Hareketi kaldır">
        <Body muted>
          {custom
            ? 'Bu hareket kütüphaneden silinecek. Üyelerin geçmiş antrenmanları silinmez.'
            : 'Hareket listelerden kaldırılacak. İstediğin zaman buradan geri ekleyebilirsin.'}
        </Body>
        <Button
          title="Evet, kaldır"
          loading={busy}
          onPress={() => run(() => removeExercise(exerciseId, custom), 'Hareket listeden kaldırıldı.', custom)}
        />
        <Button title="Vazgeç" variant="ghost" onPress={() => setConfirm(false)} />
      </Sheet>
      <Sheet visible={renaming} onClose={() => setRenaming(false)} title="Adını değiştir">
        <Label>Adı (uygulamada görünen)</Label>
        <Input value={trName} onChangeText={setTrName} placeholder="ör. Cable fly" maxLength={80} />
        <Label>Türkçe adı (aramada bulunsun)</Label>
        <Input value={name} onChangeText={setName} placeholder="ör. Kablo fly" maxLength={80} />
        {notice && <Text style={styles.notice}>{notice}</Text>}
        <Button title="Kaydet" loading={busy} onPress={saveName} />
        <Button title="Vazgeç" variant="ghost" onPress={() => setRenaming(false)} />
      </Sheet>
    </View>
  );
}

// Sadece koçta görünür: bu harekete animasyon yükle, değiştir ya da kaldır.
function CoachMediaControls({ exerciseId, media }: { exerciseId: string; media: ExerciseMediaRow | null }) {
  const styles = useStyles();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function upload() {
    const asset = await pickExerciseMedia();
    if (!asset) return;
    setBusy(true);
    setNotice(null);
    const err = await saveExerciseMedia(exerciseId, asset, media);
    setBusy(false);
    setNotice(err ?? 'Animasyon kaydedildi. Üyeler bu hareketi açınca otomatik görecek.');
  }

  async function remove() {
    if (!media) return;
    setBusy(true);
    const err = await deleteExerciseMedia(media);
    setBusy(false);
    setNotice(err ?? 'Animasyon kaldırıldı, çizim animasyonu gösterilecek.');
  }

  return (
    <View style={styles.coach}>
      <Text style={styles.coachLabel}>KOÇ · HAREKET ANİMASYONU</Text>
      <Row gap={spacing.sm}>
        <View style={{ flex: 1 }}>
          <Button
            title={media ? 'Değiştir' : 'Video / GIF yükle'}
            variant="outline"
            icon={{ ios: 'square.and.arrow.up', android: 'upload', web: 'upload' }}
            loading={busy}
            onPress={upload}
          />
        </View>
        {media && !busy && <Button title="Kaldır" variant="ghost" onPress={remove} />}
      </Row>
      {notice && <Text style={styles.notice}>{notice}</Text>}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  link: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentBright, marginTop: spacing.sm, textAlign: 'center' },
  coach: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.fat, gap: spacing.sm },
  coachLabel: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 1.4, color: colors.fat },
  notice: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.textMuted },
  en: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted, alignSelf: 'center' },
  anim: {
    alignItems: 'center',
    overflow: 'hidden',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legend: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.text },
  step: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontFamily: fonts.mono, fontSize: 12, color: colors.text },
  tip: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accentSoft, gap: 4 },
  tipLabel: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 1.4, color: colors.accentBright },
}));
