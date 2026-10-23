import { decode } from 'base64-arraybuffer';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from './supabase';

// Özel (private) depolama kovaları: dosyalar sadece imzalı, süreli bağlantıyla görülür.
export type Bucket = 'chat' | 'form-checks' | 'exercise-media';

export async function pickImage(camera: boolean, square = false) {
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: square ? 0.5 : 0.6, base64: true, ...(square && { allowsEditing: true, aspect: [1, 1] }) };
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
// Telefonda dosya expo-file-system ile okunur: React Native'in fetch(file://) yolu bazı cihazlarda
// boş veri döndürüp sunucuya 0 baytlık dosya yüklüyordu.
export async function uploadFile(bucket: Bucket, path: string, uri: string, contentType: string) {
  const data = Platform.OS === 'web' ? await (await fetch(uri)).arrayBuffer() : await new File(uri).arrayBuffer();
  if (!data.byteLength) throw new Error('Dosya okunamadı (0 bayt). Başka bir dosya dene.');
  const { error } = await supabase.storage.from(bucket).upload(path, data, { contentType, upsert: false });
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

// Profil fotoğrafları herkese açık kovada; imzasız, kalıcı adresle gösterilir.
export function avatarUrl(path: string | null | undefined) {
  if (!path || !isSupabaseConfigured) return null;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

// Yeni fotoğrafı yükler, profile yazar, eskisini siler. Hata varsa mesajını döner.
export async function uploadAvatar(userId: string, base64: string, mime: string | undefined, oldPath?: string | null) {
  const type = mime === 'image/png' || mime === 'image/webp' ? mime : 'image/jpeg';
  const path = `${userId}/${Date.now()}.${type.split('/')[1].replace('jpeg', 'jpg')}`;
  const up = await supabase.storage.from('avatars').upload(path, decode(base64), { contentType: type, upsert: false });
  if (up.error) return up.error.message.includes('Bucket not found') ? 'Sunucu güncel değil: 0005 SQL dosyasını Supabase\'de çalıştır.' : up.error.message;
  const { error } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', userId);
  if (error) {
    await supabase.storage.from('avatars').remove([path]);
    return error.message;
  }
  if (oldPath) await supabase.storage.from('avatars').remove([oldPath]);
  return null;
}

export async function removeAvatar(userId: string, oldPath: string | null | undefined) {
  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
  if (error) return error.message;
  if (oldPath) await supabase.storage.from('avatars').remove([oldPath]);
  return null;
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
