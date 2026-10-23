import { FOODS, type Food } from './foods';

export type Macros = { kcal: number; protein: number; fat: number; carb: number };

export type MacroLine = {
  input: string;
  food: Food | null;
  grams: number;
  macros: Macros;
};

const lower = (s: string) => s.toLocaleLowerCase('tr-TR').trim();

const GRAM_UNITS = ['gram', 'gr', 'g', 'ml'];
const KG_UNITS = ['kg', 'kilo'];

// En uzun eşleşen takma ad kazanır ("yumurta akı" > "yumurta").
export function findFood(text: string): Food | null {
  const t = lower(text);
  let best: { food: Food; len: number } | null = null;
  for (const food of FOODS) {
    for (const alias of food.aliases) {
      if (t.includes(alias) && (!best || alias.length > best.len)) {
        best = { food, len: alias.length };
      }
    }
  }
  return best?.food ?? null;
}

function scale(food: Food, grams: number): Macros {
  const f = grams / 100;
  const p = food.per100g;
  return {
    kcal: Math.round(p.kcal * f),
    protein: round1(p.protein * f),
    fat: round1(p.fat * f),
    carb: round1(p.carb * f),
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const ZERO: Macros = { kcal: 0, protein: 0, fat: 0, carb: 0 };

// "150g tavuk göğsü", "2 yumurta", "1 dilim ekmek", "yarım muz"
export function parseLine(raw: string): MacroLine {
  const input = raw.trim();
  let text = lower(input).replace(',', '.');
  const food = findFood(text);
  if (!food) return { input, food: null, grams: 0, macros: ZERO };

  text = text.replace(/\byarım\b/, '0.5');
  const num = text.match(/(\d+(?:\.\d+)?)\s*([a-zçğıöşü]+(?:\s+kaşığı)?)?/);
  const qty = num ? parseFloat(num[1]) : 1;
  const unit = num?.[2] ?? '';

  let grams: number;
  if (GRAM_UNITS.includes(unit)) grams = qty;
  else if (KG_UNITS.includes(unit)) grams = qty * 1000;
  else if (food.unitGrams) grams = qty * food.unitGrams;
  else grams = num ? qty : 100;

  return { input, food, grams, macros: scale(food, grams) };
}

// Virgül, yeni satır, "ve" ve "+" ile ayrılmış öğün metnini satırlara böler.
export function parseMeal(text: string): MacroLine[] {
  return text
    .split(/\n|,(?!\d)|\+|\bve\b/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseLine);
}

export function sumMacros(lines: MacroLine[]): Macros {
  return lines.reduce(
    (acc, l) => ({
      kcal: acc.kcal + l.macros.kcal,
      protein: round1(acc.protein + l.macros.protein),
      fat: round1(acc.fat + l.macros.fat),
      carb: round1(acc.carb + l.macros.carb),
    }),
    ZERO,
  );
}
