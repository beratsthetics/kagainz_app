import { FOODS, type Food } from './foods';
import type { Macros } from './macros';

// Yiyecek arama: önce uygulamadaki Türkçe veritabanı, sonra Open Food Facts (ücretsiz, Türk
// marketlerindeki paketli ürünler dahil). Barkod da Open Food Facts'ten okunur.

export type FoodResult = {
  id: string;
  name: string;
  brand?: string;
  per100g: Macros;
  unitGrams?: number;
  unitName?: string;
  image?: string;
  source: 'local' | 'off';
};

const lower = (s: string) => s.toLocaleLowerCase('tr-TR').trim();
// "ı/i, ş/s" gibi farkları yok sayan sade arama anahtarı.
const plain = (s: string) =>
  lower(s)
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

function fromLocal(f: Food): FoodResult {
  return {
    id: `local:${f.key}`,
    name: f.name,
    per100g: f.per100g,
    unitGrams: f.unitGrams,
    unitName: f.unitName,
    source: 'local',
  };
}

export function searchLocal(query: string, limit = 12): FoodResult[] {
  const q = plain(query);
  if (!q) return [];
  return FOODS.map((f) => {
    const names = [f.name, ...f.aliases].map(plain);
    const score = names.reduce((best, n) => {
      if (n === q) return Math.max(best, 100);
      if (n.startsWith(q)) return Math.max(best, 80 - n.length / 10);
      if (n.includes(q)) return Math.max(best, 50 - n.length / 10);
      return best;
    }, 0);
    return { f, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => fromLocal(x.f));
}

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_tr?: string;
  brands?: string;
  serving_quantity?: number | string;
  image_front_small_url?: string;
  nutriments?: Record<string, number | string | undefined>;
};

const OFF = 'https://world.openfoodfacts.org';
const FIELDS = 'code,product_name,product_name_tr,brands,nutriments,serving_quantity,image_front_small_url';

const num = (v: number | string | undefined) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? NaN);
  return Number.isFinite(n) ? n : NaN;
};

function fromOff(p: OffProduct): FoodResult | null {
  const n = p.nutriments ?? {};
  let kcal = num(n['energy-kcal_100g']);
  if (!Number.isFinite(kcal)) kcal = num(n['energy_100g']) / 4.184;
  const protein = num(n['proteins_100g']);
  const carb = num(n['carbohydrates_100g']);
  const fat = num(n['fat_100g']);
  const name = (p.product_name_tr || p.product_name || '').trim();
  if (!name || ![kcal, protein, carb, fat].every(Number.isFinite)) return null;
  const serving = num(p.serving_quantity);
  return {
    id: `off:${p.code}`,
    name,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    per100g: {
      kcal: Math.round(kcal),
      protein: Math.round(protein * 10) / 10,
      carb: Math.round(carb * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    },
    unitGrams: Number.isFinite(serving) && serving > 0 ? serving : undefined,
    unitName: Number.isFinite(serving) && serving > 0 ? 'porsiyon' : undefined,
    image: p.image_front_small_url,
    source: 'off',
  };
}

export async function searchOnline(query: string, signal?: AbortSignal): Promise<FoodResult[]> {
  const url =
    `${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=24&sort_by=unique_scans_n&fields=${FIELDS}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Arama şu an yapılamıyor.');
  const json = (await res.json()) as { products?: OffProduct[] };
  return (json.products ?? []).map(fromOff).filter((x): x is FoodResult => x != null);
}

export async function lookupBarcode(code: string): Promise<FoodResult | null> {
  const res = await fetch(`${OFF}/api/v2/product/${encodeURIComponent(code)}?fields=${FIELDS}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Ürün bilgisi alınamadı.');
  const json = (await res.json()) as { status?: number; product?: OffProduct };
  if (!json.product || json.status === 0) return null;
  return fromOff({ ...json.product, code });
}

export function macrosFor(food: FoodResult, grams: number): Macros {
  const f = grams / 100;
  const r = (n: number) => Math.round(n * f * 10) / 10;
  return {
    kcal: Math.round(food.per100g.kcal * f),
    protein: r(food.per100g.protein),
    carb: r(food.per100g.carb),
    fat: r(food.per100g.fat),
  };
}
