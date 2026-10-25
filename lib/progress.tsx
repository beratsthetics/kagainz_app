import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';

import { useAuth } from './auth';
import { useCelebrate } from './celebrate';
import { useDaily } from './daily';
import { dayKey, daysAgo, useStored } from './store';
import { TIER_RANK, type Tier } from './tiers';
import { tx } from './i18n';

// Seri (streak), rozetler ve sayaçlar. Her gün için ne yapıldığı "activity" anahtarında tutulur:
// m: girilen öğün sayısı, w: antrenman sayısı, p: protein hedefi doldu, h: su hedefi doldu.
type DayActivity = { m?: number; w?: number; p?: boolean; h?: boolean };
type Counters = { prs: number; posts: number; formChecks: number; scans: number; photos: number; checkins?: number; kudos?: number };

export type Stats = {
  streak: number;
  bestStreak: number;
  meals: number;
  workouts: number;
  proteinDays: number;
  waterDays: number;
} & Counters;

export type Badge = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  tier: Tier;
  earned: (s: Stats, tier: Tier) => boolean;
};

export const BADGES: Badge[] = [
  { id: 'first_meal', title: 'İlk öğün', description: 'İlk öğününü kaydet', emoji: '🍽️', tier: 'free', earned: (s) => s.meals >= 1 },
  { id: 'first_workout', title: 'İlk antrenman', description: 'İlk antrenmanını bitir', emoji: '🏋️', tier: 'free', earned: (s) => s.workouts >= 1 },
  { id: 'streak_3', title: '3 gün seri', description: '3 gün üst üste kayıt', emoji: '🔥', tier: 'free', earned: (s) => s.bestStreak >= 3 },
  { id: 'streak_7', title: 'Bir hafta', description: '7 gün üst üste kayıt', emoji: '⚡', tier: 'free', earned: (s) => s.bestStreak >= 7 },
  { id: 'protein_day', title: 'Protein günü', description: 'Günlük protein hedefini doldur', emoji: '🥩', tier: 'free', earned: (s) => s.proteinDays >= 1 },
  { id: 'water_day', title: 'Susuz kalma', description: 'Günlük su hedefini doldur', emoji: '💧', tier: 'free', earned: (s) => s.waterDays >= 1 },
  { id: 'first_post', title: 'Sahnedesin', description: 'Toplulukta ilk paylaşımını yap', emoji: '📣', tier: 'free', earned: (s) => s.posts >= 1 },
  { id: 'first_scan', title: 'Barkodcu', description: 'İlk barkodunu okut', emoji: '📦', tier: 'free', earned: (s) => s.scans >= 1 },
  { id: 'first_kudos', title: 'Tebrikçi', description: 'Bir arkadaşını tebrik et', emoji: '👏', tier: 'free', earned: (s) => (s.kudos ?? 0) >= 1 },
  { id: 'pro_member', title: 'Pro', description: 'Pro üyesi ol', emoji: '⭐', tier: 'pro', earned: (_s, t) => TIER_RANK[t] >= TIER_RANK.pro },
  { id: 'streak_30', title: 'Bir ay', description: '30 gün üst üste kayıt', emoji: '🗓️', tier: 'pro', earned: (s) => s.bestStreak >= 30 },
  { id: 'meals_100', title: '100 öğün', description: '100 öğün kaydet', emoji: '💯', tier: 'pro', earned: (s) => s.meals >= 100 },
  { id: 'workouts_10', title: '10 antrenman', description: '10 antrenman bitir', emoji: '💪', tier: 'pro', earned: (s) => s.workouts >= 10 },
  { id: 'workouts_50', title: '50 antrenman', description: '50 antrenman bitir', emoji: '🦾', tier: 'pro', earned: (s) => s.workouts >= 50 },
  { id: 'first_pr', title: 'Rekor', description: 'İlk kişisel rekorunu kır', emoji: '🏆', tier: 'pro', earned: (s) => s.prs >= 1 },
  { id: 'prs_10', title: 'Rekor avcısı', description: '10 kişisel rekor', emoji: '🥇', tier: 'pro', earned: (s) => s.prs >= 10 },
  { id: 'protein_7', title: 'Protein haftası', description: '7 gün protein hedefi', emoji: '🍗', tier: 'pro', earned: (s) => s.proteinDays >= 7 },
  { id: 'first_checkin', title: 'İlk check-in', description: 'İlk haftalık check-in\'ini gönder', emoji: '📏', tier: 'pro', earned: (s) => (s.checkins ?? 0) >= 1 },
  { id: 'checkins_4', title: 'Bir ay takip', description: '4 haftalık check-in gönder', emoji: '📸', tier: 'pro', earned: (s) => (s.checkins ?? 0) >= 4 },
  { id: 'plus_member', title: 'Plus', description: 'Plus üyesi ol', emoji: '💎', tier: 'plus', earned: (_s, t) => TIER_RANK[t] >= TIER_RANK.plus },
  { id: 'first_form_check', title: 'Form kontrol', description: 'İlk form check fotoğraflarını gönder', emoji: '📸', tier: 'plus', earned: (s) => s.formChecks >= 1 },
  { id: 'photo_meal', title: 'Fotoğrafçı', description: 'Fotoğraftan makro hesapla', emoji: '📸', tier: 'plus', earned: (s) => s.photos >= 1 },
  { id: 'max_member', title: 'Max', description: 'Max üyesi ol', emoji: '👑', tier: 'max', earned: (_s, t) => t === 'max' },
  { id: 'iron_100', title: 'Demir irade', description: '100 antrenman bitir', emoji: '🛡️', tier: 'max', earned: (s) => s.workouts >= 100 },
  { id: 'streak_100', title: '100 gün', description: '100 gün üst üste kayıt', emoji: '🌋', tier: 'max', earned: (s) => s.bestStreak >= 100 },
];

type ProgressState = {
  stats: Stats;
  activity: Record<string, DayActivity>;
  unlocked: Record<string, string>;
  bump: (counter: keyof Counters, by?: number) => void;
  markWorkout: () => void;
};

const ProgressContext = createContext<ProgressState | null>(null);

function computeStreak(activity: Record<string, DayActivity>) {
  const active = (d: Date) => {
    const a = activity[dayKey(d)];
    return Boolean(a && ((a.m ?? 0) > 0 || (a.w ?? 0) > 0));
  };
  // Bugün henüz kayıt yoksa seri dünden sayılır, bozulmuş sayılmaz.
  const start = active(new Date()) ? 0 : 1;
  let streak = 0;
  while (active(daysAgo(start + streak))) streak++;

  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const key of Object.keys(activity).sort()) {
    const a = activity[key];
    if (!((a.m ?? 0) > 0 || (a.w ?? 0) > 0)) continue;
    const t = new Date(`${key}T12:00:00`).getTime();
    run = prev != null && Math.round((t - prev) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return { streak, best: Math.max(best, streak) };
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { tier } = useAuth();
  const { entries, totals, goals, water, waterGoal } = useDaily();
  const celebrate = useCelebrate();
  const [activity, setActivity, activityLoaded] = useStored<Record<string, DayActivity>>('activity', {});
  const [counters, setCounters] = useStored<Counters>('counters', {
    prs: 0,
    posts: 0,
    formChecks: 0,
    scans: 0,
    photos: 0,
  });
  const [unlocked, setUnlocked, unlockedLoaded] = useStored<Record<string, string>>('badges', {});
  const today = dayKey();
  const prevStreak = useRef<number | null>(null);

  const patchToday = useCallback(
    (patch: (a: DayActivity) => DayActivity) => setActivity((prev) => ({ ...prev, [today]: patch(prev[today] ?? {}) })),
    [setActivity, today],
  );

  // Öğün sayısı, protein ve su hedefi günlük kayıttan izlenir.
  useEffect(() => {
    if (!activityLoaded) return;
    const a = activity[today] ?? {};
    const proteinHit = goals.protein > 0 && totals.protein >= goals.protein;
    const waterHit = water >= waterGoal;
    if (a.m === entries.length && Boolean(a.p) === proteinHit && Boolean(a.h) === waterHit) return;
    if (proteinHit && !a.p) celebrate({ title: 'Protein hedefi tamam', subtitle: tx('{0} g protein', [goals.protein]), emoji: '🥩' });
    if (waterHit && !a.h) celebrate({ title: 'Su hedefi tamam', subtitle: tx('{0} bardak', [waterGoal]), emoji: '💧' });
    patchToday((d) => ({ ...d, m: entries.length, p: proteinHit, h: waterHit }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityLoaded, entries.length, totals.protein, goals.protein, water, waterGoal]);

  const stats = useMemo<Stats>(() => {
    const { streak, best } = computeStreak(activity);
    const days = Object.values(activity);
    return {
      streak,
      bestStreak: best,
      meals: days.reduce((n, d) => n + (d.m ?? 0), 0),
      workouts: days.reduce((n, d) => n + (d.w ?? 0), 0),
      proteinDays: days.filter((d) => d.p).length,
      waterDays: days.filter((d) => d.h).length,
      ...counters,
    };
  }, [activity, counters]);

  // Seri dönüm noktaları.
  useEffect(() => {
    if (!activityLoaded) return;
    if (prevStreak.current != null && stats.streak > prevStreak.current && STREAK_MILESTONES.includes(stats.streak)) {
      celebrate({ title: tx('{0} gün seri', [stats.streak]), subtitle: 'Böyle devam, zinciri kırma.', emoji: '🔥' });
    }
    prevStreak.current = stats.streak;
  }, [stats.streak, activityLoaded, celebrate]);

  // Yeni kazanılan rozetler.
  useEffect(() => {
    if (!activityLoaded || !unlockedLoaded) return;
    const fresh = BADGES.filter(
      (b) => !unlocked[b.id] && TIER_RANK[tier] >= TIER_RANK[b.tier] && b.earned(stats, tier),
    );
    if (!fresh.length) return;
    const now = new Date().toISOString();
    setUnlocked((prev) => ({ ...prev, ...Object.fromEntries(fresh.map((b) => [b.id, now])) }));
    fresh.forEach((b) => celebrate({ title: tx('Rozet: {0}', [b.title]), subtitle: b.description, emoji: b.emoji, badge: b }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, tier, activityLoaded, unlockedLoaded]);

  // Paket rozetleri sadece o paket (ya da üstü) sürerken görünür ve paylaşılır; kayıt silinmez, paket dönünce geri gelir.
  const owned = useMemo(
    () => Object.fromEntries(Object.entries(unlocked).filter(([id]) => BADGES.some((b) => b.id === id && TIER_RANK[tier] >= TIER_RANK[b.tier]))),
    [unlocked, tier],
  );

  const value = useMemo<ProgressState>(
    () => ({
      stats,
      activity,
      unlocked: owned,
      bump: (counter, by = 1) => setCounters((prev) => ({ ...prev, [counter]: (prev[counter] ?? 0) + by })),
      markWorkout: () => patchToday((d) => ({ ...d, w: (d.w ?? 0) + 1 })),
    }),
    [stats, activity, owned, setCounters, patchToday],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress, ProgressProvider içinde kullanılmalı');
  return ctx;
}
