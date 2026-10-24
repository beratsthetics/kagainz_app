import * as Notifications from 'expo-notifications';
import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

import { ensurePermission } from './notifications';
import type { Program } from './program';
import { useProgress } from './progress';
import { dayKey, useStored } from './store';
import { useWorkouts } from './workouts';

// Telefonda kurulan yerel hatırlatmalar. Ayarlar cihaza özel ("device:" anahtarı hesapla eşitlenmez).
export type ReminderSettings = {
  evening: boolean;
  eveningHour: number;
  water: boolean;
  workout: boolean;
  workoutHour: number;
  streak: boolean;
};

export const DEFAULT_REMINDERS: ReminderSettings = { evening: false, eveningHour: 20, water: false, workout: false, workoutHour: 18, streak: false };
export const remindersSupported = Platform.OS !== 'web';

const WATER_HOURS = [11, 14, 17];
const STREAK_ID = 'kagainz-streak-guard';
const STREAK_HOUR = 21;

async function cancelOurs(keepStreak = true) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith('kagainz-') && (!keepStreak || n.identifier !== STREAK_ID))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})),
  );
}

// Ayarlara ve programa göre tekrarlayan bildirimleri baştan kurar.
async function applyRepeating(s: ReminderSettings, program: Program) {
  if (!remindersSupported) return;
  await cancelOurs();
  const daily = (hour: number, minute = 0) => ({ type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute }) as const;
  if (s.evening) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'kagainz-daily-reminder',
      content: { title: 'Bugünü kaydettin mi?', body: 'Öğünlerini gir, serini koru 🔥' },
      trigger: daily(s.eveningHour, 30),
    });
  }
  if (s.water) {
    for (const h of WATER_HOURS) {
      await Notifications.scheduleNotificationAsync({
        identifier: `kagainz-water-${h}`,
        content: { title: 'Su molası 💧', body: 'Bir bardak su iç, hedefe bir adım daha.', data: { route: '/' } },
        trigger: daily(h),
      });
    }
  }
  if (s.workout) {
    for (const d of program.days) {
      await Notifications.scheduleNotificationAsync({
        identifier: `kagainz-workout-${d.weekday}`,
        content: { title: `Bugün ${d.focus} günü 💪`, body: `${program.name}: ${d.exercises.length} hareket seni bekliyor.`, data: { route: '/training' } },
        // Expo'da haftanın günü 1 = pazar; programda 0 = pazar.
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: d.weekday + 1, hour: s.workoutHour, minute: 0 },
      });
    }
  }
}

export function useReminders() {
  const [settings, setSettings, loaded] = useStored<ReminderSettings>('device:reminders', DEFAULT_REMINDERS);
  const { program } = useWorkouts();

  // Açılan bir hatırlatma için bildirim izni istenir; izin yoksa açılmaz.
  const update = useCallback(
    async (patch: Partial<ReminderSettings>) => {
      const next = { ...settings, ...patch };
      const turningOn = Object.entries(patch).some(([k, v]) => v === true && !settings[k as keyof ReminderSettings]);
      if (turningOn && !(await ensurePermission())) return false;
      setSettings(next);
      await applyRepeating(next, program).catch(() => {});
      return true;
    },
    [settings, setSettings, program],
  );

  return { settings, update, loaded };
}

// Uygulama açıkken: program değişince antrenman hatırlatmalarını yeniler;
// seri varsa ve bugün kayıt yoksa saat 21'de "serin bozulmak üzere" bildirimi kurar, kayıt girilince iptal eder.
export function useReminderSync() {
  const [settings, , loaded] = useStored<ReminderSettings>('device:reminders', DEFAULT_REMINDERS);
  const [legacy, setLegacy, legacyLoaded] = useStored<boolean>('device:reminder', false);
  const [, setSettings] = useStored<ReminderSettings>('device:reminders', DEFAULT_REMINDERS);
  const { program } = useWorkouts();
  const { stats, activity } = useProgress();
  const today = activity[dayKey()];
  const loggedToday = Boolean(today && ((today.m ?? 0) > 0 || (today.w ?? 0) > 0));

  // Eski "Akşam hatırlatması" anahtarını yeni ayarlara taşı.
  useEffect(() => {
    if (!loaded || !legacyLoaded || !legacy) return;
    setSettings({ ...settings, evening: true });
    setLegacy(false);
  }, [loaded, legacyLoaded, legacy, settings, setSettings, setLegacy]);

  const programKey = JSON.stringify(program.days.map((d) => [d.weekday, d.focus, d.exercises.length]));
  useEffect(() => {
    if (!remindersSupported || !loaded || !settings.workout) return;
    ensurePermission(false).then((ok) => {
      if (ok) applyRepeating(settings, program).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, programKey, settings.workout, settings.workoutHour]);

  useEffect(() => {
    if (!remindersSupported || !loaded) return;
    (async () => {
      await Notifications.cancelScheduledNotificationAsync(STREAK_ID).catch(() => {});
      if (!settings.streak || loggedToday || stats.streak < 1) return;
      const at = new Date();
      at.setHours(STREAK_HOUR, 0, 0, 0);
      if (at.getTime() <= Date.now() || !(await ensurePermission(false))) return;
      await Notifications.scheduleNotificationAsync({
        identifier: STREAK_ID,
        content: { title: `${stats.streak} günlük serin bozulmak üzere 🔥`, body: 'Bir öğün ya da antrenman gir, seri devam etsin.', data: { route: '/' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
    })().catch(() => {});
  }, [loaded, settings.streak, loggedToday, stats.streak]);
}
