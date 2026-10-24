import { useCallback, useEffect, useState } from 'react';

import { uploadBase64 } from './media';
import { isSupabaseConfigured, supabase } from './supabase';
import type { Tier } from './tiers';

// Haftalık check-in: kilo, ölçüler (cm), en fazla 3 fotoğraf ve not. Haftada bir kayıt (pazartesi başlar).
export type Measure = 'waist' | 'chest' | 'hip' | 'arm' | 'thigh';

export type Checkin = {
  id: string;
  user_id: string;
  week_start: string;
  weight: number | null;
  photos: string[];
  note: string | null;
  coach_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles?: { username: string | null; tier: Tier; avatar_url?: string | null } | null;
} & Record<Measure, number | null>;

export const MEASURES: { key: Measure; label: string }[] = [
  { key: 'waist', label: 'Bel' },
  { key: 'chest', label: 'Göğüs' },
  { key: 'hip', label: 'Kalça' },
  { key: 'arm', label: 'Kol' },
  { key: 'thigh', label: 'Bacak' },
];

export const CHECKIN_SELECT = '*, profiles:profiles!checkins_user_id_fkey(*)';

// Uygulamadaki hafta başlangıcı (yerel saat, pazartesi) "2026-10-19" biçiminde.
export function thisWeekKey(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function weekTitle(weekStart: string) {
  const d = new Date(`${weekStart}T12:00:00`);
  return `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} haftası`;
}

// "72,5" ya da "72.5" -> 72.5; boş ya da geçersizse null.
export function parseNum(text: string): number | null {
  const n = Number(text.replace(',', '.').trim());
  return text.trim() && Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : null;
}

export function fmt(n: number | null | undefined) {
  return n == null ? '–' : n.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
}

export function serverError(message: string) {
  if (message.includes('checkins') && (message.includes('does not exist') || message.includes('schema cache'))) {
    return "Sunucu güncel değil: 0008 SQL dosyasını Supabase'de çalıştır.";
  }
  if (message.includes('row-level security')) return 'Check-in için Pro ve üstü üyelik gerekiyor.';
  return message;
}

export function useMyCheckins(userId: string | undefined) {
  const [items, setItems] = useState<Checkin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) return setItems([]);
    const { data, error: err } = await supabase.from('checkins').select('*').eq('user_id', userId).order('week_start', { ascending: false }).limit(104);
    if (err) setError(serverError(err.message));
    setItems((data ?? []) as Checkin[]);
  }, [userId]);
  useEffect(() => {
    load();
  }, [load]);
  return { items, error, reload: load };
}

export async function uploadCheckinPhoto(userId: string, base64: string, mime: string | undefined) {
  const type = mime === 'image/png' || mime === 'image/webp' ? mime : 'image/jpeg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${type.split('/')[1].replace('jpeg', 'jpg')}`;
  return uploadBase64('checkins', path, base64, type);
}

export async function removeCheckinPhotos(paths: string[]) {
  if (paths.length) await supabase.storage.from('checkins').remove(paths);
}
