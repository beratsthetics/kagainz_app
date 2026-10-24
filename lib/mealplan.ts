import { foodByKey, type Food } from './foods';
import type { MealSlot } from './daily';
import type { Macros } from './macros';
import { locale, tx } from './i18n';

// Hedef makrolara göre günlük menü üretir. Her öğün bir şablondan (protein + karbonhidrat + yağ
// kaynağı ve sabit sebze/meyve) oluşur; gramlar öğünün makro payını tutacak şekilde çözülür.

type Template = { protein: string; carb: string; fat: string; extras?: [string, number][] };

const TEMPLATES: Record<MealSlot, Template[]> = {
  breakfast: [
    { protein: 'egg', carb: 'oats', fat: 'walnut', extras: [['banana', 120]] },
    { protein: 'greek_yogurt', carb: 'oats', fat: 'peanut_butter', extras: [['cilek', 100]] },
    { protein: 'cottage', carb: 'wholewheat_bread', fat: 'walnut', extras: [['tomato', 120], ['cucumber', 100]] },
    { protein: 'egg', carb: 'wholewheat_bread', fat: 'avocado', extras: [['tomato', 120]] },
  ],
  lunch: [
    { protein: 'chicken_breast', carb: 'rice', fat: 'olive_oil', extras: [['coban_salata', 150]] },
    { protein: 'tuna', carb: 'bulgur', fat: 'olive_oil', extras: [['cucumber', 150]] },
    { protein: 'hindi_gogsu', carb: 'potato', fat: 'olive_oil', extras: [['brokoli', 150]] },
    { protein: 'chicken_breast', carb: 'pasta', fat: 'olive_oil', extras: [['ispanak', 100]] },
    { protein: 'lentil', carb: 'bulgur', fat: 'olive_oil', extras: [['yogurt', 150]] },
  ],
  dinner: [
    { protein: 'salmon', carb: 'tatli_patates', fat: 'olive_oil', extras: [['brokoli', 150]] },
    { protein: 'biftek', carb: 'bulgur', fat: 'olive_oil', extras: [['coban_salata', 150]] },
    { protein: 'chicken_breast', carb: 'kinoa', fat: 'avocado', extras: [['ispanak', 120]] },
    { protein: 'levrek', carb: 'potato', fat: 'olive_oil', extras: [['coban_salata', 150]] },
    { protein: 'karides', carb: 'rice', fat: 'olive_oil', extras: [['brokoli', 120]] },
  ],
  snack: [
    { protein: 'whey', carb: 'banana', fat: 'almond' },
    { protein: 'greek_yogurt', carb: 'apple', fat: 'walnut' },
    { protein: 'cottage', carb: 'apple', fat: 'almond' },
    { protein: 'cottage', carb: 'hurma', fat: 'findik' },
  ],
};

const SHARE: Record<MealSlot, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };
export const PLAN_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export type PlanItem = { key: string; name: string; grams: number; label: string };
export type PlanMeal = { slot: MealSlot; items: PlanItem[]; macros: Macros };
export type PlanDay = { meals: PlanMeal[]; totals: Macros };

const per = (f: Food) => ({ p: f.per100g.protein / 100, c: f.per100g.carb / 100, fat: f.per100g.fat / 100 });

function label(f: Food, grams: number) {
  if (f.unitGrams && f.unitName === 'adet' && f.unitGrams <= 130) {
    const n = Math.max(1, Math.round(grams / f.unitGrams));
    return tx('{0} adet {1}', [n, tx(f.name).toLocaleLowerCase(locale())]);
  }
  if (f.unitName === 'ölçek' && f.unitGrams) {
    return tx('{0} ölçek {1}', [Math.max(1, Math.round(grams / f.unitGrams)), tx(f.name).toLocaleLowerCase(locale())]);
  }
  return `${grams} g ${tx(f.name).toLocaleLowerCase(locale())}`;
}

function roundGrams(f: Food, g: number) {
  if (f.unitGrams && f.unitName === 'adet' && f.unitGrams <= 130) return Math.max(1, Math.round(g / f.unitGrams)) * f.unitGrams;
  if (f.unitName === 'ölçek' && f.unitGrams) return Math.max(1, Math.round(g / f.unitGrams)) * f.unitGrams;
  return Math.max(0, Math.round(g / 5) * 5);
}

export function macrosOf(items: { key: string; grams: number }[]): Macros {
  return items.reduce<Macros>(
    (a, i) => {
      const f = foodByKey(i.key);
      if (!f) return a;
      const k = i.grams / 100;
      return {
        kcal: Math.round(a.kcal + f.per100g.kcal * k),
        protein: Math.round((a.protein + f.per100g.protein * k) * 10) / 10,
        carb: Math.round((a.carb + f.per100g.carb * k) * 10) / 10,
        fat: Math.round((a.fat + f.per100g.fat * k) * 10) / 10,
      };
    },
    { kcal: 0, protein: 0, carb: 0, fat: 0 },
  );
}

function solveMeal(slot: MealSlot, t: Template, goals: Macros): PlanMeal {
  const A = foodByKey(t.protein)!;
  const B = foodByKey(t.carb)!;
  const C = foodByKey(t.fat)!;
  const extras = (t.extras ?? []).filter(([k]) => foodByKey(k));
  const extraM = macrosOf(extras.map(([key, grams]) => ({ key, grams })));
  const target = {
    p: Math.max(0, goals.protein * SHARE[slot] - extraM.protein),
    c: Math.max(0, goals.carb * SHARE[slot] - extraM.carb),
    f: Math.max(0, goals.fat * SHARE[slot] - extraM.fat),
  };
  const a = per(A);
  const b = per(B);
  const c = per(C);
  // Gauss-Seidel: her kaynak kendi makrosunu, diğerlerinin katkısı çıkarılarak tamamlar.
  let xa = target.p / Math.max(a.p, 0.01);
  let xb = target.c / Math.max(b.c, 0.01);
  let xc = target.f / Math.max(c.fat, 0.01);
  for (let i = 0; i < 6; i++) {
    xa = Math.max(0, (target.p - b.p * xb - c.p * xc) / Math.max(a.p, 0.01));
    xb = Math.max(0, (target.c - a.c * xa - c.c * xc) / Math.max(b.c, 0.01));
    xc = Math.max(0, (target.f - a.fat * xa - b.fat * xb) / Math.max(c.fat, 0.01));
  }
  const raw: [Food, number][] = [
    [A, roundGrams(A, xa)],
    [B, roundGrams(B, xb)],
    [C, roundGrams(C, xc)],
    ...extras.map(([k, g]) => [foodByKey(k)!, g] as [Food, number]),
  ];
  const items = raw.filter(([, g]) => g > 0).map(([f, g]) => ({ key: f.key, name: f.name, grams: g, label: label(f, g) }));
  return { slot, items, macros: macrosOf(items) };
}

// Basit, tekrarlanabilir rastgelelik: aynı tohum aynı menüyü verir.
function pick<T>(list: T[], seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return list[Math.floor((x - Math.floor(x)) * list.length)];
}

export function generateDay(goals: Macros, seed: number): PlanDay {
  const meals = PLAN_SLOTS.map((slot, i) => solveMeal(slot, pick(TEMPLATES[slot], seed * 7 + i * 13 + 1), goals));
  return { meals, totals: macrosOf(meals.flatMap((m) => m.items)) };
}

export function shoppingList(days: PlanDay[]) {
  const totals = new Map<string, number>();
  for (const d of days) for (const m of d.meals) for (const i of m.items) totals.set(i.key, (totals.get(i.key) ?? 0) + i.grams);
  return [...totals.entries()]
    .map(([key, grams]) => {
      const f = foodByKey(key)!;
      const amount =
        f.unitGrams && f.unitName === 'adet' && f.unitGrams <= 130
          ? tx('{0} adet', [Math.ceil(grams / f.unitGrams)])
          : grams >= 1000
            ? tx('{0} kg', [(Math.ceil(grams / 100) / 10).toLocaleString(locale())])
            : `${Math.ceil(grams / 10) * 10} g`;
      return { key, name: f.name, amount, grams };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}
