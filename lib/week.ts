import { useEffect, useMemo, useState } from 'react';

import { loadHistory, useDaily, type DaySummary } from './daily';
import { type WeightLog } from './goals';
import { useProgress } from './progress';
import { dayKey, useStored } from './store';
import { useWorkouts } from './workouts';
import { locale } from './i18n';

// Haftalık özet: pazartesiden pazara. offset 0 bu hafta, -1 geçen hafta.
export type WeekSummary = {
  start: Date;
  end: Date;
  label: string;
  days: (DaySummary & { workouts: number; active: boolean; future: boolean })[];
  workouts: number;
  volume: number;
  minutes: number;
  sets: number;
  prs: number;
  activeDays: number;
  loggedDays: number;
  avgKcal: number;
  avgProtein: number;
  proteinDays: number;
  waterDays: number;
  weightStart: number | null;
  weightEnd: number | null;
  streak: number;
  prev: { workouts: number; avgKcal: number } | null;
};

export function weekStart(offset = 0, from = new Date()) {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  return d;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function weekLabel(start: Date) {
  const end = addDays(start, 6);
  const f = (d: Date, month: boolean) => d.toLocaleDateString(locale(), month ? { day: 'numeric', month: 'long' } : { day: 'numeric' });
  if (start.getMonth() !== end.getMonth()) return `${f(start, true)} – ${f(end, true)}`;
  // "19–25 Ekim" / "October 19–25"
  return locale() === 'tr-TR' ? `${f(start, false)}–${f(end, true)}` : `${f(start, true)}–${f(end, false)}`;
}

// Pazar günü bu haftanın, pazartesi geçen haftanın özeti öne çıkar.
export function featuredWeekOffset(date = new Date()): 0 | -1 | null {
  const day = date.getDay();
  if (day === 0) return 0;
  if (day === 1) return -1;
  return null;
}

export function useWeekSummary(offset = 0): WeekSummary | null {
  const { history } = useWorkouts();
  const { activity, stats } = useProgress();
  const { entries, water } = useDaily();
  const [weights] = useStored<WeightLog[]>('weights', []);
  const [days, setDays] = useState<DaySummary[] | null>(null);
  const [prevDays, setPrevDays] = useState<DaySummary[] | null>(null);
  const start = useMemo(() => weekStart(offset), [offset]);

  // loadHistory bugünden geriye sayar; haftanın günlerini ondan seçiyoruz.
  useEffect(() => {
    let alive = true;
    const back = Math.round((Date.now() - weekStart(offset - 1).getTime()) / 86400000) + 1;
    loadHistory(Math.max(back, 14)).then((all) => {
      if (!alive) return;
      const pick = (s: Date) => {
        const keys = Array.from({ length: 7 }, (_, i) => dayKey(addDays(s, i)));
        return keys.map(
          (k, i) => all.find((d) => d.day === k) ?? { day: k, date: addDays(s, i), totals: { kcal: 0, protein: 0, carb: 0, fat: 0 }, water: 0, count: 0 },
        );
      };
      setDays(pick(start));
      setPrevDays(pick(weekStart(offset - 1)));
    });
    return () => {
      alive = false;
    };
    // Bugünün kaydı değişince yeniden oku.
  }, [offset, start, entries.length, water]);

  return useMemo(() => {
    if (!days) return null;
    const end = addDays(start, 6);
    const today = dayKey();
    const inWeek = (iso: string, s: Date) => {
      const t = new Date(iso).getTime();
      return t >= s.getTime() && t < addDays(s, 7).getTime();
    };
    const sessions = history.filter((s) => s.endedAt && inWeek(s.startedAt, start));
    const avg = (list: DaySummary[], k: 'kcal' | 'protein') => {
      const logged = list.filter((d) => d.count > 0);
      return logged.length ? Math.round(logged.reduce((n, d) => n + d.totals[k], 0) / logged.length) : 0;
    };
    const rows = days.map((d) => {
      const a = activity[d.day] ?? {};
      return { ...d, workouts: a.w ?? 0, active: (a.m ?? 0) > 0 || (a.w ?? 0) > 0, future: d.day > today };
    });
    const sorted = [...weights].sort((a, b) => a.day.localeCompare(b.day));
    const startKey = dayKey(start);
    const endKey = dayKey(end);
    const before = sorted.filter((w) => w.day < startKey).at(-1) ?? sorted.find((w) => w.day >= startKey && w.day <= endKey);
    const last = sorted.filter((w) => w.day <= endKey).at(-1);
    const prevSessions = history.filter((s) => s.endedAt && inWeek(s.startedAt, weekStart(offset - 1)));

    return {
      start,
      end,
      label: weekLabel(start),
      days: rows,
      workouts: sessions.length,
      volume: Math.round(sessions.reduce((n, s) => n + (s.volume ?? 0), 0)),
      minutes: sessions.reduce(
        (n, s) => n + Math.max(1, Math.round((new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()) / 60000)),
        0,
      ),
      sets: sessions.reduce((n, s) => n + s.exercises.reduce((m, e) => m + e.sets.filter((x) => x.done).length, 0), 0),
      prs: sessions.reduce((n, s) => n + (s.prs?.length ?? 0), 0),
      activeDays: rows.filter((d) => d.active).length,
      loggedDays: rows.filter((d) => d.count > 0).length,
      avgKcal: avg(days, 'kcal'),
      avgProtein: avg(days, 'protein'),
      proteinDays: rows.filter((d) => activity[d.day]?.p).length,
      waterDays: rows.filter((d) => activity[d.day]?.h).length,
      weightStart: before?.kg ?? null,
      weightEnd: last && before && last.day !== before.day ? last.kg : null,
      streak: stats.streak,
      prev: prevDays ? { workouts: prevSessions.length, avgKcal: avg(prevDays, 'kcal') } : null,
    };
  }, [days, prevDays, history, activity, weights, start, offset, stats.streak]);
}

