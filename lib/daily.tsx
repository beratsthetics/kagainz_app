import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';

import { useAuth } from './auth';

import { waterGoalGlasses, type BodyProfile } from './goals';
import type { Macros } from './macros';
import { dayKey, daysAgo, readItem, useStored } from './store';
import { isSupabaseConfigured, supabase } from './supabase';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type EntrySource = 'text' | 'search' | 'barcode' | 'photo' | 'plan' | 'favorite';

export type LogEntry = {
  id: string;
  text: string;
  macros: Macros;
  at: string;
  meal?: MealSlot;
  source?: EntrySource;
};

export type SavedMeal = { id: string; text: string; macros: Macros };
// Kaydedilen öğün: birkaç yiyecek tek isim altında, tek dokunuşla hepsi eklenir (ör. "Her sabahki kahvaltım").
export type MyMeal = { id: string; name: string; items: SavedMeal[] };

export const MEALS: Record<MealSlot, { label: string; icon: { ios: string; android: string; web: string } }> = {
  breakfast: { label: 'Kahvaltı', icon: { ios: 'sunrise.fill', android: 'wb_twilight', web: 'wb_twilight' } },
  lunch: { label: 'Öğle', icon: { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' } },
  dinner: { label: 'Akşam', icon: { ios: 'moon.stars.fill', android: 'bedtime', web: 'bedtime' } },
  snack: { label: 'Ara öğün', icon: { ios: 'takeoutbag.and.cup.and.straw.fill', android: 'cookie', web: 'cookie' } },
};
export const MEAL_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function mealForNow(date = new Date()): MealSlot {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 17 && h < 22) return 'dinner';
  return 'snack';
}

export type Goals = Macros;

// Kişisel hedef hesaplanana kadar kullanılan varsayılan.
export const DEFAULT_GOALS: Goals = { kcal: 2200, protein: 150, carb: 240, fat: 70 };

const ZERO: Macros = { kcal: 0, protein: 0, carb: 0, fat: 0 };
const r1 = (n: number) => Math.round(n * 10) / 10;

export function totalOf(entries: { macros: Macros }[]): Macros {
  return entries.reduce<Macros>(
    (a, e) => ({
      kcal: a.kcal + e.macros.kcal,
      protein: r1(a.protein + e.macros.protein),
      carb: r1(a.carb + e.macros.carb),
      fat: r1(a.fat + e.macros.fat),
    }),
    ZERO,
  );
}

type DailyState = {
  day: string;
  entries: LogEntry[];
  totals: Macros;
  goals: Goals;
  hasCustomGoals: boolean;
  // Koç makro hedefi atadıysa günlük hedef odur (0008, assigned_nutrition).
  coachGoals: CoachGoals | null;
  body: BodyProfile | null;
  setBody: (b: BodyProfile, goals: Goals) => void;
  add: (text: string, macros: Macros, opts?: { meal?: MealSlot; source?: EntrySource }) => void;
  remove: (id: string) => void;
  water: number;
  waterGoal: number;
  setWater: (glasses: number) => void;
  favorites: SavedMeal[];
  isFavorite: (text: string) => boolean;
  toggleFavorite: (text: string, macros: Macros) => void;
  recent: SavedMeal[];
  myMeals: MyMeal[];
  saveMeal: (name: string, items: SavedMeal[]) => void;
  removeMeal: (id: string) => void;
  addMeal: (m: MyMeal, slot: MealSlot) => void;
};

export type CoachGoals = Goals & { note: string | null };

const DailyContext = createContext<DailyState | null>(null);

export function DailyProvider({ children }: { children: ReactNode }) {
  const day = dayKey();
  const [entries, setEntries] = useStored<LogEntry[]>(`log:${day}`, []);
  const [water, setWaterState] = useStored<number>(`water:${day}`, 0);
  const [goals, setGoals] = useStored<Goals | null>('goals', null);
  const [body, setBodyState] = useStored<BodyProfile | null>('body', null);
  const [favorites, setFavorites] = useStored<SavedMeal[]>('favorites', []);
  const [recent, setRecent] = useStored<SavedMeal[]>('recent', []);
  const [myMeals, setMyMeals] = useStored<MyMeal[]>('my-meals', []);
  const [coachGoals, setCoachGoals] = useStored<CoachGoals | null>('nutrition:assigned', null);
  const { session } = useAuth();

  useEffect(() => {
    if (!session || !isSupabaseConfigured) return;
    supabase
      .from('assigned_nutrition')
      .select('kcal, protein, carbs, fat, note')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return;
        setCoachGoals(data ? { kcal: data.kcal, protein: data.protein, carb: data.carbs, fat: data.fat, note: data.note } : null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  const add = useCallback<DailyState['add']>(
    (text, macros, opts) => {
      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text,
        macros,
        at: new Date().toISOString(),
        meal: opts?.meal ?? mealForNow(),
        source: opts?.source ?? 'text',
      };
      setEntries((prev) => [...prev, entry]);
      // Son yenenler: aynı metin bir kez, en yenisi başta, en fazla 20.
      setRecent((prev) => [{ id: entry.id, text, macros }, ...prev.filter((r) => r.text !== text)].slice(0, 20));
    },
    [setEntries, setRecent],
  );

  const value = useMemo<DailyState>(
    () => ({
      day,
      entries,
      totals: totalOf(entries),
      goals: coachGoals ? { kcal: coachGoals.kcal, protein: coachGoals.protein, carb: coachGoals.carb, fat: coachGoals.fat } : (goals ?? DEFAULT_GOALS),
      hasCustomGoals: goals != null || coachGoals != null,
      coachGoals,
      body,
      setBody: (b, g) => {
        setBodyState(b);
        setGoals(g);
      },
      add,
      remove: (id) => setEntries((prev) => prev.filter((e) => e.id !== id)),
      water,
      waterGoal: waterGoalGlasses(body?.weightKg),
      setWater: (n) => setWaterState(Math.max(0, Math.min(30, n))),
      favorites,
      isFavorite: (text) => favorites.some((f) => f.text === text),
      toggleFavorite: (text, macros) =>
        setFavorites((prev) =>
          prev.some((f) => f.text === text)
            ? prev.filter((f) => f.text !== text)
            : [{ id: `${Date.now()}`, text, macros }, ...prev],
        ),
      recent,
      myMeals,
      saveMeal: (name, items) => setMyMeals((prev) => [{ id: `${Date.now()}`, name, items }, ...prev].slice(0, 30)),
      removeMeal: (id) => setMyMeals((prev) => prev.filter((m) => m.id !== id)),
      addMeal: (m, slot) => m.items.forEach((i) => add(i.text, i.macros, { meal: slot, source: 'favorite' })),
    }),
    [day, entries, goals, coachGoals, body, add, water, favorites, recent, myMeals, setBodyState, setGoals, setEntries, setWaterState, setFavorites, setMyMeals],
  );

  return <DailyContext.Provider value={value}>{children}</DailyContext.Provider>;
}

export function useDaily() {
  const ctx = useContext(DailyContext);
  if (!ctx) throw new Error('useDaily, DailyProvider içinde kullanılmalı');
  return ctx;
}

export type DaySummary = { day: string; date: Date; totals: Macros; water: number; count: number };

// Grafikler için son N günün özeti (bugün dahil, eskiden yeniye).
export async function loadHistory(days: number): Promise<DaySummary[]> {
  const out: DaySummary[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = daysAgo(i);
    const key = dayKey(date);
    const entries = await readItem<LogEntry[]>(`log:${key}`, []);
    const water = await readItem<number>(`water:${key}`, 0);
    out.push({ day: key, date, totals: totalOf(entries), water, count: entries.length });
  }
  return out;
}
