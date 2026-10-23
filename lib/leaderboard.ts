import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from './auth';
import { useProgress } from './progress';
import { dayKey, useStored } from './store';
import { isSupabaseConfigured, supabase } from './supabase';
import { type Tier } from './tiers';
import { weekStart } from './week';
import { useWorkouts } from './workouts';

export type Board = 'streak' | 'week' | 'challenge';
export type LeaderRow = { rank: number; user_id: string; username: string; avatar_url: string | null; tier: Tier; value: number; is_me: boolean };

// Sıralamada görünme tercihi (profil ayarlarından kapatılabilir).
export function useLeaderboardVisible() {
  return useStored<boolean>('leaderboard_visible', true);
}

// Seri ve bu haftaki antrenman sayısını sunucudaki leaderboard satırına yazar.
// Değerler değişmedikçe istek atılmaz.
export function useLeaderboardSync() {
  const { session, profile } = useAuth();
  const { stats } = useProgress();
  const { history } = useWorkouts();
  const [visible] = useLeaderboardVisible();
  const last = useRef<string | null>(null);
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId || !profile?.username || !isSupabaseConfigured) return;
    const start = weekStart(0);
    const weekWorkouts = Math.min(
      21,
      history.filter((s) => s.endedAt && new Date(s.startedAt).getTime() >= start.getTime()).length,
    );
    const row = { user_id: userId, streak: stats.streak, week_start: dayKey(start), week_workouts: weekWorkouts, visible };
    const sig = JSON.stringify({ ...row, day: dayKey() });
    if (sig === last.current) return;
    const t = setTimeout(() => {
      supabase
        .from('leaderboard')
        .upsert(row, { onConflict: 'user_id' })
        .then(({ error }) => {
          if (!error) last.current = sig;
        });
    }, 1500);
    return () => clearTimeout(t);
  }, [userId, profile?.username, stats.streak, history, visible]);
}

export function useLeaderboard(board: Board) {
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return setRows([]);
    setError(null);
    const { data, error: err } = await supabase.rpc('leaderboard_top', { board });
    if (err) {
      setRows([]);
      return setError(
        err.code === 'PGRST202' || err.message.includes('leaderboard')
          ? "Sunucu güncel değil: supabase/migrations klasöründeki son SQL dosyasını Supabase'de çalıştır."
          : err.message,
      );
    }
    setRows((data ?? []) as LeaderRow[]);
  }, [board]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  return { rows, error, reload: load };
}
