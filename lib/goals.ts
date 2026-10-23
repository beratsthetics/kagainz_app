import type { Macros } from './macros';

export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
export type GoalType = 'cut' | 'maintain' | 'recomp' | 'bulk';

export type BodyProfile = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: GoalType;
};

export const ACTIVITY: Record<Activity, { label: string; hint: string; factor: number }> = {
  sedentary: { label: 'Hareketsiz', hint: 'Masa başı, spor yok', factor: 1.2 },
  light: { label: 'Az hareketli', hint: 'Haftada 1-2 antrenman', factor: 1.375 },
  moderate: { label: 'Orta', hint: 'Haftada 3-4 antrenman', factor: 1.55 },
  active: { label: 'Aktif', hint: 'Haftada 5-6 antrenman', factor: 1.725 },
  athlete: { label: 'Çok aktif', hint: 'Günde 2 antrenman / ağır iş', factor: 1.9 },
};

export const GOALS: Record<GoalType, { label: string; hint: string; kcalDelta: number; proteinPerKg: number }> = {
  cut: { label: 'Yağ yak', hint: 'Haftada ~0,5 kg kayıp', kcalDelta: -0.2, proteinPerKg: 2.2 },
  maintain: { label: 'Koru', hint: 'Kilonu sabit tut', kcalDelta: 0, proteinPerKg: 1.8 },
  recomp: { label: 'Sıkılaş', hint: 'Yağ yak, kas koru', kcalDelta: -0.1, proteinPerKg: 2.2 },
  bulk: { label: 'Kas kazan', hint: 'Kontrollü fazla', kcalDelta: 0.1, proteinPerKg: 2 },
};

// Mifflin-St Jeor bazal metabolizma.
export function bmr({ sex, age, heightCm, weightKg }: BodyProfile) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
}

export function tdee(p: BodyProfile) {
  return bmr(p) * ACTIVITY[p.activity].factor;
}

// Hedef: kalori TDEE ± hedef farkı; protein kg başına; yağ kalorinin %25'i (en az 0,6 g/kg);
// kalan kalori karbonhidrat.
export function calculateGoals(p: BodyProfile): Macros {
  const kcal = Math.round((tdee(p) * (1 + GOALS[p.goal].kcalDelta)) / 10) * 10;
  const protein = Math.round(p.weightKg * GOALS[p.goal].proteinPerKg);
  const fat = Math.round(Math.max((kcal * 0.25) / 9, p.weightKg * 0.6));
  const carb = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carb };
}

// Günlük su hedefi: kg başına 35 ml, 250 ml'lik bardak sayısı olarak.
export function waterGoalGlasses(weightKg?: number) {
  if (!weightKg) return 10;
  return Math.max(6, Math.round((weightKg * 35) / 250));
}

export const GLASS_ML = 250;

export type WeightLog = { day: string; kg: number };
