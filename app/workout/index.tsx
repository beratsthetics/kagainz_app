import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Platform, TextInput, View } from 'react-native';
import { Text } from '@/components/T';

import { ExerciseMediaView } from '@/components/ExerciseMediaView';
import { MovementAnim } from '@/components/MovementAnim';
import { Body, Button, Card, Chip, EmptyState, Heading, Icon, Label, Mono, PressScale, ProgressBar, Ring, Row, Screen, Sheet } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useExerciseMedia } from '@/lib/exerciseMedia';
import { exerciseById } from '@/lib/exercises';
import { makeStyles, useColors } from '@/lib/theme';
import { doneSets, sessionVolume, useWorkouts, type SetLog } from '@/lib/workouts';
import { locale, tx } from '@/lib/i18n';

function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, Math.floor(sec % 60))).padStart(2, '0')}`;

export default function WorkoutScreen() {
  const colors = useColors();
  const styles = useStyles();
  const w = useWorkouts();
  const now = useNow();
  const [confirm, setConfirm] = useState<null | 'finish' | 'discard'>(null);
  const active = w.active;

  if (!active) {
    return (
      <Screen edges={['top', 'bottom']}>
        <EmptyState icon={{ ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' }} title="Aktif antrenman yok" />
        <Button title="Antrenman sekmesine dön" onPress={() => router.back()} />
      </Screen>
    );
  }

  const elapsed = (now - new Date(active.startedAt).getTime()) / 1000;
  const totalDone = doneSets(active);

  function finish() {
    const done = w.finish();
    setConfirm(null);
    if (done) router.replace({ pathname: '/workout/summary', params: { id: done.id } });
    else router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen
        edges={['top']}
        header={
          <Row style={{ justifyContent: 'space-between' }}>
            <PressScale onPress={() => router.back()} style={styles.round}>
              <Icon name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={20} />
            </PressScale>
            <View style={{ alignItems: 'center' }}>
              <Label>{active.title}</Label>
              <Text style={styles.clock}>{fmt(elapsed)}</Text>
            </View>
            <PressScale onPress={() => setConfirm('finish')} style={styles.finish}>
              <Text style={styles.finishText}>Bitir</Text>
            </PressScale>
          </Row>
        }>
        <Row gap={spacing.sm}>
          <Mini label="Set" value={`${totalDone}`} />
          <Mini label="Hacim" value={tx('{0} kg', [Math.round(sessionVolume(active)).toLocaleString(locale())])} />
          <Mini label="Hareket" value={`${active.exercises.length}`} />
        </Row>

        {active.exercises.map((e, ei) => (
          <ExerciseCard key={`${e.exerciseId}-${ei}`} index={ei} />
        ))}

        <Button title="Hareket ekle" variant="outline" icon={{ ios: 'plus', android: 'add', web: 'add' }} onPress={() => router.push({ pathname: '/library', params: { pick: '1' } })} />
        <PressScale onPress={() => setConfirm('discard')} style={{ alignItems: 'center', paddingVertical: spacing.md }}>
          <Text style={[styles.finishText, { color: colors.danger }]}>Antrenmanı sil</Text>
        </PressScale>
        <View style={{ height: 90 }} />
      </Screen>

      <RestBar />

      <Sheet visible={confirm != null} onClose={() => setConfirm(null)} title={confirm === 'finish' ? 'Antrenmanı bitir' : 'Antrenmanı sil'}>
        <Body muted>
          {confirm === 'finish'
            ? totalDone
              ? tx('{0} set kaydedilecek. İşaretlenmeyen setler kaydedilmez.', [totalDone])
              : 'Hiç set işaretlemedin; antrenman kaydedilmeden kapanacak.'
            : 'Bu antrenmandaki tüm setler silinecek.'}
        </Body>
        {confirm === 'finish' ? (
          <Button title="Bitir ve kaydet" arrow onPress={finish} />
        ) : (
          <Button
            title="Evet, sil"
            onPress={() => {
              w.discard();
              setConfirm(null);
              router.back();
            }}
          />
        )}
        <Button title="Vazgeç" variant="ghost" onPress={() => setConfirm(null)} />
      </Sheet>
    </View>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.mini}>
      <Label>{label}</Label>
      <Mono style={{ fontSize: 16, marginTop: 4 }}>{value}</Mono>
    </View>
  );
}

function ExerciseCard({ index }: { index: number }) {
  const colors = useColors();
  const styles = useStyles();
  const w = useWorkouts();
  const e = w.active!.exercises[index];
  const ex = exerciseById(e.exerciseId);
  const prev = w.lastSetsFor(e.exerciseId);
  const rec = w.records[e.exerciseId];
  const { tier, isCoach } = useAuth();
  const { view } = useExerciseMedia(e.exerciseId, isCoach || tier !== 'free');
  const [big, setBig] = useState(false);
  const [bigWidth, setBigWidth] = useState(0);
  // Kilosu ya da tekrarı boş bir sete ✓ basılınca o satır kırmızı yanar.
  const [missing, setMissing] = useState<number | null>(null);

  function toggle(si: number, set: SetLog) {
    if (set.done) return w.updateSet(index, si, { done: false });
    const p = prev?.[si] ?? prev?.[prev.length - 1];
    const kg = set.kg ?? p?.kg ?? null;
    const reps = set.reps ?? p?.reps ?? null;
    if (kg == null || reps == null) return setMissing(si);
    setMissing(null);
    w.updateSet(index, si, { kg, reps, done: true });
    w.startRest(w.restSeconds);
  }

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        {/* Hareketin animasyonu: koçun videosu varsa o, yoksa çizim. Dokununca büyür. */}
        <PressScale onPress={() => setBig((b) => !b)} style={styles.thumb}>
          {view ? (
            <ExerciseMediaView url={view.source} kind={view.kind} size={64} interactive={false} />
          ) : ex ? (
            <MovementAnim pattern={ex.pattern} size={64} />
          ) : null}
        </PressScale>
        <PressScale flex onPress={() => router.push(`/exercise/${e.exerciseId}`)}>
          <Heading style={{ fontSize: 19 }}>{ex?.trName ?? e.exerciseId}</Heading>
          <Mono style={{ color: colors.textMuted, fontSize: 12 }}>
            {e.target ? tx('Hedef {0}×{1}', [e.target.sets, e.target.reps]) : 'Serbest'}
            {rec ? tx(' · Rekor {0} kg × {1}', [rec.kg, rec.reps]) : ''}
          </Mono>
        </PressScale>
        <PressScale onPress={() => w.removeExercise(index)}>
          <Icon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={16} color={colors.textDim} />
        </PressScale>
      </Row>

      {big && (
        // Kartın tüm genişliğini kullanır, hareket rahat görünsün.
        <PressScale onPress={() => setBig(false)} style={styles.bigMedia}>
          <View style={{ alignSelf: 'stretch', alignItems: 'center' }} onLayout={(ev) => setBigWidth(Math.round(ev.nativeEvent.layout.width))}>
            {bigWidth > 0 &&
              (view ? (
                <ExerciseMediaView url={view.source} kind={view.kind} size={bigWidth} height={Math.round(bigWidth * 0.8)} interactive={false} />
              ) : ex ? (
                <MovementAnim pattern={ex.pattern} size={Math.min(bigWidth, 320)} />
              ) : null)}
          </View>
        </PressScale>
      )}

      <Row style={styles.headRow}>
        <Text style={[styles.head, { width: 26 }]}>SET</Text>
        <Text style={[styles.head, { flex: 1 }]}>ÖNCEKİ</Text>
        <Text style={[styles.head, { width: 70, textAlign: 'center' }]}>KG</Text>
        <Text style={[styles.head, { width: 60, textAlign: 'center' }]}>TEKRAR</Text>
        <View style={{ width: 38 }} />
      </Row>
      {e.sets.map((s, si) => {
        const p = prev?.[si];
        return (
          <Row key={si} style={[styles.setRow, s.done && { backgroundColor: colors.successSoft }, missing === si && { borderWidth: 1, borderColor: colors.danger }]}>
            <PressScale onPress={() => e.sets.length > 1 && !s.done && w.removeSet(index, si)} style={{ width: 26 }}>
              <Text style={styles.setIndex}>{si + 1}</Text>
            </PressScale>
            <Text style={styles.prev}>{p ? `${p.kg}×${p.reps}` : '—'}</Text>
            <NumberCell
              value={s.kg}
              placeholder={p?.kg != null ? String(p.kg) : 'kg'}
              decimal
              width={70}
              onChange={(v) => w.updateSet(index, si, { kg: v })}
            />
            <NumberCell
              value={s.reps}
              placeholder={p?.reps != null ? String(p.reps) : (e.target?.reps.split('-')[0] ?? '—')}
              width={60}
              onChange={(v) => w.updateSet(index, si, { reps: v })}
            />
            <PressScale onPress={() => toggle(si, s)} style={[styles.check, s.done && styles.checkOn]}>
              <Icon name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={15} color={s.done ? colors.primaryText : colors.textDim} />
            </PressScale>
          </Row>
        );
      })}
      {missing != null && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.danger, textAlign: 'center' }}>Önce kilo ve tekrarı yaz, sonra ✓'ye bas.</Text>}
      <PressScale onPress={() => w.addSet(index)} style={styles.addSet}>
        <Icon name={{ ios: 'plus', android: 'add', web: 'add' }} size={14} color={colors.textMuted} />
        <Text style={[styles.head, { color: colors.textMuted, fontSize: 13, letterSpacing: 0 }]}>Set ekle</Text>
      </PressScale>
    </Card>
  );
}

function NumberCell({
  value,
  placeholder,
  onChange,
  width,
  decimal,
}: {
  value: number | null;
  placeholder: string;
  onChange: (v: number | null) => void;
  width: number;
  decimal?: boolean;
}) {
  const colors = useColors();
  const styles = useStyles();
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => setText(value == null ? '' : String(value)), [value]);
  return (
    <TextInput
      value={text}
      placeholder={placeholder}
      placeholderTextColor={colors.textDim}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      selectTextOnFocus
      onChangeText={(t) => {
        setText(t);
        const n = parseFloat(t.replace(',', '.'));
        onChange(Number.isFinite(n) ? n : null);
      }}
      style={[styles.cell, { width }]}
    />
  );
}

// Dinlenme sayacı: set işaretlenince tam ekran geri sayım açılır (küçültülünce altta çubuk olur).
// Son 3 saniyede hafif titreşir, bitince titreşim ve ses gelir.
function RestBar() {
  const colors = useColors();
  const styles = useStyles();
  const { rest, stopRest, startRest, restSeconds, setRestSeconds } = useWorkouts();
  const now = useNow(250);
  const left = rest ? Math.max(0, (rest.endsAt - now) / 1000) : 0;
  const secs = Math.ceil(left);
  const [minimized, setMinimized] = useState(false);
  const beep = useAudioPlayer(require('@/assets/sounds/rest-done.wav'));
  const resting = rest != null;

  // Yeni dinlenme başlayınca tekrar tam ekran açılır.
  useEffect(() => {
    if (resting) setMinimized(false);
  }, [resting]);

  useEffect(() => {
    if (rest && secs > 0 && secs <= 3 && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [rest, secs]);

  useEffect(() => {
    if (rest && left <= 0) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      beep.seekTo(0);
      beep.play();
      stopRest();
    }
  }, [rest, left, stopRest, beep]);

  return (
    <View style={[styles.restBar, { backgroundColor: colors.overlay }]}>
      <Modal visible={resting && !minimized} transparent animationType="fade" onRequestClose={() => setMinimized(true)}>
        <View style={[styles.restFull, { backgroundColor: colors.background }]}>
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <Label>Dinlen</Label>
            <Ring value={rest ? left / rest.total : 0} size={260} stroke={16} color={secs <= 3 ? colors.fat : colors.accent}>
              <Text style={[styles.restBig, { color: secs <= 3 ? colors.fat : colors.text }]}>{fmt(secs)}</Text>
            </Ring>
          </View>
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button title="-15 sn" variant="outline" onPress={() => startRest(Math.max(5, Math.round(left) - 15))} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="+15 sn" variant="outline" onPress={() => startRest(Math.round(left) + 15)} />
            </View>
          </Row>
          <Button title="Sıradaki sete geç" arrow onPress={stopRest} />
          <PressScale onPress={() => setMinimized(true)} style={{ alignSelf: 'center' }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textMuted }}>Küçült</Text>
          </PressScale>
        </View>
      </Modal>
      {rest ? (
        <>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Dinlen</Label>
            <Text style={styles.restClock}>{fmt(Math.ceil(left))}</Text>
            <Row gap={spacing.sm}>
              <Chip label="-15" onPress={() => startRest(Math.max(5, Math.round(left) - 15))} />
              <Chip label="+15" onPress={() => startRest(Math.round(left) + 15)} />
              <Chip label="Geç" onPress={stopRest} />
            </Row>
          </Row>
          <ProgressBar value={left / rest.total} color={colors.accent} height={4} />
        </>
      ) : (
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Dinlenme süresi</Label>
          <Row gap={spacing.xs}>
            {[60, 90, 120, 180].map((s) => (
              <Chip key={s} label={s < 120 ? tx('{0} sn', [s]) : tx('{0} dk', [s / 60])} active={restSeconds === s} onPress={() => setRestSeconds(s)} />
            ))}
          </Row>
        </Row>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  bigMedia: {
    alignItems: 'center',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  round: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clock: { fontFamily: fonts.mono, fontSize: 20, color: colors.text, marginTop: 4 },
  finish: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.success },
  finishText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#08090B' },
  mini: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  headRow: { gap: spacing.sm, paddingHorizontal: 8 },
  head: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.2, color: colors.textDim },
  setRow: { gap: spacing.sm, paddingHorizontal: 8, paddingVertical: 8, borderRadius: radius.sm },
  setIndex: { fontFamily: fonts.mono, fontSize: 14, color: colors.text },
  prev: { flex: 1, fontFamily: fonts.mono, fontSize: 13, color: colors.textDim },
  cell: {
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
    fontFamily: fonts.mono,
    fontSize: 15,
    color: colors.text,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never } : null),
  },
  check: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.success, borderColor: colors.success },
  addSet: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: spacing.sm },
  restBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  restClock: { fontFamily: fonts.mono, fontSize: 24, color: colors.text },
  restFull: { flex: 1, justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg },
  restBig: { fontFamily: fonts.display, fontSize: 72, lineHeight: 80 },
}));
