import { useCallback, useEffect, useState } from 'react';

import { dayKey, daysAgo } from './store';
import { isSupabaseConfigured, supabase } from './supabase';

export type Habit = { id: string; user_id: string; title: string; created_at: string };
type Log = { habit_id: string; day: string };

// Koçun verdiği günlük alışkanlıklar (0019) ve son 7 günün işaretleri.
export function useHabits(userId: string | undefined) {
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);

  const load = useCallback(() => {
    if (!userId || !isSupabaseConfigured) return setHabits([]);
    supabase
      .from('habits')
      .select('id, user_id, title, created_at')
      .eq('user_id', userId)
      .order('created_at')
      .then(({ data }) => setHabits((data ?? []) as Habit[]));
    supabase
      .from('habit_logs')
      .select('habit_id, day')
      .eq('user_id', userId)
      .gte('day', dayKey(daysAgo(6)))
      .then(({ data }) => setLogs((data ?? []) as Log[]));
  }, [userId]);

  useEffect(load, [load]);

  const today = dayKey();
  const done = (habitId: string, day = today) => logs.some((l) => l.habit_id === habitId && l.day === day);
  const weekCount = (habitId: string) => logs.filter((l) => l.habit_id === habitId).length;

  async function toggle(habitId: string) {
    if (!userId) return;
    const was = done(habitId);
    // Önce ekranda değişir, sunucu reddederse geri alınır.
    setLogs((prev) =>
      was
        ? prev.filter((l) => !(l.habit_id === habitId && l.day === today))
        : [...prev, { habit_id: habitId, day: today }],
    );
    const { error } = was
      ? await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('day', today)
      : await supabase.from('habit_logs').insert({ habit_id: habitId, user_id: userId, day: today });
    if (error) load();
  }

  return { habits, done, weekCount, toggle, reload: load };
}
