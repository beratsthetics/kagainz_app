import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from './supabase';

// Uygulamanın kalıcı verisi: önce telefonda (AsyncStorage) tutulur, böylece internetsiz de çalışır.
// Giriş yapılmışsa her değişiklik Supabase'deki user_data tablosuna da yazılır ve başka cihazda
// giriş yapınca oradan geri çekilir.

const PREFIX = 'kagainz:';
const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();
let userId: string | null = null;
const pending = new Map<string, ReturnType<typeof setTimeout>>();
// Hesap değişince silinen anahtarlar: ekrandaki eski değer üzerine yazılmasın diye başlangıç değerinden devam edilir.
const cleared = new Set<string>();

function emit(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

export async function readItem<T>(key: string, fallback: T): Promise<T> {
  if (cache.has(key)) return cache.get(key) as T;
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    const value = raw == null ? fallback : (JSON.parse(raw) as T);
    if (raw != null) cache.set(key, value);
    return value;
  } catch {
    return fallback;
  }
}

export function writeItem<T>(key: string, value: T, sync = true) {
  cache.set(key, value);
  cleared.delete(key);
  emit(key);
  AsyncStorage.setItem(PREFIX + key, JSON.stringify(value)).catch(() => {});
  if (sync) schedulePush(key, value);
}

function schedulePush(key: string, value: unknown) {
  if (!userId || !isSupabaseConfigured) return;
  const uid = userId;
  clearTimeout(pending.get(key));
  pending.set(
    key,
    setTimeout(() => {
      pending.delete(key);
      supabase
        .from('user_data')
        .upsert({ user_id: uid, key, value, updated_at: new Date().toISOString() })
        .then(() => {});
    }, 1200),
  );
}

// Girişte çağrılır: hesaptaki veriyi telefona indirir, telefonda olup hesapta olmayanı yükler.
export async function attachUser(id: string | null) {
  // Hesap kontrolü bitene kadar hiçbir şey sunucuya yazılmaz.
  userId = null;
  if (!id || !isSupabaseConfigured) return;
  const { data, error } = await supabase.from('user_data').select('key, value').eq('user_id', id);
  if (error) return;
  // Bu cihazda daha önce başka bir hesap açıldıysa onun verisi (günlük, rozetler...) bu hesaba geçmesin.
  const owner = await readItem<string | null>(OWNER, null);
  if (owner && owner !== id) await clearAccountData();
  writeItem(OWNER, id, false);
  userId = id;
  const remote = new Set<string>();
  for (const row of data ?? []) {
    remote.add(row.key);
    writeItem(row.key, row.value, false);
  }
  const keys = await AsyncStorage.getAllKeys();
  for (const full of keys) {
    const key = full.slice(PREFIX.length);
    if (!full.startsWith(PREFIX) || remote.has(key) || LOCAL_ONLY.some((p) => key.startsWith(p))) continue;
    const value = await readItem(key, null);
    if (value != null) schedulePush(key, value);
  }
}

// Cihaza özel ayarlar hesaba yazılmaz.
const LOCAL_ONLY = ['theme', 'device:'];
// Bu cihazdaki verinin hangi hesaba ait olduğu.
const OWNER = 'device:owner';

async function clearAccountData() {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX) && !LOCAL_ONLY.some((p) => k.startsWith(PREFIX + p)));
  pending.forEach((t) => clearTimeout(t));
  pending.clear();
  await AsyncStorage.multiRemove(keys);
  for (const full of keys) {
    const key = full.slice(PREFIX.length);
    cache.delete(key);
    cleared.add(key);
    emit(key);
  }
}

export function useStored<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(() => (cache.has(key) ? (cache.get(key) as T) : initial));
  const [loaded, setLoaded] = useState(cache.has(key));

  useEffect(() => {
    let alive = true;
    const reload = () => alive && setValue(cache.has(key) ? (cache.get(key) as T) : initial);
    readItem(key, initial).then((v) => {
      if (!alive) return;
      setValue(v);
      setLoaded(true);
    });
    const set = listeners.get(key) ?? new Set();
    set.add(reload);
    listeners.set(key, set);
    return () => {
      alive = false;
      set.delete(reload);
    };
    // initial sadece ilk değer; değişmesi yeniden yükleme gerektirmez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = (cache.has(key) ? cache.get(key) : cleared.has(key) ? initial : value) as T;
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      writeItem(key, resolved, !LOCAL_ONLY.some((p) => key.startsWith(p)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, value],
  );

  return [value, update, loaded];
}

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysAgo(n: number, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
}
