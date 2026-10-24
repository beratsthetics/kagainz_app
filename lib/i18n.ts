import { getLocales } from 'expo-localization';

import { EN } from './i18n-en';
import { useStored } from './store';

// Dil desteği. Türkçe metin anahtarın kendisidir: tx('Kaydet') İngilizcede EN['Kaydet'] döner,
// sözlükte yoksa Türkçe kalır. Değişkenli metinler {0}, {1} ile yazılır: tx('{0} gün', [5]).
// Ekrandaki düz metinler components/T.tsx'teki Text ile kendiliğinden çevrilir.
export type Lang = 'tr' | 'en';

export const LANGS: { value: Lang; label: string }[] = [
  { value: 'tr', label: 'Türkçe' },
  { value: 'en', label: 'English' },
];

export function deviceLang(): Lang {
  try {
    return getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en';
  } catch {
    return 'tr';
  }
}

let current: Lang = deviceLang();

// Seçilen dil sadece bu cihazda saklanır; seçilmediyse cihaz dili. Kök layout bunu okuyup
// applyLang ile uygular ve dil değişince ekranları yeniden kurar.
export function useLangPref() {
  return useStored<Lang>('device:lang', deviceLang());
}

export function applyLang(lang: Lang) {
  current = lang;
}

// Tarih ve sayı biçimi için.
export function locale() {
  return current === 'en' ? 'en-US' : 'tr-TR';
}

// Büyük/küçük harf farkıyla yazılmış anahtarlar için ("GÜN" -> "gün" -> "days" -> "DAYS").
let lowerIndex: Map<string, string> | null = null;
function byLower(text: string) {
  if (!lowerIndex) {
    lowerIndex = new Map();
    for (const [k, v] of Object.entries(EN)) lowerIndex.set(k.toLocaleLowerCase('tr-TR'), v);
  }
  return lowerIndex.get(text.toLocaleLowerCase('tr-TR'));
}

function fill(s: string, vars?: readonly unknown[]) {
  return vars ? s.replace(/\{(\d+)\}/g, (_, i) => String(vars[Number(i)] ?? '')) : s;
}

export function tx(text: string, vars?: readonly unknown[]): string {
  if (current === 'tr') return fill(text, vars);
  return fill(EN[text] ?? text, vars);
}

// Ekrana giden hazır bir metni çevirmeye çalışır: önce aynen, sonra büyük/küçük harf farkıyla,
// sonra içindeki sayıları {0}, {1} yaparak ("5 gün" -> "{0} gün"). Bulamazsa olduğu gibi döner.
export function translate(text: string): string {
  if (current === 'tr' || !text) return text;
  const trimmed = text.trim();
  if (!trimmed || !/\p{L}/u.test(trimmed)) return text;
  const pad = (s: string) => text.slice(0, text.indexOf(trimmed)) + s + text.slice(text.indexOf(trimmed) + trimmed.length);
  const exact = EN[trimmed];
  if (exact != null) return pad(exact);
  const lower = byLower(trimmed);
  if (lower != null) {
    const isUpper = trimmed === trimmed.toLocaleUpperCase('tr-TR');
    return pad(isUpper ? lower.toLocaleUpperCase('en-US') : lower);
  }
  const nums: string[] = [];
  const pattern = trimmed.replace(/\d+(?:[.,]\d+)*/g, (m) => `{${nums.push(m) - 1}}`);
  if (nums.length) {
    const p = EN[pattern] ?? byLower(pattern);
    if (p != null) {
      const out = fill(p, nums);
      return pad(trimmed === trimmed.toLocaleUpperCase('tr-TR') ? out.toLocaleUpperCase('en-US') : out);
    }
  }
  return text;
}
