import { useEffect, useState } from 'react';

import { onCatalogChange, setCatalog, visibleExercises, type Equipment, type Exercise, type Muscle, type Pattern } from './exercises';
import { readItem, writeItem } from './store';
import { isSupabaseConfigured, supabase } from './supabase';

// Koçun hareket kütüphanesi değişiklikleri (0011). Telefonda saklanır, açılışta sunucudan tazelenir.
type Row = {
  id: string;
  name: string;
  tr_name: string | null;
  primary_muscles: Muscle[];
  secondary_muscles: Muscle[];
  equipment: Equipment;
  pattern: Pattern;
  steps: string[];
  tip: string | null;
  free: boolean;
};
type Cached = { custom: Exercise[]; hidden: string[] };

const KEY = 'device:exercise-catalog';
let loading: Promise<void> | null = null;

function toExercise(r: Row): Exercise {
  return {
    id: r.id,
    trName: r.name,
    name: r.tr_name || r.name,
    primary: r.primary_muscles,
    secondary: r.secondary_muscles ?? [],
    equipment: r.equipment,
    pattern: r.pattern,
    steps: r.steps ?? [],
    tip: r.tip ?? '',
    free: r.free,
  };
}

export function loadCatalog(force = false) {
  if (loading && !force) return loading;
  loading = (async () => {
    const cached = await readItem<Cached | null>(KEY, null);
    if (cached) setCatalog(cached);
    if (!isSupabaseConfigured) return;
    const [c, h] = await Promise.all([
      supabase.from('custom_exercises').select('*').order('created_at'),
      supabase.from('hidden_exercises').select('id'),
    ]);
    // Tablolar yoksa (0011 çalıştırılmadı) hazır liste olduğu gibi kalır.
    if (c.error || h.error) return;
    const next = { custom: (c.data as Row[]).map(toExercise), hidden: (h.data as { id: string }[]).map((x) => x.id) };
    writeItem(KEY, next, false);
    setCatalog(next);
  })();
  return loading;
}

// Listelerde gösterilecek hareketler; koç ekleyip kaldırınca yenilenir.
export function useExercises(includeHidden = false) {
  const [list, setList] = useState(() => visibleExercises(includeHidden));
  useEffect(() => {
    const sync = () => setList(visibleExercises(includeHidden));
    const off = onCatalogChange(sync);
    sync();
    loadCatalog();
    return off;
  }, [includeHidden]);
  return list;
}

function serverError(message: string) {
  return /custom_exercises|hidden_exercises|schema cache/.test(message) ? "Sunucu güncel değil: 0011 SQL dosyasını Supabase'de çalıştır." : message;
}

const slug = (s: string) =>
  s
    .toLocaleLowerCase('en-US')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

export type NewExercise = Omit<Exercise, 'id'>;

// Yeni hareket ekler; hata varsa mesajı, yoksa yeni hareketin kimliğini döner.
export async function addCustomExercise(e: NewExercise): Promise<{ id?: string; error?: string }> {
  const id = `c_${slug(e.trName) || 'hareket'}_${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.from('custom_exercises').insert({
    id,
    name: e.trName,
    tr_name: e.name !== e.trName ? e.name : null,
    primary_muscles: e.primary,
    secondary_muscles: e.secondary,
    equipment: e.equipment,
    pattern: e.pattern,
    steps: e.steps,
    tip: e.tip || null,
    free: Boolean(e.free),
  });
  if (error) return { error: serverError(error.message) };
  await loadCatalog(true);
  return { id };
}

// Koçun eklediği hareket silinir; uygulamayla gelen hareket listeden gizlenir.
export async function removeExercise(id: string, custom: boolean) {
  const { error } = custom
    ? await supabase.from('custom_exercises').delete().eq('id', id)
    : await supabase.from('hidden_exercises').insert({ id });
  if (error) return serverError(error.message);
  await loadCatalog(true);
  return null;
}

export async function restoreExercise(id: string) {
  const { error } = await supabase.from('hidden_exercises').delete().eq('id', id);
  if (error) return serverError(error.message);
  await loadCatalog(true);
  return null;
}
