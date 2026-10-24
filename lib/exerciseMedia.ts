import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';

import { BUILTIN_MEDIA } from './exerciseVideos';
import { signedUrl, uploadFile } from './media';
import { isSupabaseConfigured, supabase } from './supabase';

// Koçun hareketlere yüklediği animasyonlar (video ya da GIF). Üye hareketi açınca otomatik gösterilir.
export type ExerciseMedia = { exercise_id: string; path: string; kind: 'video' | 'image' };

let all: Map<string, ExerciseMedia> | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

async function loadAll(force = false) {
  if (!isSupabaseConfigured) return;
  if (loading && !force) return loading;
  loading = (async () => {
    const { data, error } = await supabase.from('exercise_media').select('exercise_id, path, kind');
    if (error) return;
    all = new Map((data as ExerciseMedia[]).map((m) => [m.exercise_id, m]));
    listeners.forEach((l) => l());
  })();
  return loading;
}

// Hareketin animasyonu ve izlenebilir (imzalı) adresi. Adres sadece ücretli üyeye ve koça verilir;
// diğerlerinde url null döner ve ekran çizim animasyonunu gösterir.
export function useExerciseMedia(exerciseId: string | undefined, canView: boolean) {
  const [media, setMedia] = useState<ExerciseMedia | null>(() => (exerciseId && all?.get(exerciseId)) || null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!exerciseId) return;
    const sync = () => setMedia(all?.get(exerciseId) ?? null);
    listeners.add(sync);
    sync();
    loadAll();
    return () => {
      listeners.delete(sync);
    };
  }, [exerciseId]);

  useEffect(() => {
    setUrl(null);
    if (!media || !canView) return;
    let alive = true;
    signedUrl('exercise-media', media.path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [media, canView]);

  const reload = useCallback(() => loadAll(true), []);
  // Gösterilecek olan: koçun yüklediği, yoksa uygulamayla gelen video. Sadece ücretli üye ve koç görür.
  const builtin = exerciseId ? BUILTIN_MEDIA[exerciseId] : undefined;
  const view = media && url ? { source: url, kind: media.kind } : !media && builtin && canView ? builtin : null;
  // Bu hareketin bir videosu var mı (görme izni olmasa da).
  const hasVideo = Boolean(media || builtin);
  return { media, url, view, hasVideo, reload };
}

// Animasyonu olan hareketlerin kimlikleri (kütüphanede "Video" etiketi için).
export function useExerciseMediaIds() {
  const [ids, setIds] = useState<Set<string>>(() => new Set([...Object.keys(BUILTIN_MEDIA), ...(all?.keys() ?? [])]));
  useEffect(() => {
    const sync = () => setIds(new Set([...Object.keys(BUILTIN_MEDIA), ...(all?.keys() ?? [])]));
    listeners.add(sync);
    loadAll();
    return () => {
      listeners.delete(sync);
    };
  }, []);
  return ids;
}

export async function pickExerciseMedia() {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos', 'images'],
    quality: 1,
    videoMaxDuration: 60,
    // GIF'ler JPEG'e çevrilmeden, olduğu gibi gelsin.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
  });
  if (res.canceled || !res.assets[0]) return null;
  return res.assets[0];
}

const EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

// Koç: yeni animasyonu yükler, kaydı günceller ve eski dosyayı siler. Hata varsa mesajını döner.
export async function saveExerciseMedia(exerciseId: string, asset: ImagePicker.ImagePickerAsset, old?: ExerciseMedia | null) {
  const mime = asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
  const ext = EXT[mime];
  if (!ext) return 'Bu dosya türü desteklenmiyor. MP4, MOV, GIF, WEBP, PNG ya da JPG yükle.';
  if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) return 'Dosya en fazla 50 MB olabilir.';
  const path = `${exerciseId}/${Date.now()}.${ext}`;
  try {
    await uploadFile('exercise-media', path, asset.uri, mime);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return msg.includes('Bucket not found') ? "Sunucu güncel değil: 0007 SQL dosyasını Supabase'de çalıştır." : msg;
  }
  const kind = mime.startsWith('video/') ? 'video' : 'image';
  const { error } = await supabase
    .from('exercise_media')
    .upsert({ exercise_id: exerciseId, path, kind, updated_at: new Date().toISOString() }, { onConflict: 'exercise_id' });
  if (error) {
    await supabase.storage.from('exercise-media').remove([path]);
    return error.message;
  }
  if (old?.path) await supabase.storage.from('exercise-media').remove([old.path]);
  await loadAll(true);
  return null;
}

export async function deleteExerciseMedia(media: ExerciseMedia) {
  const { error } = await supabase.from('exercise_media').delete().eq('exercise_id', media.exercise_id);
  if (error) return error.message;
  await supabase.storage.from('exercise-media').remove([media.path]);
  await loadAll(true);
  return null;
}
