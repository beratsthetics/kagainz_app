import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { Button, Card, Chip, Icon, Input, Mono, PressScale, Row, Segmented, Sheet, Stepper } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useExercises } from '@/lib/exerciseCatalog';
import { exerciseById, GROUPS, MUSCLES, type Muscle } from '@/lib/exercises';
import { WEEKDAYS, type Program, type ProgramDay } from '@/lib/program';
import { makeStyles, useColors } from '@/lib/theme';

// Programın günlerini düzenler: gün, odak, hareketler, set ve tekrar. Koç panelinde
// üyeye özel programda ve hazır şablonlarda kullanılır.
export function ProgramDaysEditor({ program, onChange }: { program: Program; onChange: (p: Program) => void }) {
  const patchDay = (i: number, fn: (d: ProgramDay) => ProgramDay) => onChange({ ...program, days: program.days.map((d, j) => (j === i ? fn(d) : d)) });
  return (
    <>
      {program.days.map((d, i) => (
        <DayEditor
          key={`${i}-${d.weekday}`}
          day={d}
          onChange={(fn) => patchDay(i, fn)}
          onRemove={() => onChange({ ...program, days: program.days.filter((_, j) => j !== i) })}
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
          onChange({ ...program, days: [...program.days, { ...WEEKDAYS[wd], weekday: wd, focus: 'Tüm vücut', exercises: [] }] });
        }}
      />
    </>
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
  const exercises = useExercises();
  const [picking, setPicking] = useState(false);
  const [group, setGroup] = useState<(typeof GROUPS)[number]>(GROUPS[0]);
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text }}>{day.day}</Text>
        <PressScale onPress={onRemove}>
          <Icon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={18} color={colors.danger} />
        </PressScale>
      </Row>
      <Segmented
        options={[1, 2, 3, 4, 5, 6, 0].map((w) => ({ value: String(w), label: WEEKDAYS[w].short }))}
        value={String(day.weekday)}
        onChange={(v) => {
          const w = Number(v);
          if (!taken.includes(w)) onChange((d) => ({ ...d, weekday: w, ...WEEKDAYS[w] }));
        }}
      />
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
        {exercises.filter((x) => exerciseGroup(x.primary[0]) === group).map((x) => (
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
  exRow: { gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceHigh },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
}));
