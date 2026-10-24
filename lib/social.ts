import { useCallback, useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from './supabase';
import type { Tier } from './tiers';

// Takip, tebrik ve herkese açık profil. Sunucu tarafı: supabase/migrations/0008.
export type PublicProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
  tier: Tier;
  role: string | null;
  streak: number | null;
  week_workouts: number | null;
  followers: number;
  following: number;
  is_following: boolean;
  follows_me: boolean;
  kudos_today: boolean;
  xp?: number;
};

export type UserRow = { id: string; username: string; avatar_url: string | null; tier: Tier };

export const KUDOS = ['👏', '🔥', '💪'] as const;

export function socialError(message: string) {
  if (/public_profile|follows|kudos|schema cache|does not exist/i.test(message)) {
    return "Sunucu güncel değil: 0008 SQL dosyasını Supabase'de çalıştır.";
  }
  if (message.includes('duplicate key') && message.includes('kudos')) return 'Bugün bu kişiyi zaten tebrik ettin.';
  return message;
}

export function usePublicProfile(username: string | undefined) {
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!username || !isSupabaseConfigured) return setProfile(null);
    const { data, error: err } = await supabase.rpc('public_profile', { uname: username });
    if (err) setError(socialError(err.message));
    setProfile(((data ?? []) as PublicProfile[])[0] ?? null);
  }, [username]);
  useEffect(() => {
    load();
  }, [load]);
  return { profile, setProfile, error, reload: load };
}

export async function setFollowing(me: string, target: string, follow: boolean) {
  const { error } = follow
    ? await supabase.from('follows').insert({ follower_id: me, followee_id: target })
    : await supabase.from('follows').delete().eq('follower_id', me).eq('followee_id', target);
  return error && !error.message.includes('duplicate key') ? socialError(error.message) : null;
}

export async function sendKudos(me: string, target: string, emoji: (typeof KUDOS)[number]) {
  const { error } = await supabase.from('kudos').insert({ from_id: me, to_id: target, emoji });
  return error ? socialError(error.message) : null;
}

export async function searchUsers(term: string): Promise<UserRow[]> {
  const q = term.trim().replace(/^@/, '').toLowerCase();
  if (q.length < 2 || !/^[a-z0-9_.]+$/.test(q)) return [];
  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, tier')
    .ilike('username', `${q}%`)
    .order('username')
    .limit(20);
  return (data ?? []) as UserRow[];
}

// Takip ettiklerin (following) ya da seni takip edenler (followers).
export function useFollowList(userId: string | undefined, kind: 'following' | 'followers') {
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) return setRows([]);
    const mineCol = kind === 'following' ? 'follower_id' : 'followee_id';
    const fk = kind === 'following' ? 'follows_followee_id_fkey' : 'follows_follower_id_fkey';
    const { data, error: err } = await supabase
      .from('follows')
      .select(`created_at, user:profiles!${fk}(id, username, avatar_url, tier)`)
      .eq(mineCol, userId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (err) setError(socialError(err.message));
    setRows(((data ?? []) as unknown as { user: UserRow | null }[]).map((r) => r.user).filter((u): u is UserRow => Boolean(u?.username)));
  }, [userId, kind]);
  useEffect(() => {
    setRows(null);
    load();
  }, [load]);
  return { rows, error, reload: load };
}

// Takip ettiğin kişilerin kimlikleri (listelerde "Takiptesin" göstermek için).
export function useFollowingIds(userId: string | undefined) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) return;
    const { data } = await supabase.from('follows').select('followee_id').eq('follower_id', userId).limit(1000);
    setIds(new Set(((data ?? []) as { followee_id: string }[]).map((r) => r.followee_id)));
  }, [userId]);
  useEffect(() => {
    load();
  }, [load]);
  return { ids, setIds };
}
