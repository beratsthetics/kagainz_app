import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from './supabase';

// Özel (private) depolama kovaları: dosyalar sadece imzalı, süreli bağlantıyla görülür.
export type Bucket = 'chat' | 'form-checks';

export async function pickImage(camera: boolean) {
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, base64: true };
  if (camera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets[0]?.base64) return null;
  return res.assets[0];
}

export async function uploadBase64(bucket: Bucket, path: string, base64: string, contentType: string) {
  const { error } = await supabase.storage.from(bucket).upload(path, decode(base64), { contentType, upsert: false });
  if (error) throw error;
  return path;
}

// Video gibi büyük dosyalar base64'e çevrilmeden, dosya yolundan yüklenir.
export async function uploadFile(bucket: Bucket, path: string, uri: string, contentType: string) {
  const blob = await (await fetch(uri)).arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

const cache = new Map<string, { url: string; expires: number }>();

export async function signedUrl(bucket: Bucket, path: string) {
  const key = `${bucket}/${path}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data) return null;
  cache.set(key, { url: data.signedUrl, expires: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
}

export function useSignedUrl(bucket: Bucket, path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(() => (path ? (cache.get(`${bucket}/${path}`)?.url ?? null) : null));
  useEffect(() => {
    if (!path || !isSupabaseConfigured) return;
    let alive = true;
    signedUrl(bucket, path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [bucket, path]);
  return url;
}
