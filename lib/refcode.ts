import { readItem, writeItem } from './store';
import { supabase } from './supabase';

// Influencer kodu (0014). Linkten ya da kayıt formundan gelen kod cihazda bekler, girişten sonra hesaba yazılır.
const KEY = 'device:ref';

// Uygulama telefonda kuruluyken kayıt ekranını kod dolu açar. Mağazaya çıkınca mağaza linkine çevrilecek.
export function refLink(code: string) {
  return `kagainz://auth?ref=${code}`;
}

// Türkçe harfleri sadeleştirip kod kuralına (a-z, 0-9, _) uydurur.
export function toCode(text: string) {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (c) => map[c])
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

export function rememberRef(code: string) {
  const clean = code.trim().replace(/^@/, '').toLowerCase();
  writeItem(KEY, clean || null, false);
}

export function pendingRef() {
  return readItem<string | null>(KEY, null);
}

export function forgetRef() {
  writeItem(KEY, null, false);
}

export type Redeemed = { kind: 'ref'; name: string; bonus_days: number } | { kind: 'user'; name: string };

// Influencer kodu ya da arkadaşın kullanıcı adı; sunucu hangisi olduğuna kendisi bakar.
export async function redeemCode(code: string): Promise<{ data?: Redeemed; error?: string }> {
  const { data, error } = await supabase.rpc('redeem_code', { code });
  if (error) return { error: /redeem_code|schema cache/.test(error.message) ? "Sunucu güncel değil: 0014 SQL dosyasını Supabase'de çalıştır." : error.message };
  return { data: data as Redeemed };
}
