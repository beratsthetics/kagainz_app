import { useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { Body, Card, Chip, Label, Reveal, Row, Screen } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { remindersSupported, useReminders, type ReminderSettings } from '@/lib/reminders';
import { useColors } from '@/lib/theme';
import { useWorkouts } from '@/lib/workouts';

const EVENING_HOURS = [19, 20, 21, 22];
const WORKOUT_HOURS = [7, 12, 17, 18, 19, 20];

export default function RemindersScreen() {
  const colors = useColors();
  const { settings, update } = useReminders();
  const { program } = useWorkouts();
  const [denied, setDenied] = useState(false);

  async function set(patch: Partial<ReminderSettings>) {
    setDenied(!(await update(patch)));
  }

  const days = program.days.map((d) => d.short).join(', ');

  return (
    <Screen edges={[]}>
      {!remindersSupported && (
        <Card>
          <Body style={{ fontSize: 14 }}>Hatırlatmalar telefonda çalışır. Uygulamayı telefondan açıp buradan kur.</Body>
        </Card>
      )}
      {denied && (
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger }}>
          Bildirim izni yok. Telefonun ayarlarından Kagainz için bildirimleri aç.
        </Text>
      )}

      <Reveal index={0}>
        <Card>
          <Item
            title="Seri koruyucu"
            body="Serin varsa ve bugün hiç kayıt girmediysen saat 21:00'de uyarır. Kayıt girersen o gün bildirim gelmez."
            value={settings.streak}
            onChange={(streak) => set({ streak })}
          />
        </Card>
      </Reveal>

      <Reveal index={1}>
        <Card>
          <Item
            title="Antrenman günü"
            body={`Programındaki günlerde (${days}) o günün antrenmanını hatırlatır. Program değişirse kendiliğinden güncellenir.`}
            value={settings.workout}
            onChange={(workout) => set({ workout })}
          />
          {settings.workout && (
            <Hours label="Saat" hours={WORKOUT_HOURS} value={settings.workoutHour} onChange={(workoutHour) => set({ workoutHour })} />
          )}
        </Card>
      </Reveal>

      <Reveal index={2}>
        <Card>
          <Item
            title="Akşam günlüğü"
            body="Her akşam öğünlerini girmeyi hatırlatır."
            value={settings.evening}
            onChange={(evening) => set({ evening })}
          />
          {settings.evening && (
            <Hours label="Saat" hours={EVENING_HOURS} value={settings.eveningHour} minute={30} onChange={(eveningHour) => set({ eveningHour })} />
          )}
        </Card>
      </Reveal>

      <Reveal index={3}>
        <Card>
          <Item title="Su molası" body="Gün içinde 11:00, 14:00 ve 17:00'de su içmeyi hatırlatır." value={settings.water} onChange={(water) => set({ water })} />
        </Card>
      </Reveal>
    </Screen>
  );
}

function Item({ title, body, value, onChange }: { title: string; body: string; value: boolean; onChange: (v: boolean) => void }) {
  const colors = useColors();
  return (
    <Row style={{ justifyContent: 'space-between', gap: spacing.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Body style={{ fontSize: 15, fontFamily: fonts.bodyBold }}>{title}</Body>
        <Body muted style={{ fontSize: 13 }}>
          {body}
        </Body>
      </View>
      <Switch value={value} disabled={!remindersSupported} trackColor={{ true: colors.accent, false: colors.surfaceHigh }} onValueChange={onChange} />
    </Row>
  );
}

function Hours({ label, hours, value, minute = 0, onChange }: { label: string; hours: number[]; value: number; minute?: number; onChange: (h: number) => void }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Label>{label}</Label>
      <Row gap={spacing.xs} style={{ flexWrap: 'wrap' }}>
        {hours.map((h) => (
          <Chip key={h} label={`${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`} active={value === h} onPress={() => onChange(h)} />
        ))}
      </Row>
    </View>
  );
}
